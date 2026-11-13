import Decimal from 'decimal.js';
import prisma from '../lib/prisma.js';
import auditService from './auditService.js';
import {
  validateFormula,
  validateRuleStructureDependencies,
  STATUTORY_UAE_DEFAULT_RULES,
  executeRuleEngine,
} from '@nextal/shared';

// Standard UAE Public Holidays for 2026 (Pre-loaded per Section 9.4)
export const UAE_2026_PUBLIC_HOLIDAYS = [
  { name: "New Year's Day", name_ar: 'رأس السنة الميلادية', date: '2026-01-01', days: 1 },
  { name: 'Eid Al Fitr (Estimated)', name_ar: 'عيد الفطر المبارك', date: '2026-03-20', days: 4 },
  { name: 'Arafat Day (Estimated)', name_ar: 'وقفة عرفة', date: '2026-05-26', days: 1 },
  { name: 'Eid Al Adha (Estimated)', name_ar: 'عيد الأضحى المبارك', date: '2026-05-27', days: 3 },
  { name: 'Islamic New Year', name_ar: 'رأس السنة الهجرية', date: '2026-06-16', days: 1 },
  { name: "Prophet's Birthday", name_ar: 'المولد النبوي الشريف', date: '2026-08-25', days: 1 },
  { name: 'Commemoration Day', name_ar: 'يوم الشهيد', date: '2026-12-01', days: 1 },
  { name: 'UAE National Day', name_ar: 'اليوم الوطني لدولة الإمارات', date: '2026-12-02', days: 2 },
];

class SettingsService {
  /**
   * Helper: Check if a given effective date falls within a locked pay run period
   */
  async assertNotLockedPeriod(companyId, effectiveFromDate) {
    if (!effectiveFromDate) return;
    const effDate = new Date(effectiveFromDate);

    // Find any locked or paid pay runs in this company with period_month on or after the effective date month
    const lockedRun = await prisma.$base().pay_runs.findFirst({
      where: {
        company_id: companyId,
        status: { in: ['Locked', 'Paid'] },
        period_month: {
          gte: new Date(effDate.getFullYear(), effDate.getMonth(), 1),
        },
      },
      orderBy: { period_month: 'desc' },
    });

    if (lockedRun) {
      const lockedMonthStr = lockedRun.period_month.toISOString().slice(0, 7);
      const err = new Error(
        `Immutability Violation: Cannot modify settings for or before a locked pay run period (${lockedMonthStr}). Locked runs must preserve historical rule versions.`
      );
      err.status = 400;
      err.code = 'PERIOD_LOCKED';
      throw err;
    }
  }

  /**
   * Helper: Record a version snapshot in settings_versions table
   */
  async recordVersion({ companyId, entityType, entityId, versionNo, effectiveFrom, snapshot, userId }) {
    return prisma.$base().settings_versions.create({
      data: {
        company_id: companyId,
        entity_type: entityType,
        entity_id: entityId,
        version_no: versionNo,
        effective_from: new Date(effectiveFrom || Date.now()),
        snapshot,
        created_by: userId,
      },
    });
  }

  /**
   * 1. Settings Home Overview: Live counts & latest audit activity for each tile
   */
  async getSettingsOverview(companyId) {
    const [
      company,
      visasCount,
      branchesCount,
      departmentsCount,
      jobsCount,
      shiftsCount,
      policiesCount,
      leaveTypesCount,
      holidaysCount,
      rulesCount,
      approvalFlowsCount,
      recentAuditLogs,
    ] = await Promise.all([
      prisma.$base().companies.findUnique({ where: { id: companyId } }),
      prisma.$base().company_visas.count({ where: { company_id: companyId } }),
      prisma.$base().branches.count({ where: { company_id: companyId } }),
      prisma.$base().departments.count({ where: { company_id: companyId } }),
      prisma.$base().jobs.count({ where: { company_id: companyId } }),
      prisma.$base().shifts.count({ where: { company_id: companyId } }),
      prisma.$base().attendance_policies.count({ where: { company_id: companyId } }),
      prisma.$base().leave_types.count({ where: { company_id: companyId } }),
      prisma.$base().public_holidays.count({ where: { company_id: companyId } }),
      prisma.$base().salary_rules.count({ where: { company_id: companyId } }),
      prisma.$base().approval_flows.count({ where: { company_id: companyId } }),
      prisma.$base().audit_logs.findMany({
        where: { company_id: companyId },
        orderBy: { created_at: 'desc' },
        take: 10,
        include: { user: { select: { email: true } } },
      }),
    ]);

    const findLatestChange = (entityName) => {
      const match = recentAuditLogs.find((l) => l.entity === entityName);
      if (!match) return { changedBy: 'System Default', changedAt: company.created_at };
      return {
        changedBy: match.user?.email || 'Admin',
        changedAt: match.created_at,
      };
    };

    return {
      company: {
        id: company.id,
        name: company.name,
        name_ar: company.name_ar,
        trade_license_no: company.trade_license_no,
        default_language: company.default_language,
        status: company.status,
      },
      sections: [
        {
          id: 'company',
          titleEn: 'Company Profile & Visas',
          titleAr: 'ملف الشركة والتأشيرات',
          count: visasCount,
          countLabelEn: `${visasCount} Visa Entities`,
          countLabelAr: `${visasCount} رخص وتأشيرات`,
          ...findLatestChange('companies'),
        },
        {
          id: 'branches',
          titleEn: 'Branches',
          titleAr: 'الفروع ومواقع العمل',
          count: branchesCount,
          countLabelEn: `${branchesCount} Active Branches`,
          countLabelAr: `${branchesCount} فروع نشطة`,
          ...findLatestChange('branches'),
        },
        {
          id: 'departments',
          titleEn: 'Departments & Jobs',
          titleAr: 'الأقسام والوظائف',
          count: departmentsCount,
          secondaryCount: jobsCount,
          countLabelEn: `${departmentsCount} Depts · ${jobsCount} Jobs`,
          countLabelAr: `${departmentsCount} أقسام · ${jobsCount} وظيفة`,
          ...findLatestChange('departments'),
        },
        {
          id: 'shifts',
          titleEn: 'Shifts & Attendance Policies',
          titleAr: 'الورديات وسياسات الحضور',
          count: shiftsCount,
          countLabelEn: `${shiftsCount} Shifts · ${policiesCount} Policies`,
          countLabelAr: `${shiftsCount} ورديات · ${policiesCount} سياسات`,
          ...findLatestChange('shifts'),
        },
        {
          id: 'leave',
          titleEn: 'Leave Types & Accrual Plans',
          titleAr: 'أنواع الإجازات وخطط الاستحقاق',
          count: leaveTypesCount,
          countLabelEn: `${leaveTypesCount} Leave Policies`,
          countLabelAr: `${leaveTypesCount} سياسات إجازة`,
          ...findLatestChange('leave_types'),
        },
        {
          id: 'holidays',
          titleEn: 'Public Holiday Calendar',
          titleAr: 'تقويم العطلات الرسمية',
          count: holidaysCount,
          countLabelEn: `${holidaysCount} UAE Holidays`,
          countLabelAr: `${holidaysCount} عطلات رسمية`,
          ...findLatestChange('public_holidays'),
        },
        {
          id: 'salary_rules',
          titleEn: 'Salary Rules & Structures',
          titleAr: 'قواعد وهياكل الرواتب',
          count: rulesCount,
          countLabelEn: `${rulesCount} Computed Rules`,
          countLabelAr: `${rulesCount} قواعد رواتب`,
          ...findLatestChange('salary_rules'),
        },
        {
          id: 'approvals',
          titleEn: 'Approval Settings',
          titleAr: 'إعدادات مسارات الموافقة',
          count: approvalFlowsCount,
          countLabelEn: `${approvalFlowsCount} Workflow Chains`,
          countLabelAr: `${approvalFlowsCount} مسارات اعتماد`,
          ...findLatestChange('approval_flows'),
        },
        {
          id: 'payroll_checks',
          titleEn: 'Payroll Checks & Alerts',
          titleAr: 'فحوصات الرواتب وتنبيهات الوثائق',
          count: company.alert_days?.length || 3,
          countLabelEn: `Cutoff Day ${company.default_cutoff_day} · ${company.variance_threshold_pct}% Variance`,
          countLabelAr: `يوم الإغلاق ${company.default_cutoff_day} · انحراف ${company.variance_threshold_pct}%`,
          ...findLatestChange('payroll_settings'),
        },
      ],
    };
  }

  /**
   * 2. Company Profile & Visas
   */
  async getCompanyProfile(companyId) {
    const company = await prisma.$base().companies.findUnique({
      where: { id: companyId },
      include: {
        company_visas: {
          orderBy: { name: 'asc' },
          include: {
            _count: { select: { employees: true, branches: true, pay_runs: true } },
          },
        },
      },
    });
    if (company) {
      company.data_retention_years = company.document_type_settings?.data_retention_years ?? 7;
    }
    return company;
  }

