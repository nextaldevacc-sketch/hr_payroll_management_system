import Decimal from 'decimal.js';
import prisma from '../lib/prisma.js';
import auditService from './auditService.js';
import { ApprovalService } from './approvalService.js';
import notificationService from './notificationService.js';
import scopeService from './scopeService.js';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export class SeparationService {
  constructor(client = prisma) {
    if (client && typeof client.$base !== 'function') {
      this.prisma = Object.create(client, {
        $base: { value: () => client, writable: true, configurable: true },
        $scoped: { value: () => client, writable: true, configurable: true },
      });
    } else {
      this.prisma = client;
    }
    this.approvalService = new ApprovalService(this.prisma);
  }

  /**
   * Submit a new separation request (Resignation or Termination)
   */
  async createSeparation(companyId, data, userId) {
    const {
      employee_id,
      type = 'Resignation',
      reason = '',
      notice_date,
      last_working_day,
      auto_approve = false,
    } = data;

    if (!employee_id || !notice_date || !last_working_day) {
      const err = new Error('employee_id, notice_date, and last_working_day are required');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    const employee = await this.prisma.$base().employees.findFirst({
      where: { id: employee_id, company_id: companyId },
      include: {
        contracts: {
          where: { status: { in: ['Approved', 'Active'] } },
          orderBy: { effective_date: 'desc' },
        },
      },
    });

    if (!employee) {
      const err = new Error('Employee not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const noticeDateObj = new Date(notice_date);
    const lastDayObj = new Date(last_working_day);

    if (isNaN(noticeDateObj.getTime()) || isNaN(lastDayObj.getTime())) {
      const err = new Error('Invalid notice_date or last_working_day');
      err.status = 400;
      err.code = 'INVALID_DATE';
      throw err;
    }

    if (lastDayObj < noticeDateObj) {
      const err = new Error('last_working_day cannot be earlier than notice_date');
      err.status = 400;
      err.code = 'INVALID_DATE_RANGE';
      throw err;
    }

    const primaryContract = employee.contracts[0];
    const requiredNoticeDays =
      type === 'Resignation'
        ? Number(primaryContract?.notice_days_employee || 30)
        : Number(primaryContract?.notice_days_employer || 30);

    const servedDays = Math.max(
      0,
      Math.round((lastDayObj.getTime() - noticeDateObj.getTime()) / (1000 * 60 * 60 * 24))
    );
    const noticeShortfallDays = Math.max(0, requiredNoticeDays - servedDays);

    const separation = await this.prisma.$base().separations.create({
      data: {
        company_id: companyId,
        employee_id,
        type,
        reason,
        notice_date: noticeDateObj,
        last_working_day: lastDayObj,
        notice_shortfall_days: noticeShortfallDays,
        status: auto_approve ? 'Approved' : 'Pending',
        created_by: userId,
      },
      include: {
        employee: true,
      },
    });

    await auditService.log({
      companyId,
      userId,
      action: 'CREATE_SEPARATION',
      tableName: 'separations',
      recordId: separation.id,
      newValues: {
        employee_id,
        type,
        notice_date: noticeDateObj.toISOString(),
        last_working_day: lastDayObj.toISOString(),
        notice_shortfall_days: noticeShortfallDays,
        status: separation.status,
      },
    });

    if (auto_approve) {
      await this._createDefaultClearanceItems(companyId, separation.id, userId);
    } else {
      // Trigger approval flow for Separation
      try {
        const req = await this.approvalService.createRequest({
          companyId,
          requestType: 'Separation',
          recordId: separation.id,
          requestedBy: userId,
          comment: `Separation request (${type}) for ${employee.name}`,
        });

        await this.prisma.$base().separations.update({
          where: { id: separation.id },
          data: { approval_request_id: req.id },
        });
      } catch (flowErr) {
        // If no explicit Separation flow is seeded, default to pending for direct HR action
      }
    }

    return this.getSeparationById(companyId, separation.id);
  }

  /**
   * Action on separation (Approve or Reject by HR Manager)
   */
  async actOnSeparation(companyId, separationId, { action, reason = null }, userId) {
    const separation = await this.prisma.$base().separations.findFirst({
      where: { id: separationId, company_id: companyId },
      include: { employee: true },
    });

    if (!separation) {
      const err = new Error('Separation not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (separation.status !== 'Pending') {
      const err = new Error(`Separation is already in ${separation.status} status`);
      err.status = 400;
      err.code = 'INVALID_STATUS';
      throw err;
    }

    const newStatus = action === 'Approve' ? 'Approved' : 'Rejected';

    const updated = await this.prisma.$base().separations.update({
      where: { id: separationId },
      data: {
        status: newStatus,
        updated_by: userId,
      },
    });

    await auditService.log({
      companyId,
      userId,
      action: action === 'Approve' ? 'APPROVE_SEPARATION' : 'REJECT_SEPARATION',
      tableName: 'separations',
      recordId: separationId,
      oldValues: { status: separation.status },
      newValues: { status: newStatus, reason },
    });

    if (action === 'Approve') {
      await this._createDefaultClearanceItems(companyId, separationId, userId);
      // Notify HR and Finance of exit approval
      try {
        const hrRole = await this.prisma.$base().roles.findUnique({ where: { code: 'HR_OFFICER' } });
        if (hrRole) {
          const hrUsers = await this.prisma.$base().user_roles.findMany({
            where: { company_id: companyId, role_id: hrRole.id },
            select: { user_id: true },
          });
          for (const u of hrUsers) {
            await notificationService.notifyApprovalWaiting(
              companyId,
              u.user_id,
              'Separation Clearance',
              separation.employee.name,
              `/offboarding?id=${separationId}&tab=clearance`
            ).catch(() => {});
          }
        }
      } catch (err) {
        console.warn('Failed to dispatch clearance notifications:', err.message);
      }
    }

    return this.getSeparationById(companyId, separationId);
  }

  /**
   * Creates default clearance checklist items on separation approval
   */
  async _createDefaultClearanceItems(companyId, separationId, userId) {
    const existing = await this.prisma.$base().clearance_items.findFirst({
      where: { separation_id: separationId },
    });
    if (existing) return;

    // Fetch company departments and key owners
    const depts = await this.prisma.$base().departments.findMany({
      where: { company_id: companyId },
      include: {
        manager: true,
      },
    });

    const itDept = depts.find((d) => d.name.toLowerCase().includes('it') || d.name.toLowerCase().includes('engineer')) || depts[0];
    const adminDept = depts.find((d) => d.name.toLowerCase().includes('admin')) || depts[0];
    const hrDept = depts.find((d) => d.name.toLowerCase().includes('hr')) || adminDept;
    const financeDept = depts.find((d) => d.name.toLowerCase().includes('finance')) || depts[0];
    const opsDept = depts.find((d) => d.name.toLowerCase().includes('ops') || d.name.toLowerCase().includes('operation')) || depts[0];

    // Find fallback owner user for departments
    const hrUser = await this.prisma.$base().users.findFirst({
      where: { company_id: companyId, email: { contains: 'hr' } },
    });
    const financeUser = await this.prisma.$base().users.findFirst({
      where: { company_id: companyId, email: { contains: 'finance' } },
    });
    const adminUser = await this.prisma.$base().users.findFirst({
      where: { company_id: companyId, email: { contains: 'admin' } },
    });
    const fallbackUserId = hrUser?.id || adminUser?.id || userId;

    const getDeptUserId = async (dept) => {
      if (dept?.manager_id) {
        const mgrUser = await this.prisma.$base().users.findFirst({
          where: { employee_id: dept.manager_id },
        });
        if (mgrUser) return mgrUser.id;
      }
      return null;
    };

    const opsUserId = (await getDeptUserId(opsDept)) || fallbackUserId;
    const financeUserId = financeUser?.id || (await getDeptUserId(financeDept)) || fallbackUserId;
    const itUserId = (await getDeptUserId(itDept)) || fallbackUserId;
    const adminUserId = (await getDeptUserId(adminDept)) || fallbackUserId;
    const hrUserId = hrUser?.id || (await getDeptUserId(hrDept)) || fallbackUserId;

    const defaultItems = [
      {
        department_id: opsDept?.id,
        owner_user_id: opsUserId,
        item: 'Department Operational Handover & Sign-off',
      },
      {
        department_id: financeDept?.id,
        owner_user_id: financeUserId,
        item: 'Finance Clearance: Loans, Advances & Credit Cards',
      },
      {
        department_id: itDept?.id,
        owner_user_id: itUserId,
        item: 'IT Equipment & Laptop Return',
      },
      {
        department_id: adminDept?.id,
        owner_user_id: adminUserId,
        item: 'Office Access Card, Keys & Physical Assets',
      },
      {
        department_id: hrDept?.id,
        owner_user_id: hrUserId,
        item: 'HR & Visa: Labour Card & Residency Visa Cancellation',
      },
    ];

    for (const item of defaultItems) {
      if (item.department_id) {
        await this.prisma.$base().clearance_items.create({
          data: {
            company_id: companyId,
            separation_id: separationId,
            department_id: item.department_id,
            owner_user_id: item.owner_user_id,
            item: item.item,
            status: 'Pending',
            amount_due: 0.0,
            created_by: userId,
          },
        });
      }
    }
  }

  /**
   * Get separation by ID with clearance items and settlement
   */
  async getSeparationById(companyId, separationId, user = null) {
    const separation = await this.prisma.$base().separations.findFirst({
      where: { id: separationId, company_id: companyId },
      include: {
        employee: {
          select: {
            id: true,
            employee_code: true,
            name: true,
            arabic_name: true,
            gender: true,
            nationality: true,
            residency_type: true,
            joining_date: true,
            status: true,
            company_visa: { select: { id: true, name: true } },
            contracts: {
              where: { status: { in: ['Approved', 'Active'] } },
              select: {
                department_id: true,
                department: { select: { id: true, name: true } },
                job: { select: { id: true, title: true } },
              },
              take: 1,
            },
          },
        },
        clearance_items: {
          include: {
            department: { select: { id: true, name: true } },
            owner_user: { select: { id: true, email: true, employee: { select: { name: true } } } },
            clearer: { select: { id: true, email: true, employee: { select: { name: true } } } },
          },
          orderBy: { created_at: 'asc' },
        },
        final_settlement: true,
        tasks: true,
      },
    });

    if (!separation) {
      const err = new Error('Separation not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (user) {
      const scope = scopeService.resolveDataScope(user);
      scopeService.assertEmployeeInScope(separation.employee, scope);

      const roles = user.roles || [];
      const isHrOrGm = roles.some((r) =>
        ['HR_MANAGER', 'HR_OFFICER', 'PAYROLL_OFFICER', 'GM'].includes(r)
      );

      if (!isHrOrGm) {
        if (roles.includes('DEPT_MANAGER')) {
          const empId = user.employeeId || user.employee_id || (await this.prisma.$base().users.findUnique({
            where: { id: user.userId || user.id },
            select: { employee_id: true },
          }))?.employee_id;

          const userDept = await this.prisma.$base().departments.findFirst({
            where: {
              company_id: companyId,
              OR: [
                ...(empId ? [{ manager_id: empId }] : []),
                { manager_id: user.userId || user.id },
              ],
            },
          });
          const empDeptId = separation.employee?.contracts?.[0]?.department_id;
          if (!userDept || empDeptId !== userDept.id) {
            const err = new Error('Access denied: Department managers can only view separations for their own team.');
            err.status = 403;
            err.code = 'FORBIDDEN_DEPARTMENT';
            throw err;
          }
        } else if (roles.includes('FINANCE')) {
          const hasFinanceItem = separation.clearance_items.some(
            (c) =>
              c.department?.name?.toLowerCase().includes('finance') ||
              c.item?.toLowerCase().includes('finance')
          );
          if (!hasFinanceItem) {
            const err = new Error('Access denied: Finance can only view separations with Finance clearance items.');
            err.status = 403;
            err.code = 'FORBIDDEN_FINANCE';
            throw err;
          }
        } else {
          const err = new Error('Access denied: You do not have permission to view this separation.');
          err.status = 403;
          err.code = 'FORBIDDEN';
          throw err;
        }
      }
    }

    const allClearanceCleared =
      separation.clearance_items.length > 0 &&
      separation.clearance_items.every((c) => c.status === 'Cleared');

    const totalClearanceDue = separation.clearance_items.reduce(
      (sum, item) => sum.plus(new Decimal(item.amount_due || 0)),
      new Decimal(0)
    );

    return {
      ...separation,
      all_clearance_cleared: allClearanceCleared,
      total_clearance_due: totalClearanceDue.toFixed(2),
    };
  }

  /**
   * List separations with filtering
   */
  async listSeparations(companyId, { status, type, employeeId, limit = 50, offset = 0 } = {}, user = null) {
    const where = { company_id: companyId };
    if (status) where.status = status;
    if (type) where.type = type;
    if (employeeId) where.employee_id = employeeId;

    if (user) {
      const scope = scopeService.resolveDataScope(user);
      const scopeWhere = scopeService.buildEmployeeWhere(scope);
      if (scopeWhere && Object.keys(scopeWhere).length > 0) {
        where.employee = {
          ...(where.employee || {}),
          ...scopeWhere,
        };
      }

      const roles = user.roles || [];
      const isHrOrGm = roles.some((r) =>
        ['HR_MANAGER', 'HR_OFFICER', 'PAYROLL_OFFICER', 'GM'].includes(r)
      );

      if (!isHrOrGm) {
        if (roles.includes('DEPT_MANAGER')) {
          const empId = user.employeeId || user.employee_id || (await this.prisma.$base().users.findUnique({
            where: { id: user.userId || user.id },
            select: { employee_id: true },
          }))?.employee_id;

          const userDept = await this.prisma.$base().departments.findFirst({
            where: {
              company_id: companyId,
              OR: [
                ...(empId ? [{ manager_id: empId }] : []),
                { manager_id: user.userId || user.id },
              ],
            },
          });
          if (userDept) {
            where.employee = {
              contracts: {
                some: {
                  department_id: userDept.id,
                  status: { in: ['Approved', 'Active'] },
                },
              },
            };
          } else {
            return { items: [], total: 0 };
          }
        } else if (roles.includes('FINANCE')) {
          where.clearance_items = {
            some: {
              OR: [
                { department: { name: { contains: 'Finance', mode: 'insensitive' } } },
                { item: { contains: 'Finance', mode: 'insensitive' } },
              ],
            },
          };
        } else {
          const err = new Error('Access denied: You do not have permission to list separations.');
          err.status = 403;
          err.code = 'FORBIDDEN';
          throw err;
        }
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.$base().separations.findMany({
        where,
        include: {
          employee: {
            select: {
              id: true,
              employee_code: true,
              name: true,
              arabic_name: true,
              status: true,
              contracts: {
                where: { status: { in: ['Approved', 'Active'] } },
                select: {
                  department: { select: { id: true, name: true } },
                },
                take: 1,
              },
            },
          },
          clearance_items: true,
          final_settlement: { select: { id: true, status: true, net_payable: true } },
        },
        orderBy: { created_at: 'desc' },
        take: Number(limit),
        skip: Number(offset),
      }),
      this.prisma.$base().separations.count({ where }),
    ]);

    const formatted = items.map((s) => ({
      ...s,
      all_clearance_cleared: s.clearance_items.length > 0 && s.clearance_items.every((c) => c.status === 'Cleared'),
      pending_clearance_count: s.clearance_items.filter((c) => c.status !== 'Cleared').length,
    }));

    return { items: formatted, total };
  }

  /**
   * Update clearance item status and amount due
   */
  async updateClearanceItem(companyId, itemId, data, user) {
    const { status, amount_due = 0, note = '' } = data;

    const item = await this.prisma.$base().clearance_items.findFirst({
      where: { id: itemId, company_id: companyId },
      include: { separation: true, department: true },
    });

    if (!item) {
      const err = new Error('Clearance item not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    // Role-based permission check:
    // Department managers can only clear their own department items or items assigned to them
    let userObj = user;
    if (typeof user === 'string') {
      userObj = await this.prisma.$base().users.findUnique({
        where: { id: user },
        include: { user_roles: { include: { role: true } } },
      });
    } else if (userObj && !userObj.roles && !userObj.user_roles && userObj.id) {
      userObj = await this.prisma.$base().users.findUnique({
        where: { id: userObj.id },
        include: { user_roles: { include: { role: true } } },
      });
    }
    const userId = userObj?.id || user;
    const userRoleNames = Array.isArray(userObj?.roles)
      ? userObj.roles
      : (userObj?.user_roles?.map((ur) => ur.role?.code) || []);

    const isHrManager = userRoleNames.includes('HR_MANAGER');
    const isHrOfficer = userRoleNames.includes('HR_OFFICER');
    const isFinance = userRoleNames.includes('FINANCE');
    const isDeptManager = userRoleNames.includes('DEPT_MANAGER');

    // Spec Part 2.2:
    // "clearance item clear: only the item's owner role (Dept Manager for department items, Finance for finance items, HR Officer/HR Manager for HR items) — HR Manager can approve the checklist."
    const deptName = (item.department?.name || '').toLowerCase();
    const itemName = (item.item || '').toLowerCase();

    // HR Manager can clear or approve any clearance item
    if (!isHrManager) {
      if (isFinance) {
        if (!deptName.includes('finance') && !itemName.includes('finance')) {
          const err = new Error('Finance users can only clear Finance department checklist items');
          err.status = 403;
          err.code = 'FORBIDDEN_DEPARTMENT';
          throw err;
        }
      } else if (isDeptManager) {
        const empId = userObj?.employee_id || userObj?.employeeId;
        const isManagerOfDept = item.department_id ? await this.prisma.$base().departments.findFirst({
          where: {
            id: item.department_id,
            company_id: companyId,
            OR: [
              ...(empId ? [{ manager_id: empId }] : []),
              { manager_id: userId },
            ],
          },
        }) : false;

        if (item.owner_user_id !== userId && !isManagerOfDept) {
          const err = new Error('Department managers can only clear their own assigned checklist items');
          err.status = 403;
          err.code = 'FORBIDDEN_DEPARTMENT';
          throw err;
        }
      } else if (isHrOfficer) {
        if (!deptName.includes('hr') && !deptName.includes('admin') && !itemName.includes('hr') && !itemName.includes('visa')) {
          const err = new Error('HR Officers can only clear HR and Visa checklist items');
          err.status = 403;
          err.code = 'FORBIDDEN_DEPARTMENT';
          throw err;
        }
      } else {
        const err = new Error('Access denied: You do not have permission to clear clearance items.');
        err.status = 403;
        err.code = 'FORBIDDEN';
        throw err;
      }
    }

    const updated = await this.prisma.$base().clearance_items.update({
      where: { id: itemId },
      data: {
        status: status || item.status,
        amount_due: new Decimal(amount_due || 0),
        note: note !== undefined ? note : item.note,
        cleared_by: status === 'Cleared' ? userId : null,
        cleared_at: status === 'Cleared' ? new Date() : null,
        updated_by: userId,
      },
    });

    await auditService.log({
      companyId,
      userId,
      action: 'UPDATE_CLEARANCE_ITEM',
      tableName: 'clearance_items',
      recordId: itemId,
      oldValues: { status: item.status, amount_due: item.amount_due },
      newValues: { status: updated.status, amount_due: updated.amount_due, note },
    });

    return updated;
  }

  /**
   * Get cancellation tasks for a separation (FR-OF7)
   */
  async getSeparationTasks(companyId, separationId) {
    return await this.prisma.$base().separation_tasks.findMany({
      where: { company_id: companyId, separation_id: separationId },
      include: {
        assignee: { select: { id: true, email: true } },
      },
      orderBy: { created_at: 'asc' },
    });
  }

  /**
   * List all cancellation tasks across company (FR-OF7)
   */
  async listSeparationTasks(companyId, { status, task_type, limit = 50, offset = 0 } = {}) {
    const where = { company_id: companyId };
    if (status) where.status = status;
    if (task_type) where.task_type = task_type;

    const [items, total] = await Promise.all([
      this.prisma.$base().separation_tasks.findMany({
        where,
        include: {
          assignee: { select: { id: true, email: true } },
          separation: {
            include: {
              employee: {
                select: { id: true, employee_code: true, name: true, arabic_name: true },
              },
            },
          },
        },
        orderBy: { due_date: 'asc' },
        take: Number(limit),
        skip: Number(offset),
      }),
      this.prisma.$base().separation_tasks.count({ where }),
    ]);

    return { items, total };
  }

  /**
   * Update a separation cancellation task (status Open -> In Progress -> Done, reference_number, note)
   */
  async updateSeparationTask(companyId, taskId, data, userId) {
    const task = await this.prisma.$base().separation_tasks.findFirst({
      where: { id: taskId, company_id: companyId },
    });

    if (!task) {
      const err = new Error('Separation task not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const { status, reference_number, completion_date, note } = data;
    const completedAt = status === 'Done'
      ? (completion_date ? new Date(completion_date) : new Date())
      : (status === 'Open' ? null : task.completed_at);

    const updated = await this.prisma.$base().separation_tasks.update({
      where: { id: taskId },
      data: {
        status: status || task.status,
        reference_number: reference_number !== undefined ? reference_number : task.reference_number,
        note: note !== undefined ? note : task.note,
        completed_at: completedAt,
        updated_by: userId,
      },
    });

    await auditService.log({
      companyId,
      userId,
      action: 'UPDATE_SEP_TASK',
      tableName: 'separation_tasks',
      recordId: taskId,
      oldValues: { status: task.status, reference_number: task.reference_number },
      newValues: { status: updated.status, reference_number: updated.reference_number, note: updated.note },
    });

    return updated;
  }
}

export default new SeparationService();

