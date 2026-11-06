import crypto from 'crypto';
import bcrypt from 'bcrypt';
import prisma from '../lib/prisma.js';
import auditService from './auditService.js';
import authService from './authService.js';
import { invalidateCompanySessions } from '../middleware/authCache.js';

export class CompanyService {
  constructor(client = prisma) {
    this.prisma = client;
  }

  /**
   * List all companies (for Platform Admin)
   */
  async listCompanies() {
    const companies = await this.prisma.$base().companies.findMany({
      include: {
        _count: {
          select: {
            employees: true,
            users: true,
            pay_runs: true,
          },
        },
        company_visas: {
          take: 1,
        },
        users: {
          where: {
            user_roles: {
              some: {
                role: { code: 'COMPANY_ADMIN' },
              },
            },
          },
          select: {
            id: true,
            email: true,
            status: true,
            last_login_at: true,
          },
          take: 1,
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return companies.map((c) => ({
      id: c.id,
      name: c.name,
      name_ar: c.name_ar,
      trade_license_no: c.trade_license_no,
      status: c.status,
      default_language: c.default_language,
      default_cutoff_day: c.default_cutoff_day,
      variance_threshold_pct: c.variance_threshold_pct,
      alert_days: c.alert_days,
      employee_count: c._count.employees,
      user_count: c._count.users,
      pay_run_count: c._count.pay_runs,
      admin: c.users[0] || null,
      primary_visa: c.company_visas[0] || null,
      created_at: c.created_at,
    }));
  }

  /**
   * Get single company details
   */
  async getCompany(companyId) {
    const company = await this.prisma.$base().companies.findUnique({
      where: { id: companyId },
      include: {
        company_visas: true,
        branches: true,
        departments: true,
        users: {
          include: {
            user_roles: {
              include: { role: true },
            },
          },
        },
        support_access_grants: {
          where: {
            revoked_at: null,
            ends_at: { gte: new Date() },
          },
          include: {
            platform_user: { select: { id: true, email: true } },
          },
        },
      },
    });

    if (!company) {
      const err = new Error('Company not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    return company;
  }

  /**
   * Create a new company with UAE defaults and invite company admin (FR-PL1)
   */
  async createCompanyWithDefaults({
    name,
    name_ar = null,
    trade_license_no,
    emirate = 'Dubai',
    mol_establishment_id,
    bank_routing_code = 'ENBD001',
    admin_email,
    admin_name = 'Company Admin',
    default_cutoff_day = 25,
    platformUserId = null,
  }) {
    if (!name || !trade_license_no || !admin_email || !mol_establishment_id) {
      const err = new Error('Name, trade license, admin email, and MOL establishment ID are required');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    const cleanEmail = admin_email.trim().toLowerCase();

    // Check email uniqueness
    const existingUser = await this.prisma.$base().users.findUnique({
      where: { email: cleanEmail },
    });
    if (existingUser) {
      const err = new Error(`User with email '${cleanEmail}' already exists`);
      err.status = 400;
      err.code = 'EMAIL_EXISTS';
      throw err;
    }

    // Check trade license uniqueness
    const existingCompany = await this.prisma.$base().companies.findUnique({
      where: { trade_license_no },
    });
    if (existingCompany) {
      const err = new Error(`Company with trade license '${trade_license_no}' already exists`);
      err.status = 400;
      err.code = 'LICENSE_EXISTS';
      throw err;
    }

    // 1. Create company
    const company = await this.prisma.$base().companies.create({
      data: {
        name,
        name_ar: name_ar || name,
        trade_license_no,
        default_language: 'en',
        status: 'Active',
        default_cutoff_day,
        variance_threshold_pct: 5.0,
        alert_days: [90, 60, 30],
      },
    });

    // 2. Create primary visa & branch
    const visa = await this.prisma.$base().company_visas.create({
      data: {
        company_id: company.id,
        name: `Visa 01 (${emirate} MOHRE)`,
        mol_establishment_id,
        bank_routing_code,
        emirate,
      },
    });

    const branch = await this.prisma.$base().branches.create({
      data: {
        company_id: company.id,
        company_visa_id: visa.id,
        name: 'Main Branch',
        name_ar: 'الفرع الرئيسي',
        emirate,
      },
    });

    // 3. Create default departments
    const deptOps = await this.prisma.$base().departments.create({
      data: {
        company_id: company.id,
        name: 'Operations',
        name_ar: 'العمليات',
        cost_centre: 'CC-OPS',
      },
    });

    const deptHR = await this.prisma.$base().departments.create({
      data: {
        company_id: company.id,
        name: 'HR & Administration',
        name_ar: 'الموارد البشرية والإدارة',
        cost_centre: 'CC-HR',
      },
    });

    // 4. Create standard shift & attendance policy
    const shift = await this.prisma.$base().shifts.create({
      data: {
        company_id: company.id,
        name: 'Standard Office 8 to 5',
        start_time: '08:00:00',
        end_time: '17:00:00',
        break_minutes: 60,
        grace_minutes: 15,
        weekly_off_days: [0, 6],
        ramadan_start_time: '09:00:00',
        ramadan_end_time: '15:00:00',
      },
    });

    await this.prisma.$base().attendance_policies.create({
      data: {
        company_id: company.id,
        name: 'UAE Statutory Attendance Policy',
        late_grace_minutes: 15,
        early_out_grace_minutes: 15,
        ot_eligible: true,
        ot_min_minutes: 30,
        night_start: '22:00:00',
        night_end: '04:00:00',
      },
    });

    // 5. Create UAE standard leave types & accrual plan
    const leaveTypes = [
      { code: 'ANNUAL', name: 'Annual Leave', name_ar: 'إجازة سنوية', is_paid: true, max_days_per_year: 30 },
      { code: 'SICK', name: 'Sick Leave', name_ar: 'إجازة مرضية', is_paid: true, max_days_per_year: 90 },
      { code: 'MATERNITY', name: 'Maternity Leave', name_ar: 'إجازة أمومة / وضع', is_paid: true, max_days_per_year: 60 },
      { code: 'PATERNITY', name: 'Paternity Leave', name_ar: 'إجازة أبوة', is_paid: true, max_days_per_year: 5 },
      { code: 'BEREAVEMENT', name: 'Bereavement Leave', name_ar: 'إجازة عزاء', is_paid: true, max_days_per_year: 5 },
      { code: 'STUDY', name: 'Study / Exam Leave', name_ar: 'إجازة دراسية وامتحانات', is_paid: true, max_days_per_year: 10 },
      { code: 'UNPAID', name: 'Unpaid Leave', name_ar: 'إجازة غير مدفوعة الأجر', is_paid: false, max_days_per_year: 365 },
    ];

    let annualLeaveId = null;
    for (const lt of leaveTypes) {
      const createdLt = await this.prisma.$base().leave_types.create({
        data: {
          company_id: company.id,
          code: lt.code,
          name: lt.name,
          name_ar: lt.name_ar,
          is_paid: lt.is_paid,
          max_days_per_year: lt.max_days_per_year,
          needs_attachment: lt.code !== 'ANNUAL',
        },
      });
      if (lt.code === 'ANNUAL') annualLeaveId = createdLt.id;
    }

    if (annualLeaveId) {
      await this.prisma.$base().accrual_plans.create({
        data: {
          company_id: company.id,
          leave_type_id: annualLeaveId,
          name: 'Standard UAE Annual Accrual (2.5 days/mo)',
          days_per_month: 2.5,
          start_after_months: 6,
          yearly_cap: 30,
          carry_over_max: 15,
        },
      });
    }

    // 5b. UAE Public Holidays 2026
    const uaeHolidays2026 = [
      { name: 'New Year Day', name_ar: 'رأس السنة الميلادية', date: '2026-01-01' },
      { name: 'Eid Al Fitr Day 1', name_ar: 'عيد الفطر - اليوم 1', date: '2026-03-20' },
      { name: 'Eid Al Fitr Day 2', name_ar: 'عيد الفطر - اليوم 2', date: '2026-03-21' },
      { name: 'Eid Al Fitr Day 3', name_ar: 'عيد الفطر - اليوم 3', date: '2026-03-22' },
      { name: 'Eid Al Fitr Day 4', name_ar: 'عيد الفطر - اليوم 4', date: '2026-03-23' },
      { name: 'Arafat Day', name_ar: 'وقفة عرفة', date: '2026-05-26' },
      { name: 'Eid Al Adha Day 1', name_ar: 'عيد الأضحى - اليوم 1', date: '2026-05-27' },
      { name: 'Eid Al Adha Day 2', name_ar: 'عيد الأضحى - اليوم 2', date: '2026-05-28' },
      { name: 'Eid Al Adha Day 3', name_ar: 'عيد الأضحى - اليوم 3', date: '2026-05-29' },
      { name: 'Islamic New Year', name_ar: 'رأس السنة الهجرية', date: '2026-06-16' },
      { name: 'Prophet Birthday', name_ar: 'المولد النبوي الشريف', date: '2026-08-25' },
      { name: 'UAE National Day 1', name_ar: 'اليوم الوطني - اليوم 1', date: '2026-12-02' },
      { name: 'UAE National Day 2', name_ar: 'اليوم الوطني - اليوم 2', date: '2026-12-03' },
    ];

    for (const h of uaeHolidays2026) {
      await this.prisma.$base().public_holidays.create({
        data: {
          company_id: company.id,
          holiday_date: new Date(h.date),
          name: h.name,
          name_ar: h.name_ar,
          year: 2026,
        },
      });
    }

    // 6. Create Salary Structure & 17 Section 8.1 Salary Rules
    const structure = await this.prisma.$base().salary_structures.create({
      data: {
        company_id: company.id,
        code: 'UAE_STD_60_40',
        name: 'UAE Standard 60/40 Structure',
        unpaid_entry_types: ['UNPAID_LEAVE', 'SICK_UNPAID'],
      },
    });

    const section81Rules = [
      { code: 'BASIC', name: 'Basic Salary', category: 'Basic', sequence: 10, amount_type: 'Percentage', formula: 'contract.basic * paid_days / month_days' },
      { code: 'HRA', name: 'Housing Allowance', category: 'Allowance', sequence: 20, amount_type: 'Percentage', formula: 'contract.housing * paid_days / month_days' },
      { code: 'TRA', name: 'Transport Allowance', category: 'Allowance', sequence: 30, amount_type: 'Percentage', formula: 'contract.transport * paid_days / month_days' },
      { code: 'OTH', name: 'Other Allowance', category: 'Allowance', sequence: 40, amount_type: 'Percentage', formula: 'contract.other_allowances * paid_days / month_days' },
      { code: 'GROSS', name: 'Gross Salary', category: 'Basic', sequence: 50, amount_type: 'Formula', formula: 'BASIC + all allowances' },
      { code: 'OT_NORMAL', name: 'Normal Overtime (1.25x)', category: 'Addition', sequence: 60, amount_type: 'Formula', formula: '(basic / 30 / 8) * 1.25 * approved OT hours' },
      { code: 'OT_NIGHT', name: 'Night Overtime 10pm-4am (1.50x)', category: 'Addition', sequence: 70, amount_type: 'Formula', formula: '(basic / 30 / 8) * 1.50 * hours' },
      { code: 'OT_REST', name: 'Rest Day / Holiday Overtime (1.50x)', category: 'Addition', sequence: 80, amount_type: 'Formula', formula: 'substitute day, or (basic / 30 / 8) * 1.50 * hours' },
      { code: 'ABS', name: 'Absence / Unpaid Leave', category: 'Deduction', sequence: 90, amount_type: 'Formula', formula: 'gross / 30 * days' },
      { code: 'LATE', name: 'Late / Early-Out Penalty', category: 'Deduction', sequence: 100, amount_type: 'Formula', formula: 'from attendance policy steps' },
      { code: 'SICK_HALF', name: 'Sick Leave Days 16-45 (50%)', category: 'Deduction', sequence: 110, amount_type: 'Formula', formula: '50% of daily gross' },
      { code: 'SICK_NONE', name: 'Sick Leave Days 46-90 (100%)', category: 'Deduction', sequence: 120, amount_type: 'Formula', formula: '100% deduction' },
      { code: 'LOAN', name: 'Loan Recovery', category: 'Deduction', sequence: 130, amount_type: 'Formula', formula: 'monthly instalment from Salary Adjustments' },
      { code: 'ADV', name: 'Salary Advance Recovery', category: 'Deduction', sequence: 140, amount_type: 'Formula', formula: 'monthly instalment from Salary Adjustments' },
      { code: 'GPSSA_EE', name: 'GPSSA UAE National Pension (Employee Share)', category: 'Deduction', sequence: 150, amount_type: 'Formula', formula: 'gpssa_salary * gpssa_ee_rate' },
      { code: 'GPSSA_ER', name: 'GPSSA UAE National Pension (Employer Share)', category: 'CompanyContribution', sequence: 160, amount_type: 'Formula', formula: 'gpssa_salary * gpssa_er_rate' },
      { code: 'NET', name: 'Net Pay to WPS', category: 'Basic', sequence: 170, amount_type: 'Formula', formula: 'GROSS + earnings - deductions' },
    ];

    for (const r of section81Rules) {
      await this.prisma.$base().salary_rules.create({
        data: {
          company_id: company.id,
          structure_id: structure.id,
          code: r.code,
          name: r.name,
          category: r.category,
          sequence: r.sequence,
          amount_type: r.amount_type,
          formula: r.formula,
          appears_on_payslip: true,
        },
      });
    }

    // 7. Get or verify Company Admin role
    const adminRole = await this.prisma.$base().roles.findUnique({
      where: { code: 'COMPANY_ADMIN' },
    });

    // 8. Create Company Admin user (status: Invited)
    const tempPassword = crypto.randomBytes(8).toString('hex') + 'A1!';
    const passwordHash = await authService.hashPassword(tempPassword);

    const adminUser = await this.prisma.$base().users.create({
      data: {
        company_id: company.id,
        email: cleanEmail,
        password_hash: passwordHash,
        status: 'Invited',
      },
    });

    if (adminRole) {
      await this.prisma.$base().user_roles.create({
        data: {
          company_id: company.id,
          user_id: adminUser.id,
          role_id: adminRole.id,
          scope_type: 'Company',
        },
      });
    }

    // 9. Generate Invite Token for initial login
    const inviteToken = await authService.generateInviteToken(adminUser);

    await auditService.log({
      companyId: company.id,
      userId: platformUserId,
      action: 'CREATE_COMPANY',
      tableName: 'companies',
      recordId: company.id,
      newValues: { name, trade_license_no, admin_email: cleanEmail },
    });

    return {
      company,
      adminUser: {
        id: adminUser.id,
        email: adminUser.email,
        status: adminUser.status,
      },
      inviteToken,
      inviteUrl: `/login?tab=invite&token=${inviteToken}`,
    };
  }

  /**
   * Suspend or Reactivate a company (FR-PL2)
   */
  async updateCompanyStatus({ companyId, status, platformUserId = null }) {
    if (!['Active', 'Suspended'].includes(status)) {
      const err = new Error("Status must be 'Active' or 'Suspended'");
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    const company = await this.prisma.$base().companies.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      const err = new Error('Company not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const updated = await this.prisma.$base().companies.update({
      where: { id: companyId },
      data: { status },
    });

    invalidateCompanySessions(companyId);

    await auditService.log({
      companyId,
      userId: platformUserId,
      action: status === 'Suspended' ? 'SUSPEND_COMPANY' : 'REACTIVATE_COMPANY',
      tableName: 'companies',
      recordId: companyId,
      oldValues: { status: company.status },
      newValues: { status },
    });

    return updated;
  }

  /**
   * List support access grants for a company
   */
  async listSupportAccessGrants({ companyId }) {
    return await this.prisma.$base().support_access_grants.findMany({
      where: { company_id: companyId },
      orderBy: { created_at: 'desc' },
      include: {
        platform_user: { select: { id: true, email: true, employee: { select: { name: true } } } },
        grantor: { select: { id: true, email: true, employee: { select: { name: true } } } },
      },
    });
  }

  /**
   * Check if a Platform Admin has an active, unrevoked support access grant (FR-PL3)
   */
  async checkSupportAccess({ companyId, platformUserId }) {
    const now = new Date();
    const grant = await this.prisma.$base().support_access_grants.findFirst({
      where: {
        company_id: companyId,
        platform_user_id: platformUserId,
        starts_at: { lte: now },
        ends_at: { gte: now },
        revoked_at: null,
      },
    });

    return Boolean(grant);
  }

  /**
   * Grant time-limited support access to a Platform Admin
   */
  async grantSupportAccess({
    companyId,
    platformUserId,
    grantedBy,
    reason = 'Technical customer support investigation',
    durationHours = 2,
  }) {
    const now = new Date();
    const endsAt = new Date(now.getTime() + durationHours * 60 * 60 * 1000);

    const grant = await this.prisma.$base().support_access_grants.create({
      data: {
        company_id: companyId,
        platform_user_id: platformUserId,
        granted_by: grantedBy,
        reason,
        starts_at: now,
        ends_at: endsAt,
      },
      include: {
        platform_user: { select: { id: true, email: true } },
        grantor: { select: { id: true, email: true } },
      },
    });

    await auditService.log({
      companyId,
      userId: grantedBy,
      action: 'GRANT_SUPPORT_ACCESS',
      tableName: 'support_access_grants',
      recordId: grant.id,
      newValues: { platformUserId, durationHours, endsAt, reason },
    });

    return grant;
  }

  /**
   * Revoke an active support access grant
   */
  async revokeSupportAccess({ grantId, revokedBy }) {
    const grant = await this.prisma.$base().support_access_grants.findUnique({
      where: { id: grantId },
    });

    if (!grant) {
      const err = new Error('Support grant not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const updated = await this.prisma.$base().support_access_grants.update({
      where: { id: grantId },
      data: { revoked_at: new Date() },
    });

    await auditService.log({
      companyId: grant.company_id,
      userId: revokedBy,
      action: 'REVOKE_SUPPORT_ACCESS',
      tableName: 'support_access_grants',
      recordId: grant.id,
      newValues: { revoked_at: updated.revoked_at },
    });

    return updated;
  }
}

export const companyService = new CompanyService();
export default companyService;