  async updateCompanyProfile({ companyId, data, userId }) {
    const old = await prisma.$base().companies.findUnique({ where: { id: companyId } });
    const updated = await prisma.$base().companies.update({
      where: { id: companyId },
      data: {
        name: data.name !== undefined ? data.name : old.name,
        name_ar: data.name_ar !== undefined ? data.name_ar : old.name_ar,
        trade_license_no: data.trade_license_no !== undefined ? data.trade_license_no : old.trade_license_no,
        logo_url: data.logo_url !== undefined ? data.logo_url : old.logo_url,
        default_language: data.default_language !== undefined ? data.default_language : old.default_language,
        document_type_settings: data.data_retention_years !== undefined
          ? {
              ...(old.document_type_settings || {}),
              data_retention_years: Number(data.data_retention_years) || 7,
            }
          : old.document_type_settings,
        pension_scheme_default: data.pension_scheme_default !== undefined ? data.pension_scheme_default : old.pension_scheme_default,
        gpssa_employee_rate_new: data.gpssa_employee_rate_new !== undefined ? data.gpssa_employee_rate_new : old.gpssa_employee_rate_new,
        gpssa_employee_rate_legacy: data.gpssa_employee_rate_legacy !== undefined ? data.gpssa_employee_rate_legacy : old.gpssa_employee_rate_legacy,
        gpssa_employer_rate: data.gpssa_employer_rate !== undefined ? data.gpssa_employer_rate : old.gpssa_employer_rate,
        gpssa_gov_share_rate: data.gpssa_gov_share_rate !== undefined ? data.gpssa_gov_share_rate : old.gpssa_gov_share_rate,
        gpssa_min_salary: data.gpssa_min_salary !== undefined ? data.gpssa_min_salary : old.gpssa_min_salary,
        gpssa_max_salary: data.gpssa_max_salary !== undefined ? data.gpssa_max_salary : old.gpssa_max_salary,
        adpf_employee_rate: data.adpf_employee_rate !== undefined ? data.adpf_employee_rate : old.adpf_employee_rate,
        adpf_employer_rate: data.adpf_employer_rate !== undefined ? data.adpf_employer_rate : old.adpf_employer_rate,
        adpf_gov_share_rate: data.adpf_gov_share_rate !== undefined ? data.adpf_gov_share_rate : old.adpf_gov_share_rate,
        adpf_min_salary: data.adpf_min_salary !== undefined ? data.adpf_min_salary : old.adpf_min_salary,
        adpf_max_salary: data.adpf_max_salary !== undefined ? data.adpf_max_salary : old.adpf_max_salary,
        updated_by: userId,
      },
    });

    await auditService.logAction({
      companyId,
      userId,
      action: 'UPDATE',
      entity: 'companies',
      recordId: companyId,
      oldValues: old,
      newValues: updated,
    });

    if (updated) {
      updated.data_retention_years = updated.document_type_settings?.data_retention_years ?? 7;
    }
    return updated;
  }

  async createCompanyVisa({ companyId, data, userId }) {
    const molId = data.mohre_employer_id || data.mol_establishment_id;
    if (!molId) {
      const err = new Error('MOHRE Establishment ID is required');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      err.field = 'mol_establishment_id';
      throw err;
    }

    const existingVisa = await prisma.$base().company_visas.findFirst({
      where: {
        company_id: companyId,
        mol_establishment_id: molId,
      },
    });
    if (existingVisa) {
      const err = new Error(`MOHRE Employer ID '${molId}' is already in use by another visa profile.`);
      err.status = 400;
      err.code = 'DUPLICATE_MOL_ID';
      err.field = 'mol_establishment_id';
      throw err;
    }

    const routing = data.bank_routing_code || data.routing_code;
    if (routing && routing.trim().length !== 9) {
      const err = new Error('Bank routing code must be exactly 9 characters.');
      err.status = 400;
      err.code = 'INVALID_ROUTING_CODE';
      err.field = 'bank_routing_code';
      throw err;
    }

    const visa = await prisma.$base().company_visas.create({
      data: {
        company_id: companyId,
        name: data.name,
        mol_establishment_id: molId,
        bank_routing_code: routing || 'ENBD00101',
        emirate: data.emirate || 'Dubai',
        pension_fund: data.pension_fund || (data.emirate === 'Abu Dhabi' ? 'ADPF' : 'GPSSA'),
        created_by: userId,
        updated_by: userId,
      },
    });

    await auditService.logAction({
      companyId,
      userId,
      action: 'CREATE',
      entity: 'company_visas',
      recordId: visa.id,
      newValues: visa,
    });

    return visa;
  }

  async updateCompanyVisa({ companyId, id, data, userId }) {
    const old = await prisma.$base().company_visas.findUnique({ where: { id } });
    if (!old || old.company_id !== companyId) {
      const err = new Error('Company visa entity not found');
      err.status = 404;
      throw err;
    }

    const molId = data.mohre_employer_id !== undefined ? data.mohre_employer_id : data.mol_establishment_id;
    if (molId && molId !== old.mol_establishment_id) {
      const duplicate = await prisma.$base().company_visas.findFirst({
        where: {
          company_id: companyId,
          mol_establishment_id: molId,
          id: { not: id },
        },
      });
      if (duplicate) {
        const err = new Error(`MOHRE Employer ID '${molId}' is already in use by another visa profile.`);
        err.status = 400;
        err.code = 'DUPLICATE_MOL_ID';
        err.field = 'mol_establishment_id';
        throw err;
      }
    }

    const routing = data.bank_routing_code !== undefined ? data.bank_routing_code : data.routing_code;
    if (routing && routing.trim().length !== 9) {
      const err = new Error('Bank routing code must be exactly 9 characters.');
      err.status = 400;
      err.code = 'INVALID_ROUTING_CODE';
      err.field = 'bank_routing_code';
      throw err;
    }

    const updated = await prisma.$base().company_visas.update({
      where: { id },
      data: {
        name: data.name !== undefined ? data.name : old.name,
        mol_establishment_id: molId !== undefined ? molId : old.mol_establishment_id,
        bank_routing_code: routing !== undefined ? routing : old.bank_routing_code,
        pension_fund: data.pension_fund !== undefined ? data.pension_fund : old.pension_fund,
        updated_by: userId,
      },
    });

    await auditService.logAction({
      companyId,
      userId,
      action: 'UPDATE',
      entity: 'company_visas',
      recordId: id,
      oldValues: old,
      newValues: updated,
    });

    return updated;
  }

  async deleteCompanyVisa({ companyId, id, userId }) {
    const visa = await prisma.$base().company_visas.findUnique({
      where: { id },
      include: {
        _count: { select: { employees: true, branches: true, pay_runs: true } },
      },
    });

    if (!visa || visa.company_id !== companyId) {
      const err = new Error('Company visa entity not found');
      err.status = 404;
      throw err;
    }

    // Rule E: Delete-in-use protection
    if (visa._count.employees > 0 || visa._count.branches > 0 || visa._count.pay_runs > 0) {
      const err = new Error(
        `Cannot delete Company Visa '${visa.name}': It is in use (${visa._count.employees} employees, ${visa._count.branches} branches, ${visa._count.pay_runs} pay runs).`
      );
      err.status = 400;
      err.code = 'DELETE_IN_USE_BLOCKED';
      throw err;
    }

    await prisma.$base().company_visas.delete({ where: { id } });

    await auditService.logAction({
      companyId,
      userId,
      action: 'DELETE',
      entity: 'company_visas',
      recordId: id,
      oldValues: visa,
    });

    return { success: true };
  }

