import crypto from 'node:crypto';
import prisma, { companyStorage } from '../lib/prisma.js';
import { validateAndResolveVisa } from './visaValidator.js';
import { scopeService, resolveDataScope } from './scopeService.js';
import {
  validateUAEIban,
  maskIban,
  calculateDocumentStatus,
  getContractOn,
  checkActivationRequirements as checkActivationReqs,
  ALLOWED_STATUS_TRANSITIONS,
  calculateOpeningLeaveAllocation,
  DEFAULT_EMPLOYEE_CODE_PREFIX,
  toDubaiDateString,
} from '@nextal/shared';
import storageService from '../lib/storage.js';
import auditService from './auditService.js';
import approvalService from './approvalService.js';
import authService from './authService.js';
import {
  hasSalaryAccess,
  hasSensitiveIdAccess,
  serializeEmployee,
  serializeContract,
  serializeBankAccount,
  serializeDocument,
  deepSanitize,
} from '../serializers/index.js';

function getViewerUserId(viewer) {
  return viewer?.userId || viewer?.id || null;
}

export class EmployeeService {
  constructor(client = prisma) {
    this.prisma = client;
  }

  /**
   * List company employees with server-side filters, search, and pagination.
   * Scopes to department team for DEPT_MANAGER.
   * Strips salary columns for non-salary viewers.
   */
  async listEmployees({ companyId, query = {}, viewer }) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 25));
    const skip = (page - 1) * limit;

    const canSeeSalary = hasSalaryAccess(viewer);
    const where = { company_id: companyId };

    // 0. Role-based scoping (Spec 5.3 & A.3.8)
    const scope = resolveDataScope(viewer);
    const requestedVisaId = query.company_visa_id || query.companyVisaId;
    const scopeWhere = scopeService.buildEmployeeWhere(scope, requestedVisaId);
    where.AND = where.AND || [];
    where.AND.push(scopeWhere);

    // 1. Department Manager scoping (Spec 6: "Department Managers see only their own team")
    const isDeptManager = viewer.roles?.includes('DEPT_MANAGER') &&
      !viewer.roles?.includes('COMPANY_ADMIN') &&
      !viewer.roles?.includes('HR_MANAGER') &&
      !viewer.roles?.includes('GM');

    if (isDeptManager) {
      const scopedDeptIds = (viewer.scopes || [])
        .filter((s) => s.scope_type === 'Department' && s.scope_id)
        .map((s) => s.scope_id);

      let managedDeptIds = [...scopedDeptIds];
      if (viewer.employeeId) {
        const managedDepts = await this.prisma.departments.findMany({
          where: {
            company_id: companyId,
            manager_id: viewer.employeeId,
          },
          select: { id: true },
        });
        managedDeptIds.push(...managedDepts.map((d) => d.id));
      }

      managedDeptIds = [...new Set(managedDeptIds)];

      const conditions = [];
      if (viewer.employeeId) {
        conditions.push({ manager_id: viewer.employeeId });
        conditions.push({ id: viewer.employeeId });
      }
      if (managedDeptIds.length > 0) {
        conditions.push({
          contracts: {
            some: {
              department_id: { in: managedDeptIds },
            },
          },
        });
      }

      if (conditions.length > 0) {
        where.AND.push({ OR: conditions });
      } else {
        where.AND.push({ id: viewer.employeeId || '00000000-0000-0000-0000-000000000000' });
      }
    }

    // 2. Search filter (name, arabic_name, employee_code, work_email)
    if (query.search && query.search.trim()) {
      const term = query.search.trim();
      where.AND = where.AND || [];
      where.AND.push({
        OR: [
          { name: { contains: term, mode: 'insensitive' } },
          { arabic_name: { contains: term, mode: 'insensitive' } },
          { employee_code: { contains: term, mode: 'insensitive' } },
          { work_email: { contains: term, mode: 'insensitive' } },
        ],
      });
    }

    // 3. Exact filters
    if (query.status) {
      where.status = query.status;
    }
    if (query.branch_id) {
      where.branch_id = query.branch_id;
    }
    if (query.company_visa_id) {
      const validVisa = await validateAndResolveVisa({ companyId, companyVisaId: query.company_visa_id });
      if (validVisa) {
        where.company_visa_id = validVisa;
      }
    }
    if (query.nationality) {
      const natInput = query.nationality.trim().toUpperCase();
      const codeMap = {
        EMIRATI: 'ARE',
        UAE: 'ARE',
        'UNITED ARAB EMIRATES': 'ARE',
        ARE: 'ARE',
        BRITISH: 'GBR',
        UK: 'GBR',
        GBR: 'GBR',
        INDIAN: 'IND',
        INDIA: 'IND',
        IND: 'IND',
        PAKISTANI: 'PAK',
        PAKISTAN: 'PAK',
        PAK: 'PAK',
        EGYPTIAN: 'EGY',
        EGYPT: 'EGY',
        EGY: 'EGY',
        FILIPINO: 'PHL',
        PHILIPPINES: 'PHL',
        PHL: 'PHL',
        JORDANIAN: 'JOR',
        JORDAN: 'JOR',
        JOR: 'JOR',
      };
      const isoCode = codeMap[natInput] || query.nationality;
      where.nationality = { in: [query.nationality, isoCode], mode: 'insensitive' };
    }
    if (query.department_id) {
      where.contracts = {
        some: {
          department_id: query.department_id,
        },
      };
    }

    // 4. Document status filter (Valid, Expiring Soon, Expired, Missing Data)
    if (query.document_status) {
      const now = new Date();
      if (query.document_status === 'Expired') {
        where.documents = {
          some: {
            expiry_date: { lt: now },
          },
        };
      } else if (query.document_status === 'Expiring Soon') {
        const soonDate = new Date();
        soonDate.setDate(soonDate.getDate() + 90);
        where.documents = {
          some: {
            expiry_date: { gte: now, lte: soonDate },
          },
        };
      }
    }

    // Contracts projection based on salary permissions
    const contractsSelect = canSeeSalary
      ? {
          id: true,
          contract_type: true,
          version_no: true,
          effective_date: true,
          basic: true,
          housing: true,
          transport: true,
          other_allowances: true,
          gross: true,
          department_id: true,
          department: { select: { id: true, name: true, name_ar: true } },
          job_id: true,
          job: { select: { id: true, title: true, title_ar: true } },
          status: true,
        }
      : {
          id: true,
          contract_type: true,
          version_no: true,
          effective_date: true,
          department_id: true,
          department: { select: { id: true, name: true, name_ar: true } },
          job_id: true,
          job: { select: { id: true, title: true, title_ar: true } },
          status: true,
        };

    const [total, rawEmployees] = await Promise.all([
      this.prisma.employees.count({ where }),
      this.prisma.employees.findMany({
        where,
        include: {
          company_visa: { select: { id: true, name: true, emirate: true } },
          branch: { select: { id: true, name: true, name_ar: true, emirate: true } },
          manager: { select: { id: true, name: true, employee_code: true } },
          contracts: {
            orderBy: [{ effective_date: 'desc' }, { version_no: 'desc' }],
            take: 1,
            select: contractsSelect,
          },
          documents: {
            select: {
              id: true,
              doc_type: true,
              doc_number: true,
              expiry_date: true,
              status: true,
            },
          },
          ...(canSeeSalary
            ? {
                bank_accounts: {
                  where: { is_active: true },
                  take: 1,
                  select: {
                    id: true,
                    bank_name: true,
                    routing_code: true,
                    iban: true,
                    is_primary: true,
                  },
                },
              }
            : {}),
        },
        orderBy: { employee_code: 'asc' },
        skip,
        take: limit,
      }),
    ]);

    // Serialize each employee, masking IBAN in list for salary viewers
    const data = rawEmployees.map((emp) =>
      serializeEmployee(emp, viewer, { maskIbanInList: true })
    );

    // Calculate real status coverage and document alerts within scope
    const activeCount = await this.prisma.employees.count({
      where: {
        ...where,
        status: 'Active',
      },
    });
    const statusCoverage = total > 0 ? `${Math.round((activeCount / total) * 100)}%` : '100%';

    const ninetyDays = new Date();
    ninetyDays.setDate(ninetyDays.getDate() + 90);
    const documentAlerts = await this.prisma.employee_documents.count({
      where: {
        company_id: companyId,
        expiry_date: { lte: ninetyDays },
        employee: scopeWhere,
      },
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
        document_alerts: documentAlerts,
        docAlerts: documentAlerts,
        status_coverage: statusCoverage,
        statusCoverage,
      },
    };
  }

  /**
   * Get metadata options for filter dropdowns and onboarding wizards.
   */
  async getEmployeeMetaOptions({ companyId }) {
    const db = companyId && this.prisma.$scoped ? this.prisma.$scoped(companyId) : this.prisma;
    const [departments, branches, visas, jobs, shifts, policies] = await Promise.all([
      db.departments.findMany({
        where: { company_id: companyId },
        select: { id: true, name: true, name_ar: true, cost_centre: true },
        orderBy: { name: 'asc' },
      }),
      db.branches.findMany({
        where: { company_id: companyId },
        select: { id: true, name: true, name_ar: true, emirate: true, company_visa_id: true },
        orderBy: { name: 'asc' },
      }),
      db.company_visas.findMany({
        where: { company_id: companyId },
        select: { id: true, name: true, mol_establishment_id: true, emirate: true, bank_routing_code: true },
        orderBy: { name: 'asc' },
      }),
      db.jobs.findMany({
        where: { company_id: companyId },
        select: { id: true, title: true, title_ar: true, job_code: true },
        orderBy: { title: 'asc' },
      }),
      db.shifts.findMany({
        where: { company_id: companyId },
        select: { id: true, name: true, start_time: true, end_time: true },
        orderBy: { name: 'asc' },
      }),
      db.attendance_policies.findMany({
        where: { company_id: companyId },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    const nextCode = await this.getNextEmployeeCode({ companyId });

    return {
      departments,
      branches,
      visas,
      jobs,
      shifts,
      policies,
      next_employee_code: nextCode,
      statuses: ['Pre-Joined', 'New Joined', 'Active', 'Suspended', 'Transferred', 'Archived'],
      documentStatuses: ['Valid', 'Expiring Soon', 'Expired', 'Missing Data'],
    };
  }

  /**
   * Get next sequential employee code per company (e.g. EMP-DXB-045).
   * GAP 2: Uses atomic raw SQL MAX query without arbitrary caps (n < 8000).
   */
  async getNextEmployeeCode({ companyId, prefix = DEFAULT_EMPLOYEE_CODE_PREFIX, tx }) {
    const base = this.prisma.$base ? this.prisma.$base() : this.prisma;
    const client = tx || base;
    const pattern = `^${prefix}-[0-9]+$`;
    const result = await client.$queryRaw`
      SELECT COALESCE(MAX(SUBSTRING(employee_code FROM '([0-9]+)$')::integer), 0) AS max_code
      FROM employees
      WHERE company_id = ${companyId}::uuid
        AND employee_code ~ ${pattern}
    `;
    const max = Number(result[0]?.max_code || 0);
    const nextNum = max + 1;
    return `${prefix}-${String(nextNum).padStart(3, '0')}`;
  }

  /**
   * Get employee by ID with 7-tab profile payload and bento header metadata.
   */
  async getEmployeeById({ companyId, employeeId, viewer }) {
    const canSeeSalary = hasSalaryAccess(viewer);

    const contractsInclude = canSeeSalary
      ? {
          include: {
            department: true,
            job: true,
            shift: true,
            attendance_policy: true,
            salary_structure: true,
          },
          orderBy: [{ effective_date: 'desc' }, { version_no: 'desc' }],
        }
      : {
          select: {
            id: true,
            contract_type: true,
            version_no: true,
            effective_date: true,
            start_date: true,
            end_date: true,
            probation_end: true,
            notice_days_employee: true,
            notice_days_employer: true,
            status: true,
            department_id: true,
            department: { select: { id: true, name: true, name_ar: true } },
            job: { select: { id: true, title: true, title_ar: true } },
            shift: { select: { id: true, name: true } },
          },
          orderBy: [{ effective_date: 'desc' }, { version_no: 'desc' }],
        };

    const employee = await this.prisma.employees.findUnique({
      where: { id: employeeId },
      include: {
        company_visa: true,
        branch: true,
        manager: { select: { id: true, name: true, employee_code: true } },
        hr_manager: { select: { id: true, name: true, employee_code: true } },
        contracts: contractsInclude,
        ...(canSeeSalary ? { bank_accounts: true } : {}),
        documents: {
          include: {
            owner: { select: { id: true, email: true } },
          },
          orderBy: { expiry_date: 'asc' },
        },
      },
    });

    if (!employee || employee.company_id !== companyId) {
      const err = new Error('Employee not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    // Role-based scope guard (Spec 5.3 & A.3.8)
    const scope = resolveDataScope(viewer);
    scopeService.assertEmployeeInScope(employee, scope);

    // Verify Department Manager team access
    const isDeptManager = viewer.roles?.includes('DEPT_MANAGER') &&
      !viewer.roles?.includes('COMPANY_ADMIN') &&
      !viewer.roles?.includes('HR_MANAGER') &&
      !viewer.roles?.includes('GM');

    if (isDeptManager) {
      const scopedDeptIds = (viewer.scopes || [])
        .filter((s) => s.role === 'DEPT_MANAGER' && s.scope_type === 'Department' && s.scope_id)
        .map((s) => s.scope_id);

      const managedDepts = viewer.employeeId
        ? await this.prisma.departments.findMany({
            where: { company_id: companyId, manager_id: viewer.employeeId },
            select: { id: true },
          })
        : [];

      const allManagedDeptIds = [
        ...new Set([...scopedDeptIds, ...managedDepts.map((d) => d.id)]),
      ];

      const isDirectReport = viewer.employeeId && employee.manager_id === viewer.employeeId;
      const inManagedDept = employee.contracts?.some((c) =>
        allManagedDeptIds.includes(c.department_id || c.department?.id)
      );

      if (!isDirectReport && !inManagedDept) {
        const err = new Error('Employee not found');
        err.status = 404;
        err.code = 'NOT_FOUND';
        throw err;
      }
    }

    // Calculate document alert count (expired or <= 90 days)
    const alertCount = (employee.documents || []).filter((d) => {
      const status = calculateDocumentStatus(d);
      return status === 'Expired' || status === 'Expiring Soon';
    }).length;

    const pendingBranchChange = await this.prisma.$base().approval_requests.findFirst({
      where: {
        company_id: companyId,
        request_type: 'EMPLOYEE_BRANCH_CHANGE',
        record_id: employeeId,
        status: 'Pending',
      },
      select: {
        id: true,
        status: true,
        payload: true,
        requested_at: true,
        requester: { select: { id: true, email: true } },
      },
    });

    const serialized = serializeEmployee(employee, viewer, { maskIbanInList: false });

    return {
      ...serialized,
      pending_branch_change: pendingBranchChange || null,
      bento_header: {
        name: employee.name,
        arabic_name: employee.arabic_name,
        employee_code: employee.employee_code,
        status: employee.status,
        department: serialized.department?.name || '—',
        department_ar: serialized.department?.name_ar || serialized.department?.name || '—',
        visa: employee.company_visa?.name || '—',
        joining_date: employee.joining_date,
        document_alert_count: alertCount,
        has_salary_access: canSeeSalary,
      },
    };
  }

  /**
   * Create new employee in Pre-Joined state (Wizard Step 1).
   * Safe code generator with concurrency retry & dual-control approval inbox dispatch.
   */
  async createEmployee({ companyId, data, viewer }) {
    return companyStorage.run({ companyId }, async () => {
      const base = this.prisma.$base ? this.prisma.$base() : this.prisma;

      // Spec 4 & Section 2: Validate branch belongs to company visa upfront
      if (data.branch_id && data.company_visa_id) {
        const branch = await base.branches.findFirst({
          where: { id: data.branch_id, company_id: companyId },
        });
        if (!branch) {
          const err = new Error('Branch not found');
          err.status = 400;
          err.code = 'INVALID_BRANCH';
          err.field = 'branch_id';
          throw err;
        }
        if (branch.company_visa_id !== data.company_visa_id) {
          const err = new Error('Selected branch does not belong to the selected company visa');
          err.status = 400;
          err.code = 'BRANCH_VISA_MISMATCH';
          err.field = 'branch_id';
          err.issues = [{ field: 'branch_id', message: 'Selected branch does not belong to the selected company visa' }];
          throw err;
        }
      }

      let attempts = 0;
      const maxAttempts = 5;
      let createdRecord = null;

      while (attempts < maxAttempts) {
        attempts++;
        try {
          createdRecord = await base.$transaction(async (tx) => {
            let employeeCode = data.employee_code;
            if (!employeeCode || !employeeCode.trim()) {
              employeeCode = await this.getNextEmployeeCode({ companyId, tx });
            }

            const existing = await tx.employees.findFirst({
              where: { company_id: companyId, employee_code: employeeCode },
            });
            if (existing) {
              const err = new Error(`Employee code '${employeeCode}' already exists`);
              err.status = 400;
              err.code = 'DUPLICATE_CODE';
              throw err;
            }

            const created = await tx.employees.create({
              data: {
                company_id: companyId,
                employee_code: employeeCode,
                name: data.name,
                arabic_name: data.arabic_name || null,
                legal_name: data.legal_name || data.name,
                status: 'Pre-Joined',
                joining_date: new Date(data.joining_date || Date.now()),
                residency_type: data.residency_type || 'Expat',
                nationality: data.nationality || 'Other',
                gender: data.gender || 'Male',
                birth_date: data.birth_date ? new Date(data.birth_date) : null,
                mohre_person_id: data.mohre_person_id || null,
                company_visa_id: data.company_visa_id,
                branch_id: data.branch_id,
                manager_id: data.manager_id || null,
                hr_manager_id: data.hr_manager_id || null,
                work_email: data.work_email || null,
                mobile: data.mobile || null,
                emergency_contact_name: data.emergency_contact_name || null,
                emergency_contact_phone: data.emergency_contact_phone || null,
                created_by: getViewerUserId(viewer),
              },
            });

            // 1. Audit log
            await auditService.log({
              companyId,
              userId: getViewerUserId(viewer),
              action: 'Create',
              tableName: 'employees',
              recordId: created.id,
              newValues: { employee_code: created.employee_code, name: created.name, status: created.status },
              tx,
            });

            // 2. Create approval request for EMPLOYEE_VERIFICATION
            await approvalService.createRequest({
              companyId,
              requestType: 'EMPLOYEE_VERIFICATION',
              recordId: created.id,
              requestedBy: getViewerUserId(viewer),
              comment: 'Initial employee verification task',
              tx,
            });

            // 3. In-app notification to all active HR_MANAGER users
            const hrManagers = await tx.user_roles.findMany({
              where: {
                company_id: companyId,
                role: { code: 'HR_MANAGER' },
                user: {
                  status: 'Active',
                  deactivated_at: null,
                  OR: [
                    { locked_until: null },
                    { locked_until: { lte: new Date() } },
                  ],
                },
              },
              select: { user_id: true },
            });
            for (const hrm of hrManagers) {
              await tx.notifications.create({
                data: {
                  company_id: companyId,
                  user_id: hrm.user_id,
                  title: 'New Employee Pending Verification',
                  title_ar: 'موظف جديد بانتظار الاعتماد',
                  body: `New employee ${created.employee_code} ${created.name} awaits verification`,
                  body_ar: `تم تسجيل موظف جديد ${created.name} بانتظار اعتماد الموارد البشرية.`,
                  type: 'EMPLOYEE_VERIFICATION_PENDING',
                  link: `/approvals`,
                  is_read: false,
                },
              });
            }

            return created;
          });

          // Succeeded
          break;
        } catch (err) {
          if (
            (err.code === 'P2002' || err.code === 'DUPLICATE_CODE') &&
            (!data.employee_code || !data.employee_code.trim()) &&
            attempts < maxAttempts
          ) {
            // Retry on concurrent code clash
            continue;
          }
          throw err;
        }
      }

      if (!createdRecord) {
        const err = new Error('Failed to generate unique employee code after max retries');
        err.status = 500;
        err.code = 'CODE_GENERATION_FAILED';
        throw err;
      }

      return serializeEmployee(createdRecord, viewer);
    });
  }

  /**
   * Update employee profile
   */
  async updateEmployee({ companyId, employeeId, data, viewer }) {
    const existing = await this.prisma.employees.findUnique({
      where: { id: employeeId },
    });
    if (!existing || existing.company_id !== companyId) {
      const err = new Error('Employee not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const updateData = {};
    const allowedFields = [
      'name', 'arabic_name', 'legal_name', 'residency_type', 'nationality',
      'gender', 'birth_date', 'mohre_person_id', 'company_visa_id', 'branch_id',
      'manager_id', 'hr_manager_id', 'work_email', 'mobile',
      'emergency_contact_name', 'emergency_contact_phone', 'pension_scheme',
    ];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        if (field === 'birth_date') {
          updateData[field] = data[field] ? new Date(data[field]) : null;
        } else {
          updateData[field] = data[field];
        }
      }
    }

    // Section B.5: Visa transfer protection (Spec 5.3 & Workflow V9)
    if (updateData.company_visa_id && updateData.company_visa_id !== existing.company_visa_id) {
      const payslipCount = await this.prisma.payslips.count({
        where: { employee_id: employeeId },
      });
      if (payslipCount > 0) {
        const err = new Error(
          'Visa transfer is not supported for employees with payroll history. Open client decision.'
        );
        err.status = 400;
        err.code = 'VISA_TRANSFER_NOT_SUPPORTED';
        throw err;
      }
    }

    // Spec 4 & Section 2: Validate branch belongs to company visa
    const targetVisaId = updateData.company_visa_id || existing.company_visa_id;
    const targetBranchId = updateData.branch_id || existing.branch_id;
    if (targetVisaId && targetBranchId) {
      const branch = await this.prisma.branches.findFirst({
        where: { id: targetBranchId, company_id: companyId },
      });
      if (branch && branch.company_visa_id !== targetVisaId) {
        const err = new Error('Selected branch does not belong to the selected company visa');
        err.status = 400;
        err.code = 'BRANCH_VISA_MISMATCH';
        err.field = 'branch_id';
        err.issues = [{ field: 'branch_id', message: 'Selected branch does not belong to the selected company visa' }];
        throw err;
      }
    }

    const updated = await this.prisma.employees.update({
      where: { id: employeeId },
      data: {
        ...updateData,
        updated_by: getViewerUserId(viewer),
      },
    });

    await auditService.log({
      companyId,
      userId: getViewerUserId(viewer),
      action: 'Update',
      tableName: 'employees',
      recordId: employeeId,
      oldValues: existing,
      newValues: updated,
    });

    return serializeEmployee(updated, viewer);
  }

  /**
   * Transition employee status with explicit allowed transitions map (Rule A).
   */
  async updateEmployeeStatus({ companyId, employeeId, targetStatus, viewer }) {
    const employee = await this.prisma.employees.findUnique({
      where: { id: employeeId },
    });
    if (!employee || employee.company_id !== companyId) {
      const err = new Error('Employee not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const currentStatus = employee.status;
    const allowed = ALLOWED_STATUS_TRANSITIONS[currentStatus] || [];

    if (!allowed.includes(targetStatus)) {
      const err = new Error(
        `Invalid status transition from '${currentStatus}' to '${targetStatus}'. Allowed transitions: ${allowed.join(', ') || 'None'}`
      );
      err.status = 400;
      err.code = 'INVALID_STATUS_TRANSITION';
      throw err;
    }

    if (targetStatus === 'Active') {
      return this.activateEmployee({ companyId, employeeId, viewer });
    }

    const updated = await this.prisma.employees.update({
      where: { id: employeeId },
      data: {
        status: targetStatus,
        updated_by: getViewerUserId(viewer),
      },
    });

    await auditService.log({
      companyId,
      userId: getViewerUserId(viewer),
      action: 'StatusChange',
      tableName: 'employees',
      recordId: employeeId,
      oldValues: { status: currentStatus },
      newValues: { status: targetStatus },
    });

    return serializeEmployee(updated, viewer);
  }

  /**
   * Wizard Step 2: HR Manager verification.
   * Rule G: Creator cannot verify/approve an employee record they created.
   */
  async verifyEmployee({ companyId, employeeId, action, comment, viewer, tx = null }) {
    const client = tx || this.prisma;
    const employeeModel = client.employees || (client.$base ? client.$base().employees : this.prisma.employees);
    const employee = await employeeModel.findUnique({
      where: { id: employeeId },
    });
    if (!employee || employee.company_id !== companyId) {
      const err = new Error('Employee not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const viewerUserId = getViewerUserId(viewer);

    // Rule G: Check self-verification
    if (employee.created_by && viewerUserId && employee.created_by === viewerUserId) {
      const err = new Error('Self-verification is not permitted. A different manager must verify this employee record.');
      err.status = 403;
      err.code = 'SELF_VERIFICATION_BLOCKED';
      throw err;
    }

    if (action === 'APPROVE') {
      const updated = await employeeModel.update({
        where: { id: employeeId },
        data: {
          status: 'New Joined',
          verified_by: viewerUserId,
          verified_at: new Date(),
          updated_by: viewerUserId,
        },
      });

      await auditService.log({
        companyId,
        userId: viewerUserId,
        action: 'Verify',
        tableName: 'employees',
        recordId: employeeId,
        oldValues: { status: employee.status, verified_by: null },
        newValues: { status: 'New Joined', verified_by: viewerUserId, comment },
        tx,
      });

      // Complete pending approval request if present and not already in a parent approval tx
      if (!tx) {
        const reqModel = client.approval_requests || (client.$base ? client.$base().approval_requests : this.prisma.$base().approval_requests);
        await reqModel.updateMany({
          where: {
            company_id: companyId,
            record_id: employeeId,
            request_type: 'EMPLOYEE_VERIFICATION',
            status: 'Pending',
          },
          data: {
            status: 'Approved',
            completed_at: new Date(),
          },
        });
      }

      return serializeEmployee(updated, viewer);
    } else if (action === 'SEND_BACK') {
      const updated = await employeeModel.update({
        where: { id: employeeId },
        data: {
          status: 'Pre-Joined',
          updated_by: viewerUserId,
        },
      });

      await auditService.log({
        companyId,
        userId: viewerUserId,
        action: 'SendBack',
        tableName: 'employees',
        recordId: employeeId,
        oldValues: { status: employee.status },
        newValues: { status: 'Pre-Joined', comment },
        tx,
      });

      // Reject/Complete pending approval request if present and not already in a parent approval tx
      if (!tx) {
        const reqModel = client.approval_requests || (client.$base ? client.$base().approval_requests : this.prisma.$base().approval_requests);
        await reqModel.updateMany({
          where: {
            company_id: companyId,
            record_id: employeeId,
            request_type: 'EMPLOYEE_VERIFICATION',
            status: 'Pending',
          },
          data: {
            status: 'Rejected',
            completed_at: new Date(),
          },
        });
      }

      if (employee.created_by) {
        await this.prisma.$base().notifications.create({
          data: {
            company_id: companyId,
            user_id: employee.created_by,
            title: 'Employee Record Sent Back for Review',
            title_ar: 'تمت إعادة ملف الموظف للمراجعة',
            body: `Employee ${employee.employee_code} (${employee.name}) was sent back with comment: "${comment || 'Please review'}"`,
            body_ar: `تمت إعادة ملف الموظف ${employee.name} مع تعليق: "${comment || 'يرجى المراجعة'}"`,
            type: 'EMPLOYEE_VERIFICATION_SENT_BACK',
            link: `/employees/${employee.id}`,
            is_read: false,
          },
        });
      }

      return serializeEmployee(employee, viewer);
    } else {
      const err = new Error("Invalid action. Must be 'APPROVE' or 'SEND_BACK'");
      err.status = 400;
      err.code = 'INVALID_ACTION';
      throw err;
    }
  }

  /**
   * Checks the 4 activation requirements (Rule A & Spec 7.2).
   */
  async getActivationCheck({ companyId, employeeId }) {
    const employee = await this.prisma.employees.findUnique({
      where: { id: employeeId },
      include: {
        contracts: {
          where: { status: { in: ['Approved', 'Active', 'Draft'] } },
        },
        bank_accounts: {
          where: { is_active: true },
        },
        documents: true,
      },
    });

    if (!employee || employee.company_id !== companyId) {
      const err = new Error('Employee not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const check = checkActivationReqs(employee);

    return {
      employee_id: employeeId,
      status: employee.status,
      passes: check.passes,
      missing: check.missing,
      details: {
        has_contract: !check.missing.includes('contract'),
        has_shift: !check.missing.includes('shift'),
        has_bank_account: !check.missing.includes('bank_account'),
        has_labour_card_or_person_id: !check.missing.includes('labour_card_or_person_id'),
      },
    };
  }

  /**
   * Activates employee: enforces 4 requirements, transitions status to Active,
   * creates opening leave allocation, and sends self-service invite.
   */
  async activateEmployee({ companyId, employeeId, viewer }) {
    const employee = await this.prisma.employees.findUnique({
      where: { id: employeeId },
      include: {
        contracts: {
          where: { status: { in: ['Approved', 'Active', 'Draft'] } },
        },
        bank_accounts: {
          where: { is_active: true },
        },
        documents: true,
      },
    });

    if (!employee || employee.company_id !== companyId) {
      const err = new Error('Employee not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const check = checkActivationReqs(employee);
    if (!check.passes) {
      const err = new Error(
        `Activation check failed. Missing requirements: ${check.missing.join(', ')}`
      );
      err.status = 400;
      err.code = 'ACTIVATION_REQUIREMENTS_UNMET';
      err.missing = check.missing;
      throw err;
    }

    // Update status to Active
    const updated = await this.prisma.employees.update({
      where: { id: employeeId },
      data: {
        status: 'Active',
        activated_at: new Date(),
        updated_by: viewer.id,
      },
    });

    // Rule A: Create opening leave allocation from accrual plan
    try {
      const annualLeaveType = await this.prisma.leave_types.findFirst({
        where: { company_id: companyId, code: 'ANNUAL' },
      });

      if (annualLeaveType) {
        const accrualPlan = await this.prisma.accrual_plans.findFirst({
          where: { company_id: companyId, leave_type_id: annualLeaveType.id, is_active: true },
        });

        const validFrom = new Date(employee.joining_date);
        const validTo = new Date(validFrom);
        validTo.setFullYear(validTo.getFullYear() + 1);

        const existingAllocation = await this.prisma.leave_allocations.findFirst({
          where: {
            company_id: companyId,
            employee_id: employeeId,
            leave_type_id: annualLeaveType.id,
          },
        });

        if (!existingAllocation) {
          const allocation = calculateOpeningLeaveAllocation({
            joiningDate: employee.joining_date,
            asOfDate: new Date(),
            accrualPlan: accrualPlan || {},
          });

          await this.prisma.leave_allocations.create({
            data: {
              company_id: companyId,
              employee_id: employeeId,
              leave_type_id: annualLeaveType.id,
              allocation_type: 'Opening',
              accrual_plan_id: accrualPlan ? accrualPlan.id : null,
              days_allocated: allocation.total,
              days_taken: 0.00,
              valid_from: validFrom,
              valid_to: validTo,
              created_by: viewer.id,
            },
          });
        }
      }
    } catch (allocErr) {
      console.error('Failed to create opening leave allocation:', allocErr);
    }

    // Rule A: Send self-service invite (generate auth token if user exists, or prepare user)
    let inviteToken = null;
    try {
      if (employee.work_email) {
        let user = await this.prisma.users.findUnique({
          where: { email: employee.work_email },
        });

        if (!user) {
          user = await this.prisma.users.create({
            data: {
              company_id: companyId,
              employee_id: employeeId,
              email: employee.work_email,
              password_hash: 'UNINITIALIZED_INVITE',
              status: 'Active',
            },
          });
          // Assign EMPLOYEE role
          const empRole = await this.prisma.roles.findUnique({ where: { code: 'EMPLOYEE' } });
          if (empRole) {
            await this.prisma.user_roles.create({
              data: {
                company_id: companyId,
                user_id: user.id,
                role_id: empRole.id,
                scope_type: 'Self',
              },
            });
          }
        }

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        const randomHash = crypto.createHash('sha256').update(`${user.id}_${Date.now()}_invite_${Math.random()}`).digest('hex');

        await this.prisma.auth_tokens.create({
          data: {
            user_id: user.id,
            token_hash: randomHash,
            purpose: 'invite',
            expires_at: expiresAt,
          },
        });
        inviteToken = randomHash;
      }
    } catch (inviteErr) {
      console.error('Failed to issue self-service invite:', inviteErr);
    }

    await auditService.log({
      companyId,
      userId: viewer.id,
      action: 'Activate',
      tableName: 'employees',
      recordId: employeeId,
      oldValues: { status: employee.status },
      newValues: { status: 'Active', activated_at: updated.activated_at },
    });

    const result = serializeEmployee(updated, viewer);
    return {
      ...result,
      invite_token: inviteToken,
      message: 'Employee activated successfully',
    };
  }

  /**
   * Create or provision login credentials for an individual employee
   */
  async createEmployeeLogin(companyId, employeeId, viewer) {
    const employee = await this.prisma.employees.findFirst({
      where: { id: employeeId, company_id: companyId },
      include: {
        user: true,
      },
    });

    if (!employee) {
      const err = new Error('Employee not found');
      err.status = 404;
      throw err;
    }

    if (!employee.work_email || !employee.work_email.trim()) {
      const err = new Error('Employee has no work email address. Please update their profile first.');
      err.status = 400;
      throw err;
    }

    const email = employee.work_email.trim().toLowerCase();
    const employeeRole = await this.prisma.roles.findUnique({
      where: { code: 'EMPLOYEE' },
    });

    if (!employeeRole) {
      const err = new Error('Employee role definition not found');
      err.status = 500;
      throw err;
    }

    const viewerUserId = getViewerUserId(viewer);
    const tempPassword = 'Tmp!' + crypto.randomBytes(6).toString('hex') + 'A9';
    const passwordHash = await authService.hashPassword(tempPassword);

    let user = employee.user;
    if (user && user.password_hash !== 'UNINITIALIZED_INVITE') {
      const err = new Error('Employee already has an active login account.');
      err.status = 400;
      throw err;
    }

    if (user) {
      user = await this.prisma.users.update({
        where: { id: user.id },
        data: {
          email,
          password_hash: passwordHash,
          must_change_password: true,
          status: 'Active',
        },
      });
    } else {
      const existingUser = await this.prisma.users.findUnique({ where: { email } });
      if (existingUser) {
        if (existingUser.password_hash === 'UNINITIALIZED_INVITE') {
          user = await this.prisma.users.update({
            where: { id: existingUser.id },
            data: {
              employee_id: employee.id,
              password_hash: passwordHash,
              must_change_password: true,
              status: 'Active',
            },
          });
        } else {
          const err = new Error(`Email '${email}' is already associated with another user.`);
          err.status = 400;
          throw err;
        }
      } else {
        user = await this.prisma.users.create({
          data: {
            company_id: companyId,
            employee_id: employee.id,
            email,
            password_hash: passwordHash,
            status: 'Active',
            must_change_password: true,
            created_by: viewerUserId,
          },
        });
      }
    }

    const hasRole = await this.prisma.user_roles.findFirst({
      where: { user_id: user.id, role_id: employeeRole.id },
    });
    if (!hasRole) {
      await this.prisma.user_roles.create({
        data: {
          company_id: companyId,
          user_id: user.id,
          role_id: employeeRole.id,
          scope_type: 'Self',
          created_by: viewerUserId,
        },
      });
    }

    const token = await authService.generateInviteToken(user);

    await auditService.log({
      companyId,
      userId: viewerUserId,
      action: 'CREATE_EMPLOYEE_LOGIN',
      tableName: 'users',
      recordId: user.id,
      newValues: { employeeId: employee.id, email },
    });

    return {
      success: true,
      email,
      employeeCode: employee.employee_code,
      tempPassword,
      inviteUrl: `/login?tab=invite&token=${token}`,
    };
  }

  /**
   * Versioned Contract Creation (Rule B).
   * Raise or job change creates a NEW contract row with incremented version_no and effective_date.
   * Effective dates may NOT fall inside a locked pay period!
   */
  async createContractVersion({ companyId, employeeId, data, viewer }) {
    if (!hasSalaryAccess(viewer)) {
      const err = new Error('Access denied: You do not have permission to manage contracts or salary data');
      err.status = 403;
      err.code = 'FORBIDDEN_SALARY_ACCESS';
      throw err;
    }

    const employee = await this.prisma.employees.findUnique({
      where: { id: employeeId },
    });
    if (!employee || employee.company_id !== companyId) {
      const err = new Error('Employee not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const effectiveDate = new Date(data.effective_date);
    if (isNaN(effectiveDate.getTime())) {
      const err = new Error('Invalid effective_date');
      err.status = 400;
      err.code = 'INVALID_DATE';
      throw err;
    }

    // Rule B: Check if effective date falls inside a locked pay period
    const startOfMonth = new Date(effectiveDate.getFullYear(), effectiveDate.getMonth(), 1);
    const endOfMonth = new Date(effectiveDate.getFullYear(), effectiveDate.getMonth() + 1, 0, 23, 59, 59);
    const yearMonth = effectiveDate.toISOString().slice(0, 7); // e.g. "2026-09"

    const lockedPayRun = await this.prisma.pay_runs.findFirst({
      where: {
        company_id: companyId,
        period_month: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
        status: { in: ['Locked', 'Paid'] },
      },
    });

    if (lockedPayRun) {
      const err = new Error(
        `Cannot create contract with effective date ${data.effective_date} inside locked pay period ${yearMonth}`
      );
      err.status = 400;
      err.code = 'LOCKED_PERIOD_BLOCKED';
      throw err;
    }

    // Find highest version_no for this employee
    const latest = await this.prisma.contracts.findFirst({
      where: { company_id: companyId, employee_id: employeeId },
      orderBy: { version_no: 'desc' },
    });
    const nextVersion = (latest?.version_no || 0) + 1;

    // Check if a contract row already exists for this exact effective date
    const existingSameDate = await this.prisma.contracts.findFirst({
      where: {
        employee_id: employeeId,
        effective_date: effectiveDate,
      },
    });
    if (existingSameDate) {
      const err = new Error(`A contract version already exists for effective date ${data.effective_date}`);
      err.status = 400;
      err.code = 'DUPLICATE_CONTRACT_DATE';
      throw err;
    }

    const basic = parseFloat(data.basic) || 0;
    const housing = parseFloat(data.housing) || 0;
    const transport = parseFloat(data.transport) || 0;
    const otherAllowances = parseFloat(data.other_allowances) || 0;
    const gross = parseFloat(data.gross) || (basic + housing + transport + otherAllowances);

    // If shift or attendance policy or structure not provided, fallback to latest contract's values or company defaults
    const [empRecord, defaultShift, defaultPolicy, defaultStructure, defaultJob, defaultDept] = await Promise.all([
      this.prisma.employees.findUnique({ where: { id: employeeId } }),
      this.prisma.shifts.findFirst({ where: { company_id: companyId } }),
      this.prisma.attendance_policies.findFirst({ where: { company_id: companyId } }),
      this.prisma.salary_structures.findFirst({ where: { company_id: companyId } }),
      this.prisma.jobs.findFirst({ where: { company_id: companyId } }),
      this.prisma.departments.findFirst({ where: { company_id: companyId } }),
    ]);

    const shiftId = data.shift_id || latest?.shift_id || defaultShift?.id;
    const attendancePolicyId = data.attendance_policy_id || latest?.attendance_policy_id || defaultPolicy?.id;
    const structureId = data.structure_id || latest?.structure_id || defaultStructure?.id;
    const jobId = data.job_id || latest?.job_id || empRecord?.job_id || defaultJob?.id;
    const departmentId = data.department_id || latest?.department_id || empRecord?.department_id || defaultDept?.id;

    if (!shiftId || !attendancePolicyId || !structureId || !jobId || !departmentId) {
      const err = new Error('Missing required contract references: shift, policy, structure, job, or department');
      err.status = 400;
      err.code = 'MISSING_CONTRACT_REFS';
      throw err;
    }

    const newContract = await this.prisma.contracts.create({
      data: {
        company_id: companyId,
        employee_id: employeeId,
        version_no: nextVersion,
        effective_date: effectiveDate,
        contract_type: data.contract_type || 'Limited',
        start_date: data.start_date ? new Date(data.start_date) : effectiveDate,
        end_date: data.end_date ? new Date(data.end_date) : null,
        probation_end: data.probation_end ? new Date(data.probation_end) : null,
        job_id: jobId,
        department_id: departmentId,
        shift_id: shiftId,
        attendance_policy_id: attendancePolicyId,
        structure_id: structureId,
        basic,
        housing,
        transport,
        other_allowances: otherAllowances,
        gross,
        annual_leave_days: data.annual_leave_days || 30,
        gratuity_rule: data.gratuity_rule || 'UAE_LABOUR_LAW',
        notice_days_employee: data.notice_days_employee || 30,
        notice_days_employer: data.notice_days_employer || 30,
        status: data.status || 'Approved',
        created_by: getViewerUserId(viewer),
      },
      include: {
        department: true,
        job: true,
        shift: true,
        attendance_policy: true,
        salary_structure: true,
      },
    });

    await auditService.log({
      companyId,
      userId: getViewerUserId(viewer),
      action: 'CreateContract',
      tableName: 'contracts',
      recordId: newContract.id,
      oldValues: latest ? { version_no: latest.version_no, basic: latest.basic, gross: latest.gross } : null,
      newValues: { version_no: nextVersion, effective_date: data.effective_date, basic, gross },
    });

    return serializeContract(newContract, viewer);
  }

  /**
   * Approve a pending contract version (HR Manager only).
   */
  async approveContractVersion({ companyId, employeeId, contractId, viewer }) {
    const contract = await this.prisma.contracts.findFirst({
      where: { id: contractId, employee_id: employeeId, company_id: companyId },
      include: {
        department: true,
        job: true,
        shift: true,
        attendance_policy: true,
        salary_structure: true,
      },
    });

    if (!contract) {
      const err = new Error('Contract version not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const viewerId = getViewerUserId(viewer);
    if (contract.created_by && contract.created_by === viewerId) {
      const err = new Error('Segregation of duties violation: You cannot approve a contract version you created.');
      err.status = 403;
      err.code = 'SELF_APPROVAL_BLOCKED';
      throw err;
    }

    const approved = await this.prisma.contracts.update({
      where: { id: contractId },
      data: {
        status: 'Approved',
        updated_by: viewerId,
      },
      include: {
        department: true,
        job: true,
        shift: true,
        attendance_policy: true,
        salary_structure: true,
      },
    });

    await auditService.log({
      companyId,
      userId: viewerId,
      action: 'ApproveContract',
      tableName: 'contracts',
      recordId: contractId,
      oldValues: { status: contract.status },
      newValues: { status: 'Approved' },
    });

    return serializeContract(approved, viewer);
  }

  /**
   * Reject a pending contract version (HR Manager only).
   */
  async rejectContractVersion({ companyId, employeeId, contractId, viewer, reason }) {
    const contract = await this.prisma.contracts.findFirst({
      where: { id: contractId, employee_id: employeeId, company_id: companyId },
      include: {
        department: true,
        job: true,
        shift: true,
        attendance_policy: true,
        salary_structure: true,
      },
    });

    if (!contract) {
      const err = new Error('Contract version not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const viewerId = getViewerUserId(viewer);
    const rejected = await this.prisma.contracts.update({
      where: { id: contractId },
      data: {
        status: 'Rejected',
        updated_by: viewerId,
      },
      include: {
        department: true,
        job: true,
        shift: true,
        attendance_policy: true,
        salary_structure: true,
      },
    });

    await auditService.log({
      companyId,
      userId: viewerId,
      action: 'RejectContract',
      tableName: 'contracts',
      recordId: contractId,
      oldValues: { status: contract.status },
      newValues: { status: 'Rejected', reason },
    });

    return serializeContract(rejected, viewer);
  }

  /**
   * Get all contract versions for salary history tab.
   * 403 for non-salary roles.
   */
  async getContracts({ companyId, employeeId, viewer }) {
    if (!hasSalaryAccess(viewer)) {
      const err = new Error('Access denied: You do not have permission to view salary history');
      err.status = 403;
      err.code = 'FORBIDDEN_SALARY_ACCESS';
      throw err;
    }

    const contracts = await this.prisma.contracts.findMany({
      where: { company_id: companyId, employee_id: employeeId },
      include: {
        department: true,
        job: true,
        shift: true,
        attendance_policy: true,
        salary_structure: true,
      },
      orderBy: [{ effective_date: 'desc' }, { version_no: 'desc' }],
    });

    return contracts.map((c) => serializeContract(c, viewer));
  }

  /**
   * Helper getContractOn(employeeId, date) for payroll engine (Rule B)
   */
  async getContractOnDate({ companyId, employeeId, date }) {
    const contracts = await this.prisma.contracts.findMany({
      where: {
        company_id: companyId,
        employee_id: employeeId,
        status: { notIn: ['Pending', 'Rejected'] },
      },
      include: {
        department: true,
        job: true,
        shift: true,
        attendance_policy: true,
        salary_structure: true,
      },
      orderBy: [{ effective_date: 'desc' }, { version_no: 'desc' }],
    });

    return getContractOn(contracts, date);
  }

  /**
   * Get bank accounts for employee.
   * 403 for non-salary roles. Full IBAN returned here.
   */
  async getBankAccounts({ companyId, employeeId, viewer }) {
    if (!hasSalaryAccess(viewer)) {
      const err = new Error('Access denied: You do not have permission to view bank accounts');
      err.status = 403;
      err.code = 'FORBIDDEN_SALARY_ACCESS';
      throw err;
    }

    const accounts = await this.prisma.bank_accounts.findMany({
      where: { company_id: companyId, employee_id: employeeId },
      orderBy: { is_primary: 'desc' },
    });

    return accounts.map((b) => serializeBankAccount(b, viewer, { mask: false }));
  }

  /**
   * Add or update employee bank account with UAE IBAN validation (Rule D).
   */
  async saveBankAccount({ companyId, employeeId, data, viewer }) {
    if (!hasSalaryAccess(viewer)) {
      const err = new Error('Access denied: You do not have permission to manage bank accounts');
      err.status = 403;
      err.code = 'FORBIDDEN_SALARY_ACCESS';
      throw err;
    }

    const client = this.prisma.$base ? this.prisma.$base() : this.prisma;

    // IDOR protection: Verify employee belongs to company
    const employee = await client.employees.findUnique({
      where: { id: employeeId },
    });
    if (!employee || employee.company_id !== companyId) {
      const err = new Error('Employee not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    // IDOR protection: If updating existing account, scope update by { id, company_id, employee_id }
    let existingAccount = null;
    if (data.id) {
      existingAccount = await client.bank_accounts.findFirst({
        where: {
          id: data.id,
          company_id: companyId,
          employee_id: employeeId,
        },
      });
      if (!existingAccount) {
        const err = new Error('Bank account not found');
        err.status = 404;
        err.code = 'NOT_FOUND';
        throw err;
      }
    }

    const ibanCheck = validateUAEIban(data.iban);
    if (!ibanCheck.valid) {
      const err = new Error(ibanCheck.error || 'Invalid UAE IBAN');
      err.status = 400;
      err.code = 'INVALID_UAE_IBAN';
      throw err;
    }

    if (!data.routing_code || !data.routing_code.trim()) {
      const err = new Error('Bank routing code is required for WPS compliance');
      err.status = 400;
      err.code = 'MISSING_ROUTING_CODE';
      throw err;
    }

    const cleanIban = data.iban.replace(/[\s-]/g, '').toUpperCase();
    const existingIban = await client.bank_accounts.findFirst({
      where: {
        company_id: companyId,
        iban: cleanIban,
        ...(data.id ? { id: { not: data.id } } : {}),
      },
    });
    if (existingIban) {
      const err = new Error('This IBAN is already registered for another employee in this company');
      err.status = 400;
      err.code = 'DUPLICATE_IBAN';
      throw err;
    }

    // Check if an active, draft or pending pay run exists for the employee's visa/company
    const activePayRun = await client.pay_runs.findFirst({
      where: {
        company_id: companyId,
        company_visa_id: employee.company_visa_id,
        status: { in: ['Draft', 'Calculated', 'Validated', 'Pending', 'Open'] },
      },
    });

    if (activePayRun) {
      // RULE: creating or updating a bank account cannot take effect immediately mid-cycle.
      // Create or keep existing row with pending flag/is_active: false and submit approval request of type BANK_ACCOUNT_CHANGE
      let accountRecordId = data.id || null;
      let oldIban = existingAccount ? existingAccount.iban : null;

      if (!data.id) {
        const createdPending = await client.bank_accounts.create({
          data: {
            company_id: companyId,
            employee_id: employeeId,
            bank_name: data.bank_name || 'Bank',
            iban: cleanIban,
            routing_code: data.routing_code.trim(),
            salary_split_pct: data.salary_split_pct || 100.00,
            is_primary: data.is_primary !== undefined ? data.is_primary : true,
            is_active: false,
            created_by: getViewerUserId(viewer),
          },
        });
        accountRecordId = createdPending.id;
      }

      const payload = {
        employee_id: employeeId,
        bank_account_id: accountRecordId,
        target_iban: cleanIban,
        bank_name: data.bank_name || 'Bank',
        routing_code: data.routing_code.trim(),
        salary_split_pct: data.salary_split_pct || 100.00,
        is_primary: data.is_primary !== undefined ? data.is_primary : true,
        is_new_record: !data.id,
        old_iban: oldIban,
      };

      const approvalReq = await approvalService.createRequest({
        companyId,
        requestType: 'BANK_ACCOUNT_CHANGE',
        recordId: accountRecordId,
        requestedBy: getViewerUserId(viewer),
        comment: `Bank account change request during active pay run for employee ${employeeId}`,
        payload,
      });

      // Audit row MUST record masked old IBAN -> masked new IBAN (show last 4 digits only)
      await auditService.log({
        companyId,
        userId: getViewerUserId(viewer),
        action: 'REQUEST_BANK_CHANGE',
        tableName: 'bank_accounts',
        recordId: accountRecordId,
        oldValues: oldIban ? { iban: maskIban(oldIban) } : null,
        newValues: { iban: maskIban(cleanIban), status: 'PENDING_APPROVAL', approval_request_id: approvalReq.id },
      });

      return {
        status: 'PENDING_APPROVAL',
        message: 'Active pay run in progress. Bank account change submitted for HR Manager / Finance approval.',
        approval_request: approvalReq,
        data: {
          id: accountRecordId,
          iban: maskIban(cleanIban),
          is_active: false,
          pending_approval: true,
        },
      };
    }

    let saved;
    let oldIban = existingAccount ? existingAccount.iban : null;
    if (data.id) {
      saved = await client.bank_accounts.update({
        where: { id: data.id },
        data: {
          bank_name: data.bank_name || 'Bank',
          iban: cleanIban,
          routing_code: data.routing_code.trim(),
          salary_split_pct: data.salary_split_pct || 100.00,
          is_primary: data.is_primary !== undefined ? data.is_primary : true,
          updated_by: getViewerUserId(viewer),
        },
      });
    } else {
      saved = await client.bank_accounts.create({
        data: {
          company_id: companyId,
          employee_id: employeeId,
          bank_name: data.bank_name || 'Bank',
          iban: cleanIban,
          routing_code: data.routing_code.trim(),
          salary_split_pct: data.salary_split_pct || 100.00,
          is_primary: data.is_primary !== undefined ? data.is_primary : true,
          is_active: true,
          created_by: getViewerUserId(viewer),
        },
      });
    }

    // Audit row MUST record masked old IBAN -> masked new IBAN (show last 4 digits only)
    await auditService.log({
      companyId,
      userId: getViewerUserId(viewer),
      action: data.id ? 'UPDATE_BANK_ACCOUNT' : 'CREATE_BANK_ACCOUNT',
      tableName: 'bank_accounts',
      recordId: saved.id,
      oldValues: oldIban ? { iban: maskIban(oldIban) } : null,
      newValues: {
        bank_name: saved.bank_name,
        iban: maskIban(saved.iban),
        routing_code: saved.routing_code,
      },
    });

    return serializeBankAccount(saved, viewer, { mask: false });
  }

  /**
   * List employee documents.
   * Sensitive numbers masked for non-HR viewers.
   */
  async getDocuments({ companyId, employeeId, viewer }) {
    const docs = await this.prisma.employee_documents.findMany({
      where: { company_id: companyId, employee_id: employeeId },
      include: {
        owner: { select: { id: true, email: true } },
      },
      orderBy: { expiry_date: 'asc' },
    });

    await auditService.log({
      companyId,
      userId: getViewerUserId(viewer),
      action: 'DOCUMENT_VIEW',
      tableName: 'employee_documents',
      recordId: employeeId,
      newValues: { count: docs.length },
    });

    return docs.map((d) => serializeDocument(d, viewer, employeeId));
  }

  /**
   * Upload and attach an employee document (Rule C).
   * Validates magic bytes, max 10MB, stores outside web root.
   */
  async uploadDocument({ companyId, employeeId, file, meta, viewer }) {
    if (!file || !file.buffer) {
      const err = new Error('No file uploaded');
      err.status = 400;
      err.code = 'NO_FILE';
      throw err;
    }

    const saved = await storageService.saveFile({
      buffer: file.buffer,
      originalName: file.originalname || 'document.pdf',
      mimeType: file.mimetype,
    });

    const status = calculateDocumentStatus({
      doc_number: meta.doc_number,
      expiry_date: meta.expiry_date,
    });

    const doc = await this.prisma.employee_documents.create({
      data: {
        company_id: companyId,
        employee_id: employeeId,
        doc_type: meta.doc_type || 'GENERAL',
        doc_number: meta.doc_number || 'DOC-001',
        issue_date: meta.issue_date ? new Date(meta.issue_date) : null,
        expiry_date: new Date(meta.expiry_date),
        file_url: saved.storagePath,
        owner_id: meta.owner_id || getViewerUserId(viewer),
        status,
        verification_status: 'Verified',
        uploaded_by: getViewerUserId(viewer),
        created_by: getViewerUserId(viewer),
      },
      include: {
        owner: { select: { id: true, email: true } },
      },
    });

    await auditService.log({
      companyId,
      userId: getViewerUserId(viewer),
      action: 'UploadDocument',
      tableName: 'employee_documents',
      recordId: doc.id,
      newValues: { doc_type: doc.doc_type, expiry_date: meta.expiry_date, file_name: saved.fileName },
    });

    return serializeDocument(doc, viewer, employeeId);
  }

  /**
   * Download employee document through authenticated API route with permission check (Rule C).
   */
  async downloadDocument({ companyId, employeeId, documentId, viewer }) {
    const doc = await this.prisma.employee_documents.findUnique({
      where: { id: documentId },
    });

    if (!doc || doc.company_id !== companyId || doc.employee_id !== employeeId) {
      const err = new Error('Document not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (!doc.file_url) {
      const err = new Error('No physical file attached to this document');
      err.status = 404;
      err.code = 'FILE_NOT_FOUND';
      throw err;
    }

    // Rule E: Sensitive identity documents require sensitive ID access or self-ownership
    const docTypeStr = String(doc.doc_type || '').toUpperCase();
    const isSensitive = docTypeStr.includes('PASSPORT') ||
                        docTypeStr.includes('EMIRATES') ||
                        docTypeStr.includes('EID') ||
                        docTypeStr.includes('VISA');

    if (isSensitive && !hasSensitiveIdAccess(viewer, employeeId)) {
      const err = new Error('Access denied: You do not have permission to view or download sensitive identity documents');
      err.status = 403;
      err.code = 'FORBIDDEN_SENSITIVE_DOCUMENT';
      throw err;
    }

    const fileStream = await storageService.getFile(doc.file_url);

    await auditService.log({
      companyId,
      userId: getViewerUserId(viewer),
      action: 'DownloadDocument',
      tableName: 'employee_documents',
      recordId: documentId,
    });

    return {
      stream: fileStream.stream,
      mimeType: fileStream.mimeType,
      size: fileStream.size,
      fileName: `${doc.doc_type}_${doc.doc_number}`,
    };
  }

  /**
   * Get employee audit history (Rule F).
   * Reads from audit_logs and computes old -> new diffs.
   * Sanitizes salary fields for non-salary viewers.
   */
  async getEmployeeHistory({ companyId, employeeId, viewer }) {
    const canSeeSalary = hasSalaryAccess(viewer);
    const db = companyId && this.prisma.$scoped ? this.prisma.$scoped(companyId) : this.prisma;

    const contractIds = await this._getContractIds(employeeId, db);
    const bankAccountIds = await this._getBankAccountIds(employeeId, db);
    const documentIds = await this._getDocumentIds(employeeId, db);

    // Find audit logs directly on employee or related records
    const orClauses = [
      { table_name: 'employees', record_id: employeeId },
    ];
    if (contractIds.length > 0) {
      orClauses.push({ table_name: 'contracts', record_id: { in: contractIds } });
    }
    if (bankAccountIds.length > 0) {
      orClauses.push({ table_name: 'bank_accounts', record_id: { in: bankAccountIds } });
    }
    if (documentIds.length > 0) {
      orClauses.push({ table_name: 'employee_documents', record_id: { in: documentIds } });
    }

    const logs = await db.audit_logs.findMany({
      where: {
        OR: orClauses,
      },
      include: {
        user: { select: { id: true, email: true } },
      },
      orderBy: { created_at: 'desc' },
      take: 50,
    });

    const history = logs.map((log) => {
      let oldVals = log.old_values;
      let newVals = log.new_values;

      if (!canSeeSalary) {
        oldVals = deepSanitize(oldVals);
        newVals = deepSanitize(newVals);
      }

      return {
        id: log.id.toString(),
        action: log.action,
        table_name: log.table_name,
        actor: log.user ? log.user.email : 'System',
        user: log.user,
        created_at: log.created_at,
        old_values: oldVals,
        new_values: newVals,
      };
    });

    return history;
  }

  async _getContractIds(employeeId, db) {
    if (!employeeId) return [];
    try {
      const client = db || (this.prisma.$base ? this.prisma.$base() : this.prisma);
      const rows = await client.contracts.findMany({
        where: { employee_id: employeeId },
        select: { id: true },
      });
      return rows.map((r) => r.id);
    } catch {
      return [];
    }
  }

  async _getBankAccountIds(employeeId, db) {
    if (!employeeId) return [];
    try {
      const client = db || (this.prisma.$base ? this.prisma.$base() : this.prisma);
      const rows = await client.bank_accounts.findMany({
        where: { employee_id: employeeId },
        select: { id: true },
      });
      return rows.map((r) => r.id);
    } catch {
      return [];
    }
  }

  async _getDocumentIds(employeeId, db) {
    if (!employeeId) return [];
    try {
      const client = db || (this.prisma.$base ? this.prisma.$base() : this.prisma);
      const rows = await client.employee_documents.findMany({
        where: { employee_id: employeeId },
        select: { id: true },
      });
      return rows.map((r) => r.id);
    } catch {
      return [];
    }
  }

  /**
   * Request branch change within same visa (Workflow V8)
   * Requires effective date (>= today) + reason, submits for HR Manager approval
   */
  async requestBranchChange({ companyId, employeeId, targetBranchId, effectiveDate, reason, requestedBy }) {
    const employee = await this.prisma.employees.findUnique({
      where: { id: employeeId },
      include: { branch: true },
    });
    if (!employee || employee.company_id !== companyId) {
      const err = new Error('Employee not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (!targetBranchId || !reason || !effectiveDate) {
      const err = new Error('target_branch_id, effective_date, and reason are required');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    // Effective date >= today check
    const todayStr = toDubaiDateString(new Date());
    const effDateStr = String(effectiveDate).slice(0, 10);
    if (effDateStr < todayStr) {
      const err = new Error('Effective date cannot be in the past');
      err.status = 400;
      err.code = 'INVALID_EFFECTIVE_DATE';
      throw err;
    }

    // Only one pending branch change request per employee
    const existingPending = await this.prisma.approval_requests.findFirst({
      where: {
        company_id: companyId,
        request_type: 'EMPLOYEE_BRANCH_CHANGE',
        record_id: employeeId,
        status: 'Pending',
      },
    });
    if (existingPending) {
      const err = new Error('A branch change request is already pending for this employee');
      err.status = 409;
      err.code = 'BRANCH_CHANGE_PENDING';
      throw err;
    }

    const branch = await this.prisma.branches.findUnique({
      where: { id: targetBranchId },
    });
    if (!branch || branch.company_id !== companyId) {
      const err = new Error('Branch not found');
      err.status = 400;
      err.code = 'INVALID_BRANCH';
      throw err;
    }

    if (branch.company_visa_id !== employee.company_visa_id) {
      const err = new Error('Selected branch does not belong to the selected company visa');
      err.status = 400;
      err.code = 'BRANCH_VISA_MISMATCH';
      throw err;
    }

    // Store structured data in payload jsonb, comment stays human readable comment
    const payload = {
      from_branch_id: employee.branch_id,
      from_branch_name: employee.branch?.name,
      from_branch_name_ar: employee.branch?.name_ar,
      target_branch_id: targetBranchId,
      target_branch_name: branch.name,
      target_branch_name_ar: branch.name_ar,
      effective_date: effDateStr,
      reason: String(reason).trim(),
    };

    const approvalReq = await approvalService.createRequest({
      companyId,
      requestType: 'EMPLOYEE_BRANCH_CHANGE',
      recordId: employeeId,
      requestedBy,
      comment: String(reason).trim(),
      payload,
    });

    return approvalReq;
  }
}

export const employeeService = new EmployeeService();
export default employeeService;