  /**
   * 3. Branches
   */
  async getBranches(companyId) {
    const list = await prisma.$base().branches.findMany({
      where: { company_id: companyId },
      include: {
        company_visa: { select: { id: true, name: true, mol_establishment_id: true } },
        _count: {
          select: {
            employees: {
              where: { status: 'Active' },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return list.map((b) => ({
      ...b,
      company_visa_name: b.company_visa?.name || 'Visa 01',
      company_visa_name_ar: b.company_visa?.name_ar || b.company_visa?.name || 'تأشيرة 01',
      mol_establishment_id: b.company_visa?.mol_establishment_id || '',
      employee_count: b._count?.employees ?? 0,
      active_employee_count: b._count?.employees ?? 0,
    }));
  }

  async createBranch({ companyId, data, userId }) {
    if (!data.company_visa_id) {
      const err = new Error('company_visa_id is required');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    const visa = await prisma.$base().company_visas.findFirst({
      where: { id: data.company_visa_id, company_id: companyId },
    });
    if (!visa) {
      const err = new Error('Specified company visa does not belong to your company');
      err.status = 400;
      err.code = 'INVALID_VISA';
      throw err;
    }

    const branch = await prisma.$base().branches.create({
      data: {
        company_id: companyId,
        company_visa_id: data.company_visa_id,
        name: data.name,
        name_ar: data.name_ar || null,
        emirate: data.emirate,
        created_by: userId,
        updated_by: userId,
      },
      include: { company_visa: true },
    });

    await auditService.logAction({
      companyId,
      userId,
      action: 'CREATE',
      entity: 'branches',
      recordId: branch.id,
      newValues: branch,
    });

    return branch;
  }

  async updateBranch({ companyId, id, data, userId }) {
    const old = await prisma.$base().branches.findUnique({ where: { id } });
    if (!old || old.company_id !== companyId) {
      const err = new Error('Branch not found');
      err.status = 404;
      throw err;
    }

    if (data.company_visa_id && data.company_visa_id !== old.company_visa_id) {
      const targetVisa = await prisma.$base().company_visas.findFirst({
        where: { id: data.company_visa_id, company_id: companyId },
      });
      if (!targetVisa) {
        const err = new Error('Specified company visa does not belong to your company');
        err.status = 400;
        err.code = 'INVALID_VISA';
        throw err;
      }

      const empCount = await prisma.$base().employees.count({
        where: { company_id: companyId, branch_id: id },
      });
      if (empCount > 0) {
        const err = new Error(`Cannot change branch visa: Branch has ${empCount} assigned employee(s). Move employees before changing visa.`);
        err.status = 400;
        err.code = 'BRANCH_HAS_EMPLOYEES';
        throw err;
      }
    }

    const updated = await prisma.$base().branches.update({
      where: { id },
      data: {
        name: data.name !== undefined ? data.name : old.name,
        name_ar: data.name_ar !== undefined ? data.name_ar : old.name_ar,
        emirate: data.emirate !== undefined ? data.emirate : old.emirate,
        company_visa_id: data.company_visa_id !== undefined ? data.company_visa_id : old.company_visa_id,
        updated_by: userId,
      },
      include: { company_visa: true },
    });

    await auditService.logAction({
      companyId,
      userId,
      action: 'UPDATE',
      entity: 'branches',
      recordId: id,
      oldValues: old,
      newValues: updated,
    });

    return updated;
  }

  async deleteBranch({ companyId, id, userId }) {
    const branch = await prisma.$base().branches.findUnique({
      where: { id },
      include: { _count: { select: { employees: true } } },
    });

    if (!branch || branch.company_id !== companyId) {
      const err = new Error('Branch not found');
      err.status = 404;
      throw err;
    }

    // Rule E: Delete-in-use protection
    if (branch._count.employees > 0) {
      const err = new Error(
        `Cannot delete Branch '${branch.name}': It currently has ${branch._count.employees} assigned employee(s). Transfer employees or deactivate instead.`
      );
      err.status = 400;
      err.code = 'DELETE_IN_USE_BLOCKED';
      throw err;
    }

    // Block delete if branch has branch-only public holidays
    const holidayCount = await prisma.$base().public_holidays.count({
      where: { company_id: companyId, branch_id: id },
    });
    if (holidayCount > 0) {
      const err = new Error(
        `Cannot delete Branch '${branch.name}': It has ${holidayCount} branch-specific public holiday(s). Reassign or delete holidays first.`
      );
      err.status = 400;
      err.code = 'BRANCH_HAS_HOLIDAYS';
      throw err;
    }

    await prisma.$base().branches.delete({ where: { id } });

    await auditService.logAction({
      companyId,
      userId,
      action: 'DELETE',
      entity: 'branches',
      recordId: id,
      oldValues: branch,
    });

    return { success: true };
  }

  /**
   * 4. Departments & Jobs
   */
  async getDepartments(companyId) {
    const all = await prisma.$base().departments.findMany({
      where: { company_id: companyId },
      include: {
        manager: { select: { id: true, name: true, employee_code: true } },
        _count: { select: { contracts: true, children: true, jobs: true } },
      },
      orderBy: { name: 'asc' },
    });

    // Build hierarchy tree
    const map = new Map();
    all.forEach((d) => map.set(d.id, { ...d, subDepartments: [] }));

    const roots = [];
    all.forEach((d) => {
      if (d.parent_id && map.has(d.parent_id)) {
        map.get(d.parent_id).subDepartments.push(map.get(d.id));
      } else {
        roots.push(map.get(d.id));
      }
    });

    return { flat: all, tree: roots };
  }

  async createDepartment({ companyId, data, userId }) {
    const dept = await prisma.$base().departments.create({
      data: {
        company_id: companyId,
        name: data.name,
        name_ar: data.name_ar,
        parent_id: data.parent_id || null,
        manager_id: data.manager_id || null,
        cost_centre: data.cost_centre || null,
        created_by: userId,
        updated_by: userId,
      },
      include: {
        manager: { select: { id: true, name: true } },
      },
    });

    await auditService.logAction({
      companyId,
      userId,
      action: 'CREATE',
      entity: 'departments',
      recordId: dept.id,
      newValues: dept,
    });

    return dept;
  }

  async updateDepartment({ companyId, id, data, userId }) {
    const old = await prisma.$base().departments.findUnique({ where: { id } });
    if (!old || old.company_id !== companyId) {
      const err = new Error('Department not found');
      err.status = 404;
      throw err;
    }

    // Prevent cycle in hierarchy
    if (data.parent_id === id) {
      const err = new Error('A department cannot be its own parent');
      err.status = 400;
      throw err;
    }

    const updated = await prisma.$base().departments.update({
      where: { id },
      data: {
        name: data.name !== undefined ? data.name : old.name,
        name_ar: data.name_ar !== undefined ? data.name_ar : old.name_ar,
        parent_id: data.parent_id !== undefined ? data.parent_id : old.parent_id,
        manager_id: data.manager_id !== undefined ? data.manager_id : old.manager_id,
        cost_centre: data.cost_centre !== undefined ? data.cost_centre : old.cost_centre,
        updated_by: userId,
      },
      include: {
        manager: { select: { id: true, name: true } },
      },
    });

    await auditService.logAction({
      companyId,
      userId,
      action: 'UPDATE',
      entity: 'departments',
      recordId: id,
      oldValues: old,
      newValues: updated,
    });

    return updated;
  }

  async deleteDepartment({ companyId, id, userId }) {
    const dept = await prisma.$base().departments.findUnique({
      where: { id },
      include: {
        _count: { select: { contracts: true, children: true, jobs: true } },
      },
    });

    if (!dept || dept.company_id !== companyId) {
      const err = new Error('Department not found');
      err.status = 404;
      throw err;
    }

    // Rule E: Delete-in-use protection
    if (dept._count.contracts > 0 || dept._count.children > 0 || dept._count.jobs > 0) {
      const err = new Error(
        `Cannot delete Department '${dept.name}': It has ${dept._count.children} sub-departments, ${dept._count.jobs} jobs, and ${dept._count.contracts} active contracts.`
      );
      err.status = 400;
      err.code = 'DELETE_IN_USE_BLOCKED';
      throw err;
    }

    await prisma.$base().departments.delete({ where: { id } });

    await auditService.logAction({
      companyId,
      userId,
      action: 'DELETE',
      entity: 'departments',
      recordId: id,
      oldValues: dept,
    });

    return { success: true };
  }

  async getJobs(companyId) {
    return prisma.$base().jobs.findMany({
      where: { company_id: companyId },
      include: {
        department: { select: { id: true, name: true } },
        _count: { select: { contracts: true } },
      },
      orderBy: { title: 'asc' },
    });
  }

  async createJob({ companyId, data, userId }) {
    // Rule F: Unique job code validation
    const code = data.job_code || data.code;
    if (code) {
      const existing = await prisma.$base().jobs.findFirst({
        where: { company_id: companyId, job_code: code },
      });
      if (existing) {
        const err = new Error(`Job code '${code}' is already in use in this company.`);
        err.status = 400;
        err.code = 'DUPLICATE_JOB_CODE';
        throw err;
      }
    }

    let deptId = data.department_id;
    if (!deptId && data.department) {
      const dept = await prisma.$base().departments.findFirst({
        where: { company_id: companyId, name: data.department },
      });
      if (dept) deptId = dept.id;
    }
    if (!deptId) {
      const defaultDept = await prisma.$base().departments.findFirst({
        where: { company_id: companyId },
        orderBy: { created_at: 'asc' },
      });
      if (defaultDept) deptId = defaultDept.id;
    }

    const job = await prisma.$base().jobs.create({
      data: {
        company_id: companyId,
        department_id: deptId,
        title: data.title,
        title_ar: data.title_ar || data.title,
        job_code: code || null,
        grade: data.grade || null,
        created_by: userId,
        updated_by: userId,
      },
      include: { department: true },
    });

    await auditService.logAction({
      companyId,
      userId,
      action: 'CREATE',
      entity: 'jobs',
      recordId: job.id,
      newValues: job,
    });

    return job;
  }

  async updateJob({ companyId, id, data, userId }) {
    const old = await prisma.$base().jobs.findUnique({ where: { id } });
    if (!old || old.company_id !== companyId) {
      const err = new Error('Job not found');
      err.status = 404;
      throw err;
    }

    if (data.job_code && data.job_code !== old.job_code) {
      const existing = await prisma.$base().jobs.findFirst({
        where: { company_id: companyId, job_code: data.job_code, id: { not: id } },
      });
      if (existing) {
        const err = new Error(`Job code '${data.job_code}' is already in use in this company.`);
        err.status = 400;
        err.code = 'DUPLICATE_JOB_CODE';
        throw err;
      }
    }

    const updated = await prisma.$base().jobs.update({
      where: { id },
      data: {
        department_id: data.department_id !== undefined ? data.department_id : old.department_id,
        title: data.title !== undefined ? data.title : old.title,
        title_ar: data.title_ar !== undefined ? data.title_ar : old.title_ar,
        job_code: data.job_code !== undefined ? data.job_code : old.job_code,
        grade: data.grade !== undefined ? data.grade : old.grade,
        updated_by: userId,
      },
      include: { department: true },
    });

    await auditService.logAction({
      companyId,
      userId,
      action: 'UPDATE',
      entity: 'jobs',
      recordId: id,
      oldValues: old,
      newValues: updated,
    });

    return updated;
  }

  async deleteJob({ companyId, id, userId }) {
    const job = await prisma.$base().jobs.findUnique({
      where: { id },
      include: { _count: { select: { contracts: true } } },
    });

    if (!job || job.company_id !== companyId) {
      const err = new Error('Job not found');
      err.status = 404;
      throw err;
    }

    // Rule E: Delete-in-use protection
    if (job._count.contracts > 0) {
      const err = new Error(
        `Cannot delete Job '${job.title}': It is referenced by ${job._count.contracts} employee contract(s). Deactivate or reassign contracts instead.`
      );
      err.status = 400;
      err.code = 'DELETE_IN_USE_BLOCKED';
      throw err;
    }

    await prisma.$base().jobs.delete({ where: { id } });

    await auditService.logAction({
      companyId,
      userId,
      action: 'DELETE',
      entity: 'jobs',
      recordId: id,
      oldValues: job,
    });

    return { success: true };
  }

  /**
   * 5. Shifts & Attendance Policies
   */
  async getShifts(companyId) {
    return prisma.$base().shifts.findMany({
      where: { company_id: companyId },
      include: { _count: { select: { contracts: true, attendance_days: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async createShift({ companyId, data, userId, effectiveFrom }) {
    await this.assertNotLockedPeriod(companyId, effectiveFrom);

    const shift = await prisma.$base().shifts.create({
      data: {
        company_id: companyId,
        name: data.name,
        start_time: data.start_time,
        end_time: data.end_time,
        break_minutes: data.break_minutes || 60,
        grace_minutes: data.grace_minutes || 15,
        weekly_off_days: data.weekly_off_days || [5, 6], // Friday, Saturday or Saturday, Sunday
        ramadan_start_time: data.ramadan_start_time || null,
        ramadan_end_time: data.ramadan_end_time || null,
        effective_from: effectiveFrom ? new Date(effectiveFrom) : new Date(),
        version: 1,
        created_by: userId,
        updated_by: userId,
      },
    });

    await this.recordVersion({
      companyId,
      entityType: 'shift',
      entityId: shift.id,
      versionNo: 1,
      effectiveFrom: shift.effective_from,
      snapshot: shift,
      userId,
    });

    await auditService.logAction({
      companyId,
      userId,
      action: 'CREATE',
      entity: 'shifts',
      recordId: shift.id,
      newValues: shift,
    });

    return shift;
  }

  async updateShift({ companyId, id, data, userId, effectiveFrom }) {
    await this.assertNotLockedPeriod(companyId, effectiveFrom);

    const old = await prisma.$base().shifts.findUnique({ where: { id } });
    if (!old || old.company_id !== companyId) {
      const err = new Error('Shift not found');
      err.status = 404;
      throw err;
    }

    const nextVersion = (old.version || 1) + 1;

    const updated = await prisma.$base().shifts.update({
      where: { id },
      data: {
        name: data.name !== undefined ? data.name : old.name,
        start_time: data.start_time !== undefined ? data.start_time : old.start_time,
        end_time: data.end_time !== undefined ? data.end_time : old.end_time,
        break_minutes: data.break_minutes !== undefined ? data.break_minutes : old.break_minutes,
        grace_minutes: data.grace_minutes !== undefined ? data.grace_minutes : old.grace_minutes,
        weekly_off_days: data.weekly_off_days !== undefined ? data.weekly_off_days : old.weekly_off_days,
        ramadan_start_time: data.ramadan_start_time !== undefined ? data.ramadan_start_time : old.ramadan_start_time,
        ramadan_end_time: data.ramadan_end_time !== undefined ? data.ramadan_end_time : old.ramadan_end_time,
        is_active: data.is_active !== undefined ? data.is_active : old.is_active,
        effective_from: effectiveFrom ? new Date(effectiveFrom) : old.effective_from,
        version: nextVersion,
        updated_by: userId,
      },
    });

    // Record historical version
    await this.recordVersion({
      companyId,
      entityType: 'shift',
      entityId: id,
      versionNo: nextVersion,
      effectiveFrom: updated.effective_from,
      snapshot: updated,
      userId,
    });

    await auditService.logAction({
      companyId,
      userId,
      action: 'UPDATE',
      entity: 'shifts',
      recordId: id,
      oldValues: old,
      newValues: updated,
    });

    return updated;
  }

  async deleteShift({ companyId, id, userId }) {
    const shift = await prisma.$base().shifts.findUnique({
      where: { id },
      include: { _count: { select: { contracts: true, attendance_days: true } } },
    });

    if (!shift || shift.company_id !== companyId) {
      const err = new Error('Shift not found');
      err.status = 404;
      throw err;
    }

    // Rule E: Delete-in-use protection
    if (shift._count.contracts > 0 || shift._count.attendance_days > 0) {
      const err = new Error(
        `Cannot delete Shift '${shift.name}': Assigned to ${shift._count.contracts} employee contract(s) and referenced in ${shift._count.attendance_days} attendance day(s). Deactivate the shift instead.`
      );
      err.status = 400;
      err.code = 'DELETE_IN_USE_BLOCKED';
      throw err;
    }

    await prisma.$base().shifts.delete({ where: { id } });

    await auditService.logAction({
      companyId,
      userId,
      action: 'DELETE',
      entity: 'shifts',
      recordId: id,
      oldValues: shift,
    });

    return { success: true };
  }

  async getAttendancePolicies(companyId) {
    return prisma.$base().attendance_policies.findMany({
      where: { company_id: companyId },
      include: {
        penalty_steps: { orderBy: { occurrence_from: 'asc' } },
        _count: { select: { contracts: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createAttendancePolicy({ companyId, data, userId, effectiveFrom }) {
    await this.assertNotLockedPeriod(companyId, effectiveFrom);

    // Rule F: Validate penalty step order
    if (data.penalty_steps && data.penalty_steps.length > 1) {
      for (let i = 1; i < data.penalty_steps.length; i++) {
        if (data.penalty_steps[i].occurrence_from <= data.penalty_steps[i - 1].occurrence_from) {
          const err = new Error('Penalty step occurrence_from must be strictly ascending (e.g. 1st, 2nd, 3rd occurrence).');
          err.status = 400;
          err.code = 'INVALID_PENALTY_STEPS';
          throw err;
        }
      }
    }

    const policy = await prisma.$base().attendance_policies.create({
      data: {
        company_id: companyId,
        name: data.name,
        late_grace_minutes: data.late_grace_minutes || 15,
        early_out_grace_minutes: data.early_out_grace_minutes || 15,
        ot_eligible: data.ot_eligible !== undefined ? data.ot_eligible : true,
        ot_min_minutes: data.ot_min_minutes || 30,
        night_start: data.night_start || '22:00:00',
        night_end: data.night_end || '04:00:00',
        effective_from: effectiveFrom ? new Date(effectiveFrom) : new Date(),
        version: 1,
        created_by: userId,
        updated_by: userId,
        penalty_steps: {
          create: (data.penalty_steps || []).map((step) => ({
            company_id: companyId,
            applies_to: step.applies_to || 'Late',
            occurrence_from: step.occurrence_from,
            min_minutes: step.min_minutes || 15,
            penalty_type: step.penalty_type || 'Warning',
            penalty_value: new Decimal(step.penalty_value || 0),
            created_by: userId,
            updated_by: userId,
          })),
        },
      },
      include: { penalty_steps: true },
    });

    await this.recordVersion({
      companyId,
      entityType: 'attendance_policy',
      entityId: policy.id,
      versionNo: 1,
      effectiveFrom: policy.effective_from,
      snapshot: policy,
      userId,
    });

    await auditService.logAction({
      companyId,
      userId,
      action: 'CREATE',
      entity: 'attendance_policies',
      recordId: policy.id,
      newValues: policy,
    });

    return policy;
  }

  async updateAttendancePolicy({ companyId, id, data, userId, effectiveFrom }) {
    await this.assertNotLockedPeriod(companyId, effectiveFrom);

    const old = await prisma.$base().attendance_policies.findUnique({
      where: { id },
      include: { penalty_steps: true },
    });

    if (!old || old.company_id !== companyId) {
      const err = new Error('Attendance policy not found');
      err.status = 404;
      throw err;
    }

    // Rule F: Validate penalty step order
    if (data.penalty_steps && data.penalty_steps.length > 1) {
      for (let i = 1; i < data.penalty_steps.length; i++) {
        if (data.penalty_steps[i].occurrence_from <= data.penalty_steps[i - 1].occurrence_from) {
          const err = new Error('Penalty step occurrence_from must be strictly ascending.');
          err.status = 400;
          err.code = 'INVALID_PENALTY_STEPS';
          throw err;
        }
      }
    }

    const nextVersion = (old.version || 1) + 1;

    // Delete existing penalty steps and recreate if passed
    if (data.penalty_steps) {
      await prisma.$base().penalty_steps.deleteMany({ where: { policy_id: id } });
    }

    const updated = await prisma.$base().attendance_policies.update({
      where: { id },
      data: {
        name: data.name !== undefined ? data.name : old.name,
        late_grace_minutes: data.late_grace_minutes !== undefined ? data.late_grace_minutes : old.late_grace_minutes,
        early_out_grace_minutes: data.early_out_grace_minutes !== undefined ? data.early_out_grace_minutes : old.early_out_grace_minutes,
        ot_eligible: data.ot_eligible !== undefined ? data.ot_eligible : old.ot_eligible,
        ot_min_minutes: data.ot_min_minutes !== undefined ? data.ot_min_minutes : old.ot_min_minutes,
        night_start: data.night_start !== undefined ? data.night_start : old.night_start,
        night_end: data.night_end !== undefined ? data.night_end : old.night_end,
        is_active: data.is_active !== undefined ? data.is_active : old.is_active,
        effective_from: effectiveFrom ? new Date(effectiveFrom) : old.effective_from,
        version: nextVersion,
        updated_by: userId,
        ...(data.penalty_steps
          ? {
              penalty_steps: {
                create: data.penalty_steps.map((step) => ({
                  company_id: companyId,
                  applies_to: step.applies_to || 'Late',
                  occurrence_from: step.occurrence_from,
                  min_minutes: step.min_minutes || 15,
                  penalty_type: step.penalty_type || 'Warning',
                  penalty_value: new Decimal(step.penalty_value || 0),
                  created_by: userId,
                  updated_by: userId,
                })),
              },
            }
          : {}),
      },
      include: { penalty_steps: true },
    });

    await this.recordVersion({
      companyId,
      entityType: 'attendance_policy',
      entityId: id,
      versionNo: nextVersion,
      effectiveFrom: updated.effective_from,
      snapshot: updated,
      userId,
    });

    await auditService.logAction({
      companyId,
      userId,
      action: 'UPDATE',
      entity: 'attendance_policies',
      recordId: id,
      oldValues: old,
      newValues: updated,
    });

    return updated;
  }

  async deleteAttendancePolicy({ companyId, id, userId }) {
    const policy = await prisma.$base().attendance_policies.findUnique({
      where: { id },
      include: { _count: { select: { contracts: true } } },
    });

    if (!policy || policy.company_id !== companyId) {
      const err = new Error('Attendance policy not found');
      err.status = 404;
      throw err;
    }

    // Rule E: Delete-in-use protection
    if (policy._count.contracts > 0) {
      const err = new Error(
        `Cannot delete Attendance Policy '${policy.name}': It is assigned to ${policy._count.contracts} employee contract(s). Deactivate instead.`
      );
      err.status = 400;
      err.code = 'DELETE_IN_USE_BLOCKED';
      throw err;
    }

    await prisma.$base().penalty_steps.deleteMany({ where: { policy_id: id } });
    await prisma.$base().attendance_policies.delete({ where: { id } });

    await auditService.logAction({
      companyId,
      userId,
      action: 'DELETE',
      entity: 'attendance_policies',
      recordId: id,
      oldValues: policy,
    });

    return { success: true };
  }

  /**
   * 6. Leave Types & Accrual Plans
   */
  async getLeaveTypes(companyId) {
    return prisma.$base().leave_types.findMany({
      where: { company_id: companyId },
      include: {
        accrual_plans: true,
        _count: { select: { leave_allocations: true, leave_requests: true } },
      },
      orderBy: { code: 'asc' },
    });
  }

  async createLeaveType({ companyId, data, userId, effectiveFrom }) {
    await this.assertNotLockedPeriod(companyId, effectiveFrom);

    // Rule F: Pay band day ranges must add up to max days
    if (data.pay_bands && Array.isArray(data.pay_bands) && data.max_days_per_year) {
      const bandTotal = data.pay_bands.reduce((sum, b) => sum + Number(b.days || 0), 0);
      if (bandTotal !== Number(data.max_days_per_year)) {
        const err = new Error(
          `Validation Error: Pay band days total (${bandTotal}) must exactly equal max days per year (${data.max_days_per_year}).`
        );
        err.status = 400;
        err.code = 'PAY_BANDS_MISMATCH';
        throw err;
      }
    }

    const leaveType = await prisma.$base().leave_types.create({
      data: {
        company_id: companyId,
        code: data.code.toUpperCase(),
        name: data.name,
        name_ar: data.name_ar,
        is_paid: data.is_paid !== undefined ? data.is_paid : true,
        max_days_per_year: data.max_days_per_year || 30,
        pay_bands: data.pay_bands || null,
        needs_attachment: data.needs_attachment || false,
        needs_gm: data.needs_gm || false,
        gm_after_days: data.gm_after_days || null,
        effective_from: effectiveFrom ? new Date(effectiveFrom) : new Date(),
        version: 1,
        created_by: userId,
        updated_by: userId,
      },
    });

    await this.recordVersion({
      companyId,
      entityType: 'leave_type',
      entityId: leaveType.id,
      versionNo: 1,
      effectiveFrom: leaveType.effective_from,
      snapshot: leaveType,
      userId,
    });

    await auditService.logAction({
      companyId,
      userId,
      action: 'CREATE',
      entity: 'leave_types',
      recordId: leaveType.id,
      newValues: leaveType,
    });

    return leaveType;
  }

  async updateLeaveType({ companyId, id, data, userId, effectiveFrom }) {
    await this.assertNotLockedPeriod(companyId, effectiveFrom);

    const old = await prisma.$base().leave_types.findUnique({ where: { id } });
    if (!old || old.company_id !== companyId) {
      const err = new Error('Leave type not found');
      err.status = 404;
      throw err;
    }

    // Rule F: Pay band day ranges must add up to max days
    const maxDays = data.max_days_per_year !== undefined ? data.max_days_per_year : old.max_days_per_year;
    const payBands = data.pay_bands !== undefined ? data.pay_bands : old.pay_bands;

    if (payBands && Array.isArray(payBands) && maxDays) {
      const bandTotal = payBands.reduce((sum, b) => sum + Number(b.days || 0), 0);
      if (bandTotal !== Number(maxDays)) {
        const err = new Error(
          `Validation Error: Pay band days total (${bandTotal}) must exactly equal max days per year (${maxDays}).`
        );
        err.status = 400;
        err.code = 'PAY_BANDS_MISMATCH';
        throw err;
      }
    }

    const nextVersion = (old.version || 1) + 1;

    const updated = await prisma.$base().leave_types.update({
      where: { id },
      data: {
        name: data.name !== undefined ? data.name : old.name,
        name_ar: data.name_ar !== undefined ? data.name_ar : old.name_ar,
        is_paid: data.is_paid !== undefined ? data.is_paid : old.is_paid,
        max_days_per_year: data.max_days_per_year !== undefined ? data.max_days_per_year : old.max_days_per_year,
        pay_bands: payBands,
        needs_attachment: data.needs_attachment !== undefined ? data.needs_attachment : old.needs_attachment,
        needs_gm: data.needs_gm !== undefined ? data.needs_gm : old.needs_gm,
        gm_after_days: data.gm_after_days !== undefined ? data.gm_after_days : old.gm_after_days,
        is_active: data.is_active !== undefined ? data.is_active : old.is_active,
        effective_from: effectiveFrom ? new Date(effectiveFrom) : old.effective_from,
        version: nextVersion,
        updated_by: userId,
      },
    });

    await this.recordVersion({
      companyId,
      entityType: 'leave_type',
      entityId: id,
      versionNo: nextVersion,
      effectiveFrom: updated.effective_from,
      snapshot: updated,
      userId,
    });

    await auditService.logAction({
      companyId,
      userId,
      action: 'UPDATE',
      entity: 'leave_types',
      recordId: id,
      oldValues: old,
      newValues: updated,
    });

    return updated;
  }

  async deleteLeaveType({ companyId, id, userId }) {
    const leaveType = await prisma.$base().leave_types.findUnique({
      where: { id },
      include: {
        _count: { select: { leave_allocations: true, leave_requests: true } },
      },
    });

    if (!leaveType || leaveType.company_id !== companyId) {
      const err = new Error('Leave type not found');
      err.status = 404;
      throw err;
    }

    // Rule E: Delete-in-use protection
    if (leaveType._count.leave_allocations > 0 || leaveType._count.leave_requests > 0) {
      const err = new Error(
        `Cannot delete Leave Type '${leaveType.name}': It has ${leaveType._count.leave_allocations} allocation record(s) and ${leaveType._count.leave_requests} request(s). Deactivate instead.`
      );
      err.status = 400;
      err.code = 'DELETE_IN_USE_BLOCKED';
      throw err;
    }

    await prisma.$base().accrual_plans.deleteMany({ where: { leave_type_id: id } });
    await prisma.$base().leave_types.delete({ where: { id } });

    await auditService.logAction({
      companyId,
      userId,
      action: 'DELETE',
      entity: 'leave_types',
      recordId: id,
      oldValues: leaveType,
    });

    return { success: true };
  }

  async createAccrualPlan({ companyId, data, userId, effectiveFrom }) {
    await this.assertNotLockedPeriod(companyId, effectiveFrom);

    const plan = await prisma.$base().accrual_plans.create({
      data: {
        company_id: companyId,
        leave_type_id: data.leave_type_id,
        name: data.name,
        days_per_month: new Decimal(data.days_per_month || 2.0),
        start_after_months: data.start_after_months || 6,
        yearly_cap: data.yearly_cap || 30,
        carry_over_max: data.carry_over_max || 0,
        carry_over_expiry_months: data.carry_over_expiry_months || null,
        effective_from: effectiveFrom ? new Date(effectiveFrom) : new Date(),
        version: 1,
        created_by: userId,
        updated_by: userId,
      },
      include: { leave_type: true },
    });

    await auditService.logAction({
      companyId,
      userId,
      action: 'CREATE',
      entity: 'accrual_plans',
      recordId: plan.id,
      newValues: plan,
    });

    return plan;
  }

  /**
   * 7. Public Holiday Calendar
   */
  async getPublicHolidays({ companyId, year, branchId }) {
    const where = { company_id: companyId };
    if (year) {
      where.year = parseInt(year, 10);
    }
    if (branchId) {
      where.OR = [{ branch_id: branchId }, { branch_id: null }];
    }

    return prisma.$base().public_holidays.findMany({
      where,
      include: { branch: { select: { id: true, name: true } } },
      orderBy: { holiday_date: 'asc' },
    });
  }

  async createPublicHoliday({ companyId, data, userId }) {
    const rawDate = data.holiday_date || data.date;
    const holDate = new Date(rawDate);
    const year = holDate.getFullYear();

    let targetBranchId = data.branch_id || null;
    if (!targetBranchId && data.branch_scope && data.branch_scope !== 'ALL') {
      const bMatch = await prisma.$base().branches.findFirst({
        where: { company_id: companyId, OR: [{ id: data.branch_scope }, { name: data.branch_scope }] },
      });
      if (bMatch) targetBranchId = bMatch.id;
    }

    // Rule F: Overlapping holiday validation for same branch or company-wide
    const conflict = await prisma.$base().public_holidays.findFirst({
      where: {
        company_id: companyId,
        holiday_date: holDate,
        OR: [
          { branch_id: null },
          { branch_id: targetBranchId },
          ...(targetBranchId ? [{ branch_id: null }] : []),
        ],
      },
    });

    if (conflict) {
      const err = new Error(
        `Holiday conflict: A public holiday ('${conflict.name}') is already scheduled for date ${rawDate}.`
      );
      err.status = 400;
      err.code = 'HOLIDAY_DATE_CONFLICT';
      throw err;
    }

    const holiday = await prisma.$base().public_holidays.create({
      data: {
        company_id: companyId,
        branch_id: targetBranchId,
        name: data.name,
        name_ar: data.name_ar,
        holiday_date: holDate,
        year,
        created_by: userId,
        updated_by: userId,
      },
      include: { branch: true },
    });

    await auditService.logAction({
      companyId,
      userId,
      action: 'CREATE',
      entity: 'public_holidays',
      recordId: holiday.id,
      newValues: holiday,
    });

    return holiday;
  }

  async updatePublicHoliday({ companyId, id, data, userId }) {
    const old = await prisma.$base().public_holidays.findUnique({ where: { id } });
    if (!old || old.company_id !== companyId) {
      const err = new Error('Public holiday not found');
      err.status = 404;
      throw err;
    }

    const newDate = data.holiday_date ? new Date(data.holiday_date) : old.holiday_date;

    const updated = await prisma.$base().public_holidays.update({
      where: { id },
      data: {
        name: data.name !== undefined ? data.name : old.name,
        name_ar: data.name_ar !== undefined ? data.name_ar : old.name_ar,
        branch_id: data.branch_id !== undefined ? data.branch_id : old.branch_id,
        holiday_date: newDate,
        year: newDate.getFullYear(),
        updated_by: userId,
      },
      include: { branch: true },
    });

    await auditService.logAction({
      companyId,
      userId,
      action: 'UPDATE',
      entity: 'public_holidays',
      recordId: id,
      oldValues: old,
      newValues: updated,
    });

    return updated;
  }

  async deletePublicHoliday({ companyId, id, userId }) {
    const holiday = await prisma.$base().public_holidays.findUnique({ where: { id } });
    if (!holiday || holiday.company_id !== companyId) {
      const err = new Error('Public holiday not found');
      err.status = 404;
      throw err;
    }

    await prisma.$base().public_holidays.delete({ where: { id } });

    await auditService.logAction({
      companyId,
      userId,
      action: 'DELETE',
      entity: 'public_holidays',
      recordId: id,
      oldValues: holiday,
    });

    return { success: true };
  }

  /**
   * 8. Salary Rules & Structures
   */
  async getSalaryStructures(companyId) {
    return prisma.$base().salary_structures.findMany({
      where: { company_id: companyId },
      include: {
        rules: { orderBy: { sequence: 'asc' } },
        _count: { select: { contracts: true } },
      },
      orderBy: { code: 'asc' },
    });
  }

  async getSalaryRules(companyId, structureId) {
    const where = { company_id: companyId };
    if (structureId) {
      where.structure_id = structureId;
    }
    return prisma.$base().salary_rules.findMany({
      where,
      include: {
        structure: { select: { id: true, code: true, name: true } },
        _count: { select: { payslip_lines: true } },
      },
      orderBy: { sequence: 'asc' },
    });
  }

  async createSalaryRule({ companyId, structureId, data, userId }) {
    const structure = await prisma.$base().salary_structures.findUnique({
      where: { id: structureId },
      include: { rules: { orderBy: { sequence: 'asc' } } },
    });

    if (!structure || structure.company_id !== companyId) {
      const err = new Error('Salary structure not found');
      err.status = 404;
      throw err;
    }

    const code = data.code.toUpperCase().trim();

    // Check unique rule code in structure
    if (structure.rules.some((r) => r.code === code)) {
      const err = new Error(`Salary rule code '${code}' already exists in this structure.`);
      err.status = 400;
      err.code = 'DUPLICATE_RULE_CODE';
      throw err;
    }

    // Rule A: Validate formula safety, whitelist and dependencies
    if (data.amount_type === 'Formula' && data.formula) {
      const earlierCodes = structure.rules
        .filter((r) => r.sequence < data.sequence)
        .map((r) => r.code);
      const laterCodes = structure.rules
        .filter((r) => r.sequence >= data.sequence)
        .map((r) => r.code);

      const validation = validateFormula(data.formula, {
        currentRuleCode: code,
        earlierRuleCodes: earlierCodes,
        laterRuleCodes: laterCodes,
      });

      if (!validation.valid) {
        const err = new Error(`Formula Validation Error: ${validation.error}`);
        err.status = 400;
        err.code = 'INVALID_FORMULA';
        throw err;
      }
    }

    const rule = await prisma.$base().salary_rules.create({
      data: {
        company_id: companyId,
        structure_id: structureId,
        code,
        name: data.name,
        category: data.category,
        sequence: data.sequence,
        amount_type: data.amount_type || 'Formula',
        formula: data.formula || null,
        appears_on_payslip: data.appears_on_payslip !== undefined ? data.appears_on_payslip : true,
        is_pensionable: data.is_pensionable !== undefined ? data.is_pensionable : false,
        debit_account: data.debit_account || null,
        credit_account: data.credit_account || null,
        effective_from: data.effective_from ? new Date(data.effective_from) : new Date(),
        version: 1,
        created_by: userId,
        updated_by: userId,
      },
    });

    await this.recordVersion({
      companyId,
      entityType: 'salary_rule',
      entityId: rule.id,
      versionNo: 1,
      effectiveFrom: rule.effective_from,
      snapshot: rule,
      userId,
    });

    await auditService.logAction({
      companyId,
      userId,
      action: 'CREATE',
      entity: 'salary_rules',
      recordId: rule.id,
      newValues: rule,
    });

    return rule;
  }

  async updateSalaryRule({ companyId, id, data, userId, effectiveFrom, userRoles = [] }) {
    await this.assertNotLockedPeriod(companyId, effectiveFrom);

    const old = await prisma.$base().salary_rules.findUnique({
      where: { id },
      include: { structure: { include: { rules: { orderBy: { sequence: 'asc' } } } } },
    });

    if (!old || old.company_id !== companyId) {
      const err = new Error('Salary rule not found');
      err.status = 404;
      throw err;
    }

    // Rule D: Role Permission Check for Finance
    // Finance can ONLY update debit_account and credit_account
    const isOnlyFinance =
      userRoles.includes('FINANCE') &&
      !userRoles.includes('PAYROLL_OFFICER') &&
      !userRoles.includes('HR_MANAGER') &&
      !userRoles.includes('COMPANY_ADMIN');

    if (isOnlyFinance) {
      const allowedKeys = ['debit_account', 'credit_account'];
      const passedKeys = Object.keys(data);
      const invalidKeys = passedKeys.filter((k) => !allowedKeys.includes(k) && data[k] !== undefined);
      if (invalidKeys.length > 0) {
        const err = new Error(
          `Permission Denied (Section 5.3): Finance role is restricted to modifying debit and credit accounts only. Attempted: [${invalidKeys.join(', ')}]`
        );
        err.status = 403;
        err.code = 'FORBIDDEN_FINANCE_RESTRICTION';
        throw err;
      }
    }

    // Rule A: Validate formula safety if updated
    if (data.formula && data.formula !== old.formula) {
      const earlierCodes = old.structure.rules
        .filter((r) => r.sequence < (data.sequence || old.sequence) && r.id !== id)
        .map((r) => r.code);
      const laterCodes = old.structure.rules
        .filter((r) => r.sequence >= (data.sequence || old.sequence) && r.id !== id)
        .map((r) => r.code);

      const validation = validateFormula(data.formula, {
        currentRuleCode: old.code,
        earlierRuleCodes: earlierCodes,
        laterRuleCodes: laterCodes,
      });

      if (!validation.valid) {
        const err = new Error(`Formula Validation Error: ${validation.error}`);
        err.status = 400;
        err.code = 'INVALID_FORMULA';
        throw err;
      }
    }

    const nextVersion = (old.version || 1) + 1;

    const updated = await prisma.$base().salary_rules.update({
      where: { id },
      data: {
        name: data.name !== undefined ? data.name : old.name,
        category: data.category !== undefined ? data.category : old.category,
        sequence: data.sequence !== undefined ? data.sequence : old.sequence,
        amount_type: data.amount_type !== undefined ? data.amount_type : old.amount_type,
        formula: data.formula !== undefined ? data.formula : old.formula,
        appears_on_payslip: data.appears_on_payslip !== undefined ? data.appears_on_payslip : old.appears_on_payslip,
        is_pensionable: data.is_pensionable !== undefined ? data.is_pensionable : old.is_pensionable,
        debit_account: data.debit_account !== undefined ? data.debit_account : old.debit_account,
        credit_account: data.credit_account !== undefined ? data.credit_account : old.credit_account,
        is_active: data.is_active !== undefined ? data.is_active : old.is_active,
        effective_from: effectiveFrom ? new Date(effectiveFrom) : old.effective_from,
        version: nextVersion,
        updated_by: userId,
      },
    });

    await this.recordVersion({
      companyId,
      entityType: 'salary_rule',
      entityId: id,
      versionNo: nextVersion,
      effectiveFrom: updated.effective_from,
      snapshot: updated,
      userId,
    });

    await auditService.logAction({
      companyId,
      userId,
      action: 'UPDATE',
      entity: 'salary_rules',
      recordId: id,
      oldValues: old,
      newValues: updated,
    });

    return updated;
  }

  async deleteSalaryRule({ companyId, id, userId }) {
    const rule = await prisma.$base().salary_rules.findUnique({
      where: { id },
      include: {
        _count: { select: { payslip_lines: true } },
      },
    });

    if (!rule || rule.company_id !== companyId) {
      const err = new Error('Salary rule not found');
      err.status = 404;
      throw err;
    }

    // Rule E: Delete-in-use protection
    if (rule._count.payslip_lines > 0) {
      const err = new Error(
        `Cannot delete Salary Rule '${rule.code}': It is referenced in ${rule._count.payslip_lines} historical payslip line(s). Deactivate instead.`
      );
      err.status = 400;
      err.code = 'DELETE_IN_USE_BLOCKED';
      throw err;
    }

    await prisma.$base().salary_rules.delete({ where: { id } });

    await auditService.logAction({
      companyId,
      userId,
      action: 'DELETE',
      entity: 'salary_rules',
      recordId: id,
      oldValues: rule,
    });

    return { success: true };
  }

  /**
   * Rule B: "Test this rule" simulator panel
   */
  async testSalaryRules({ companyId, structureId, employeeContext }) {
    let rules = STATUTORY_UAE_DEFAULT_RULES;
    if (structureId) {
      const dbRules = await prisma.$base().salary_rules.findMany({
        where: { company_id: companyId, structure_id: structureId, is_active: true },
        orderBy: { sequence: 'asc' },
      });
      if (dbRules.length > 0) {
        rules = dbRules;
      }
    }

    const company = await prisma.$base().companies.findUnique({
      where: { id: companyId },
      select: {
        absence_divisor: true,
        gpssa_employee_rate: true,
        gpssa_employee_rate_legacy: true,
        gpssa_employee_rate_new: true,
        gpssa_employer_rate: true,
        gpssa_gov_share_rate: true,
        gpssa_min_salary: true,
        gpssa_max_salary: true,
      },
    });

    const fullContext = {
      absence_divisor: company?.absence_divisor || 'DIV_30',
      pension_rates: {
        employeeRate: company?.gpssa_employee_rate_legacy !== undefined ? Number(company.gpssa_employee_rate_legacy) : 5,
        employerRate: company?.gpssa_employer_rate !== undefined ? Number(company.gpssa_employer_rate) : 15,
        govShareRate: company?.gpssa_gov_share_rate !== undefined ? Number(company.gpssa_gov_share_rate) : 2.5,
      },
      ...employeeContext,
    };

    return executeRuleEngine(rules, fullContext);
  }

  /**
   * 9. Approval Settings
   */
  async getApprovalFlows(companyId) {
    return prisma.$base().approval_flows.findMany({
      where: { company_id: companyId },
      include: {
        steps: {
          orderBy: { step_no: 'asc' },
          include: { role: { select: { id: true, code: true, name: true } } },
        },
      },
      orderBy: { request_type: 'asc' },
    });
  }

  async updateApprovalFlow({ companyId, id, steps = [], userId }) {
    const flow = await prisma.$base().approval_flows.findUnique({
      where: { id },
      include: { steps: true },
    });

    if (!flow || flow.company_id !== companyId) {
      const err = new Error('Approval workflow not found');
      err.status = 404;
      throw err;
    }

    // Delete existing steps and recreate
    await prisma.$base().approval_flow_steps.deleteMany({ where: { flow_id: id } });

    const newSteps = await Promise.all(
      steps.map((s, index) =>
        prisma.$base().approval_flow_steps.create({
          data: {
            company_id: companyId,
            flow_id: id,
            step_no: index + 1,
            role_id: s.role_id,
            approver_rule: s.approver_rule || 'RoleOnly',
            is_conditional: s.is_conditional || false,
            condition_field: s.condition_field || null,
            condition_operator: s.condition_operator || null,
            condition_value: s.condition_value !== undefined ? new Decimal(s.condition_value) : null,
            created_by: userId,
            updated_by: userId,
          },
        })
      )
    );

    const updatedFlow = await prisma.$base().approval_flows.findUnique({
      where: { id },
      include: {
        steps: {
          orderBy: { step_no: 'asc' },
          include: { role: true },
        },
      },
    });

    await auditService.logAction({
      companyId,
      userId,
      action: 'UPDATE',
      entity: 'approval_flows',
      recordId: id,
      oldValues: flow,
      newValues: updatedFlow,
    });

    return updatedFlow;
  }

  /**
   * 10. Payroll Checks & Document Alerts
   */
  async getPayrollAlertSettings(companyId) {
    const company = await prisma.$base().companies.findUnique({
      where: { id: companyId },
      select: {
        default_cutoff_day: true,
        variance_threshold_pct: true,
        variance_threshold_aed: true,
        alert_days: true,
        document_digest_recipients: true,
        document_type_settings: true,
        absence_divisor: true,
        ot_multiplier_normal: true,
        ot_multiplier_night: true,
        ot_multiplier_rest: true,
        ot_multiplier_holiday: true,
        night_window_start: true,
        night_window_end: true,
        gpssa_employee_rate: true,
        gpssa_employer_rate: true,
        gpssa_max_salary: true,
      },
    });
    return company;
  }

  async updatePayrollAlertSettings({ companyId, data, userId, effectiveFrom }) {
    await this.assertNotLockedPeriod(companyId, effectiveFrom);

    const old = await prisma.$base().companies.findUnique({ where: { id: companyId } });

    const updated = await prisma.$base().companies.update({
      where: { id: companyId },
      data: {
        default_cutoff_day: data.default_cutoff_day !== undefined ? data.default_cutoff_day : old.default_cutoff_day,
        variance_threshold_pct: data.variance_threshold_pct !== undefined ? new Decimal(data.variance_threshold_pct) : old.variance_threshold_pct,
        variance_threshold_aed: data.variance_threshold_aed !== undefined ? new Decimal(data.variance_threshold_aed) : old.variance_threshold_aed,
        alert_days: data.alert_days !== undefined ? data.alert_days : old.alert_days,
        document_digest_recipients: data.document_digest_recipients !== undefined ? data.document_digest_recipients : old.document_digest_recipients,
        document_type_settings: data.document_type_settings !== undefined ? data.document_type_settings : old.document_type_settings,
        absence_divisor: data.absence_divisor !== undefined ? data.absence_divisor : old.absence_divisor,
        ot_multiplier_normal: data.ot_multiplier_normal !== undefined ? new Decimal(data.ot_multiplier_normal) : old.ot_multiplier_normal,
        ot_multiplier_night: data.ot_multiplier_night !== undefined ? new Decimal(data.ot_multiplier_night) : old.ot_multiplier_night,
        ot_multiplier_rest: data.ot_multiplier_rest !== undefined ? new Decimal(data.ot_multiplier_rest) : old.ot_multiplier_rest,
        ot_multiplier_holiday: data.ot_multiplier_holiday !== undefined ? new Decimal(data.ot_multiplier_holiday) : old.ot_multiplier_holiday,
        night_window_start: data.night_window_start !== undefined ? data.night_window_start : old.night_window_start,
        night_window_end: data.night_window_end !== undefined ? data.night_window_end : old.night_window_end,
        gpssa_employee_rate: data.gpssa_employee_rate !== undefined ? new Decimal(data.gpssa_employee_rate) : old.gpssa_employee_rate,
        gpssa_employer_rate: data.gpssa_employer_rate !== undefined ? new Decimal(data.gpssa_employer_rate) : old.gpssa_employer_rate,
        gpssa_max_salary: data.gpssa_max_salary !== undefined ? new Decimal(data.gpssa_max_salary) : old.gpssa_max_salary,
        updated_by: userId,
      },
    });

    await auditService.logAction({
      companyId,
      userId,
      action: 'UPDATE',
      entity: 'payroll_settings',
      recordId: companyId,
      oldValues: old,
      newValues: updated,
    });

    return updated;
  }

  /**
   * Version History for any setting entity
   */
  async getVersionHistory({ companyId, entityType, entityId }) {
    return prisma.$base().settings_versions.findMany({
      where: {
        company_id: companyId,
        entity_type: entityType,
        entity_id: entityId,
      },
      orderBy: { version_no: 'desc' },
    });
  }

  /**
   * Rule G: Reset to UAE Defaults (Preview & Confirm)
   */
  async getResetDiff({ companyId, section }) {
    const diff = {
      section,
      current: {},
      defaults: {},
      changesCount: 0,
    };

    if (section === 'salary_rules') {
      const currentRules = await prisma.$base().salary_rules.findMany({
        where: { company_id: companyId },
        orderBy: { sequence: 'asc' },
      });
      diff.current = currentRules;
      diff.defaults = STATUTORY_UAE_DEFAULT_RULES;
      diff.changesCount = Math.abs(currentRules.length - STATUTORY_UAE_DEFAULT_RULES.length) || 1;
    } else if (section === 'holidays') {
      const currentHols = await prisma.$base().public_holidays.findMany({
        where: { company_id: companyId, year: 2026 },
      });
      diff.current = currentHols;
      diff.defaults = UAE_2026_PUBLIC_HOLIDAYS;
      diff.changesCount = Math.abs(currentHols.length - UAE_2026_PUBLIC_HOLIDAYS.length) || 1;
    } else if (section === 'payroll_checks') {
      const current = await this.getPayrollAlertSettings(companyId);
      diff.current = current;
      diff.defaults = {
        default_cutoff_day: 25,
        variance_threshold_pct: 5.0,
        variance_threshold_aed: 500.0,
        alert_days: [90, 60, 30],
        absence_divisor: 'DIV_30',
        ot_multiplier_normal: 1.25,
        ot_multiplier_night: 1.5,
        ot_multiplier_rest: 1.5,
        ot_multiplier_holiday: 1.5,
        gpssa_employee_rate: 5.0,
        gpssa_employer_rate: 12.5,
      };
      diff.changesCount = 3;
    }

    return diff;
  }

  async resetToDefaults({ companyId, section, userId }) {
    if (section === 'salary_rules') {
      let structure = await prisma.$base().salary_structures.findFirst({
        where: { company_id: companyId, code: 'STD_MONTHLY' },
      });

      if (!structure) {
        structure = await prisma.$base().salary_structures.create({
          data: {
            company_id: companyId,
            code: 'STD_MONTHLY',
            name: 'Standard Monthly Salary Structure',
            unpaid_entry_types: ['UnapprovedAbsence', 'UnpaidLeave'],
            created_by: userId,
            updated_by: userId,
          },
        });
      }

      // Clear existing rules in structure if not in locked pay runs
      await prisma.$base().salary_rules.deleteMany({
        where: { company_id: companyId, structure_id: structure.id },
      });

      const created = [];
      for (const r of STATUTORY_UAE_DEFAULT_RULES) {
        const rule = await prisma.$base().salary_rules.create({
          data: {
            company_id: companyId,
            structure_id: structure.id,
            code: r.code,
            name: r.name,
            category: r.category,
            sequence: r.sequence,
            amount_type: r.amount_type,
            formula: r.formula,
            appears_on_payslip: r.appears_on_payslip,
            debit_account: r.debit_account,
            credit_account: r.credit_account,
            version: 1,
            effective_from: new Date(),
            created_by: userId,
            updated_by: userId,
          },
        });
        created.push(rule);
      }

      await auditService.logAction({
        companyId,
        userId,
        action: 'UPDATE',
        entity: 'salary_rules',
        recordId: structure.id,
        newValues: { resetToDefaults: true, rulesCount: created.length },
      });

      return { success: true, count: created.length };
    }

    if (section === 'holidays') {
      const sanitizedUserId = (userId && typeof userId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId))
        ? userId
        : null;

      // Unlink attendance days before deleting public holidays to avoid foreign key violation
      await prisma.$base().attendance_days.updateMany({
        where: { company_id: companyId, public_holiday_id: { not: null } },
        data: { public_holiday_id: null },
      });

      await prisma.$base().public_holidays.deleteMany({
        where: { company_id: companyId, year: 2026 },
      });

      const created = [];
      for (const h of UAE_2026_PUBLIC_HOLIDAYS) {
        const holiday = await prisma.$base().public_holidays.create({
          data: {
            company_id: companyId,
            name: h.name,
            name_ar: h.name_ar,
            holiday_date: new Date(h.date),
            year: 2026,
            created_by: sanitizedUserId,
            updated_by: sanitizedUserId,
          },
        });
        created.push(holiday);
      }

      await auditService.logAction({
        companyId,
        userId,
        action: 'UPDATE',
        entity: 'public_holidays',
        recordId: companyId,
        newValues: { resetToDefaults: true, holidaysCount: created.length },
      });

      return { success: true, count: created.length };
    }

    if (section === 'payroll_checks') {
      const updated = await prisma.$base().companies.update({
        where: { id: companyId },
        data: {
          default_cutoff_day: 25,
          variance_threshold_pct: new Decimal(5.0),
          variance_threshold_aed: new Decimal(500.0),
          alert_days: [90, 60, 30],
          absence_divisor: 'DIV_30',
          ot_multiplier_normal: new Decimal(1.25),
          ot_multiplier_night: new Decimal(1.5),
          ot_multiplier_rest: new Decimal(1.5),
          ot_multiplier_holiday: new Decimal(1.5),
          gpssa_employee_rate: new Decimal(5.0),
          gpssa_employer_rate: new Decimal(12.5),
          updated_by: userId,
        },
      });

      await auditService.logAction({
        companyId,
        userId,
        action: 'UPDATE',
        entity: 'payroll_settings',
        recordId: companyId,
        newValues: updated,
      });

      return { success: true, updated };
    }

    throw new Error(`Unsupported reset section: '${section}'`);
  }
}

export default new SettingsService();
