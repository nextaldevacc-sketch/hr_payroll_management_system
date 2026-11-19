#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { parseArgs } from 'node:util';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import prisma from '../src/lib/prisma.js';
import authService from '../src/services/authService.js';
import { PayrollService } from '../src/services/payrollService.js';
import { generateValidUaeIban, validateUaeIban } from '../prisma/seed/employees.js';

export async function runDemoCompanySeed({
  name,
  employeesCount = 25,
  confirmDemo = false,
  isRemove = false,
  credentialsPath = 'demo-credentials.txt',
} = {}) {
  if (!confirmDemo) {
    const msg = '[REFUSED] The --confirm-demo flag is strictly required to execute demo company operations.';
    console.error(msg);
    const err = new Error(msg);
    err.code = 'CONFIRM_DEMO_REQUIRED';
    throw err;
  }

  if (!name || typeof name !== 'string' || !name.trim()) {
    const msg = '[REFUSED] A non-empty company --name is required.';
    console.error(msg);
    const err = new Error(msg);
    err.code = 'NAME_REQUIRED';
    throw err;
  }

  const companyName = name.trim();
  const slug = (companyName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10) + '-' + crypto.randomBytes(3).toString('hex'));

  // =========================================================================
  // REMOVAL MODE
  // =========================================================================
  if (isRemove) {
    console.log(`\n--- Safe Demo Company Removal: "${companyName}" ---`);
    const targetComp = await prisma.$base().companies.findFirst({
      where: { name: { equals: companyName, mode: 'insensitive' } },
    });

    if (!targetComp) {
      console.log(`[INFO] Company "${companyName}" does not exist. Nothing to remove.`);
      return { removed: false, reason: 'COMPANY_NOT_FOUND' };
    }

    const compId = targetComp.id;
    console.log(`Found target company ID: ${compId}. Initiating FK-safe cascade removal...`);

    let replicaModeEnabled = false;
    try {
      await prisma.$base().$executeRawUnsafe("SET session_replication_role = 'replica';");
      replicaModeEnabled = true;
    } catch (e) {
      console.warn('[NOTICE] Superuser replica mode not permitted. Falling back to trigger-safe purge.');
    }

    try {
      // 1. Employee Documents
      await prisma.$base().employee_documents.deleteMany({
        where: { employee: { company_id: compId } },
      });

      // 2. Biometric and Attendance Records
      await prisma.$base().punches.deleteMany({ where: { company_id: compId } });
      await prisma.$base().attendance_days.deleteMany({ where: { company_id: compId } });
      await prisma.$base().overtime_requests.deleteMany({ where: { company_id: compId } });
      await prisma.$base().attendance_requests.deleteMany({ where: { company_id: compId } });
      await prisma.$base().device_mappings.deleteMany({ where: { company_id: compId } });
      await prisma.$base().biometric_imports.deleteMany({ where: { company_id: compId } });

      // 3. Payroll, Pay Runs, Payslips, Adjustments
      await prisma.$base().payslip_lines.deleteMany({
        where: { payslip: { company_id: compId } },
      });
      await prisma.$base().payslips.deleteMany({ where: { company_id: compId } });
      await prisma.$base().pay_run_issues.deleteMany({
        where: { pay_run: { company_id: compId } },
      });
      await prisma.$base().pay_runs.deleteMany({ where: { company_id: compId } });
      await prisma.$base().salary_adjustments.deleteMany({ where: { company_id: compId } });

      // 4. Separations and Final Settlements
      await prisma.$base().clearance_items.deleteMany({
        where: { separation: { company_id: compId } },
      });
      await prisma.$base().final_settlements.deleteMany({ where: { company_id: compId } });
      await prisma.$base().separation_tasks.deleteMany({
        where: { separation: { company_id: compId } },
      });
      await prisma.$base().separations.deleteMany({ where: { company_id: compId } });

      // 5. Leave Requests, Allocations, Plans & Types
      await prisma.$base().leave_requests.deleteMany({ where: { company_id: compId } });
      await prisma.$base().leave_allocations.deleteMany({ where: { company_id: compId } });
      await prisma.$base().accrual_plans.deleteMany({ where: { company_id: compId } });
      await prisma.$base().leave_types.deleteMany({ where: { company_id: compId } });

      // 6. Contracts, Bank Accounts & Employees
      await prisma.$base().bank_accounts.deleteMany({ where: { company_id: compId } });
      await prisma.$base().contracts.deleteMany({ where: { company_id: compId } });
      await prisma.$base().users.updateMany({
        where: { company_id: compId },
        data: { employee_id: null },
      });
      await prisma.$base().employees.deleteMany({ where: { company_id: compId } });

      // 7. Salary Structures and Rules
      await prisma.$base().salary_rules.deleteMany({ where: { company_id: compId } });
      await prisma.$base().salary_structures.deleteMany({ where: { company_id: compId } });

      // 8. Approvals & Rejection Logs
      await prisma.$base().approval_rejections.deleteMany({ where: { company_id: compId } });
      await prisma.$base().approval_actions.deleteMany({ where: { company_id: compId } });
      await prisma.$base().approval_requests.deleteMany({ where: { company_id: compId } });
      await prisma.$base().approval_flow_steps.deleteMany({
        where: { flow: { company_id: compId } },
      });
      await prisma.$base().approval_flows.deleteMany({ where: { company_id: compId } });

      // 9. Shifts, Policies, Holidays
      await prisma.$base().penalty_steps.deleteMany({ where: { company_id: compId } });
      await prisma.$base().shifts.deleteMany({ where: { company_id: compId } });
      await prisma.$base().attendance_policies.deleteMany({ where: { company_id: compId } });
      await prisma.$base().public_holidays.deleteMany({ where: { company_id: compId } });

      // 10. Departments, Jobs, Branches, Visas
      await prisma.$base().jobs.deleteMany({ where: { company_id: compId } });
      await prisma.$base().departments.deleteMany({ where: { company_id: compId } });
      await prisma.$base().branches.deleteMany({ where: { company_id: compId } });
      await prisma.$base().company_visas.deleteMany({ where: { company_id: compId } });
      await prisma.$base().support_access_grants.deleteMany({ where: { company_id: compId } });

      // 11. User Roles & Users
      await prisma.$base().user_roles.deleteMany({ where: { company_id: compId } });
      const compUsers = await prisma.$base().users.findMany({ where: { company_id: compId } });
      for (const u of compUsers) {
        const userAuditCount = await prisma.$base().audit_logs.count({ where: { user_id: u.id } });
        if (userAuditCount > 0 && !replicaModeEnabled) {
          await prisma.$base().users.update({
            where: { id: u.id },
            data: { status: 'Inactive', email: `purged.${u.id}@demo-purged.local` },
          });
        } else {
          await prisma.$base().users.delete({ where: { id: u.id } });
        }
      }

      // 12. Company row & Audit log handling (Preserves Decree 33/2021 immutable audit log trail)
      const compAuditCount = await prisma.$base().audit_logs.count({ where: { company_id: compId } });
      if (compAuditCount > 0 && !replicaModeEnabled) {
        await prisma.$base().companies.update({
          where: { id: compId },
          data: {
            status: 'Inactive',
            name: `[PURGED DEMO] ${targetComp.name} (${Date.now()})`,
          },
        });
        console.log(`[COMPLIANCE NOTE] Preserved ${compAuditCount} immutable audit logs. Company marked inactive stub.`);
      } else {
        if (replicaModeEnabled) {
          await prisma.$base().audit_logs.deleteMany({ where: { company_id: compId } });
        }
        await prisma.$base().companies.delete({ where: { id: compId } });
        console.log(`[PURGE] Company record completely deleted.`);
      }
    } finally {
      if (replicaModeEnabled) {
        try {
          await prisma.$base().$executeRawUnsafe("SET session_replication_role = 'origin';");
        } catch {}
      }
    }

    console.log(`✅ Demo company "${companyName}" cleanly removed without touching other companies.`);
    return { removed: true, companyId: compId };
  }

  // =========================================================================
  // CREATION MODE
  // =========================================================================
  console.log(`\n--- Provisioning Additive Demo Company: "${companyName}" ---`);

  // Refuse if company with this name exists
  const existingCompany = await prisma.$base().companies.findFirst({
    where: { name: { equals: companyName, mode: 'insensitive' } },
  });
  if (existingCompany) {
    const msg = `[REFUSED] Company with name "${companyName}" already exists (ID: ${existingCompany.id}). Refusing to overwrite.`;
    console.error(msg);
    const err = new Error(msg);
    err.code = 'COMPANY_ALREADY_EXISTS';
    throw err;
  }

  // Verify system roles catalog
  const roles = await prisma.$base().roles.findMany();
  const rolesMap = {};
  for (const r of roles) rolesMap[r.code] = r;

  const requiredRoles = ['COMPANY_ADMIN', 'HR_MANAGER', 'HR_OFFICER', 'PAYROLL_OFFICER', 'GM', 'FINANCE', 'DEPT_MANAGER', 'EMPLOYEE'];
  for (const rCode of requiredRoles) {
    if (!rolesMap[rCode]) {
      const msg = `[REFUSED] System role "${rCode}" missing. Please run "npm run seed:system" first.`;
      console.error(msg);
      const err = new Error(msg);
      err.code = 'ROLE_MISSING';
      throw err;
    }
  }

  const credentialsLog = [];
  function recordCredential(roleName, email, password, notes = '') {
    credentialsLog.push({ roleName, email, password, notes });
  }

  const defaultPassword = 'Demo@' + crypto.randomBytes(4).toString('hex') + 'A9!';
  const passwordHash = await authService.hashPassword(defaultPassword);

  // 1. Create Company with require_privileged_mfa = false
  const company = await prisma.$base().companies.create({
    data: {
      name: companyName,
      name_ar: `شركة ${companyName}`,
      trade_license_no: `TL-${slug.toUpperCase()}-${Date.now().toString().slice(-6)}`,
      default_language: 'en',
      status: 'Active',
      default_cutoff_day: 25,
      variance_threshold_pct: 5.0,
      alert_days: [90, 60, 30],
      require_privileged_mfa: false, // CRITICAL: bypass TOTP for demo logins
    },
  });

  // 2. Create 2 Visas & 2 Branches
  const randHex = crypto.randomBytes(4).toString('hex').toUpperCase();
  const visa1 = await prisma.$base().company_visas.create({
    data: {
      company_id: company.id,
      name: `Visa 01 (MOHRE Dubai)`,
      mol_establishment_id: `MOL-${randHex}-1`,
      bank_routing_code: '033',
      emirate: 'Dubai',
    },
  });

  const branch1 = await prisma.$base().branches.create({
    data: {
      company_id: company.id,
      company_visa_id: visa1.id,
      name: 'Dubai Main Branch',
      name_ar: 'الفرع الرئيسي دبي',
      emirate: 'Dubai',
    },
  });

  const visa2 = await prisma.$base().company_visas.create({
    data: {
      company_id: company.id,
      name: `Visa 02 (DIFC Free Zone)`,
      mol_establishment_id: `MOL-${randHex}-2`,
      bank_routing_code: '003',
      emirate: 'Dubai',
    },
  });

  const branch2 = await prisma.$base().branches.create({
    data: {
      company_id: company.id,
      company_visa_id: visa2.id,
      name: 'DIFC Free Zone Branch',
      name_ar: 'فرع مركز دبي المالي العالمي',
      emirate: 'Dubai',
    },
  });

  // 3. Create 4 Departments
  const deptOps = await prisma.$base().departments.create({
    data: { company_id: company.id, name: 'Operations', name_ar: 'العمليات', cost_centre: 'CC-OPS' },
  });
  const deptHr = await prisma.$base().departments.create({
    data: { company_id: company.id, name: 'HR & Administration', name_ar: 'الموارد البشرية والإدارة', cost_centre: 'CC-HR' },
  });
  const deptFin = await prisma.$base().departments.create({
    data: { company_id: company.id, name: 'Finance & Accounts', name_ar: 'المالية والحسابات', cost_centre: 'CC-FIN' },
  });
  const deptEng = await prisma.$base().departments.create({
    data: { company_id: company.id, name: 'IT & Engineering', name_ar: 'تكنولوجيا المعلومات والهندسة', cost_centre: 'CC-ENG' },
  });
  const departmentsList = [deptOps, deptHr, deptFin, deptEng];

  // 4. Create Standard Jobs
  const jobOps = await prisma.$base().jobs.create({
    data: { company_id: company.id, title: 'Operations Specialist', title_ar: 'أخصائي عمليات', department_id: deptOps.id },
  });
  const jobHr = await prisma.$base().jobs.create({
    data: { company_id: company.id, title: 'Senior HR Officer', title_ar: 'مسؤول أول موارد بشرية', department_id: deptHr.id },
  });
  const jobFin = await prisma.$base().jobs.create({
    data: { company_id: company.id, title: 'Senior Accountant', title_ar: 'محاسب أول', department_id: deptFin.id },
  });
  const jobEng = await prisma.$base().jobs.create({
    data: { company_id: company.id, title: 'Software Engineer', title_ar: 'مهندس برمجيات', department_id: deptEng.id },
  });
  const jobGm = await prisma.$base().jobs.create({
    data: { company_id: company.id, title: 'General Manager', title_ar: 'المدير العام', department_id: deptOps.id },
  });
  const jobsList = [jobOps, jobHr, jobFin, jobEng];

  // 5. Shift, Attendance Policy & Penalty Steps
  const shift = await prisma.$base().shifts.create({
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

  const policy = await prisma.$base().attendance_policies.create({
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

  await prisma.$base().penalty_steps.createMany({
    data: [
      { company_id: company.id, policy_id: policy.id, applies_to: 'Late', occurrence_from: 1, min_minutes: 15, penalty_type: 'Warning', penalty_value: 0.00 },
      { company_id: company.id, policy_id: policy.id, applies_to: 'Late', occurrence_from: 2, min_minutes: 15, penalty_type: 'Warning', penalty_value: 0.00 },
      { company_id: company.id, policy_id: policy.id, applies_to: 'Late', occurrence_from: 3, min_minutes: 15, penalty_type: 'DeductionFraction', penalty_value: 0.25 },
      { company_id: company.id, policy_id: policy.id, applies_to: 'Late', occurrence_from: 4, min_minutes: 15, penalty_type: 'DeductionFraction', penalty_value: 0.50 },
    ],
  });

  // 6. UAE Statutory Leave Types & Accruals
  const leaveTypesDefs = [
    { code: 'ANNUAL', name: 'Annual Leave', name_ar: 'إجازة سنوية', is_paid: true, max_days_per_year: 30 },
    { code: 'SICK', name: 'Sick Leave', name_ar: 'إجازة مرضية', is_paid: true, max_days_per_year: 90 },
    { code: 'MATERNITY', name: 'Maternity Leave', name_ar: 'إجازة أمومة / وضع', is_paid: true, max_days_per_year: 60 },
    { code: 'PATERNITY', name: 'Paternity Leave', name_ar: 'إجازة أبوة', is_paid: true, max_days_per_year: 5 },
    { code: 'BEREAVEMENT', name: 'Bereavement Leave', name_ar: 'إجازة عزاء', is_paid: true, max_days_per_year: 5 },
    { code: 'STUDY', name: 'Study / Exam Leave', name_ar: 'إجازة دراسية وامتحانات', is_paid: true, max_days_per_year: 10 },
    { code: 'UNPAID', name: 'Unpaid Leave', name_ar: 'إجازة غير مدفوعة الأجر', is_paid: false, max_days_per_year: 365 },
  ];

  let annualLeaveType = null;
  for (const lt of leaveTypesDefs) {
    const createdLt = await prisma.$base().leave_types.create({
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
    if (lt.code === 'ANNUAL') annualLeaveType = createdLt;
  }

  await prisma.$base().accrual_plans.create({
    data: {
      company_id: company.id,
      leave_type_id: annualLeaveType.id,
      name: 'Standard UAE Annual Accrual (2.5 days/mo)',
      days_per_month: 2.5,
      start_after_months: 6,
      yearly_cap: 30,
      carry_over_max: 15,
    },
  });

  // 7. UAE Public Holidays 2026
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
    await prisma.$base().public_holidays.create({
      data: {
        company_id: company.id,
        holiday_date: new Date(h.date),
        name: h.name,
        name_ar: h.name_ar,
        year: 2026,
      },
    });
  }

  // 8. Salary Structure & Section 8.1 Statutory Rules
  const structure = await prisma.$base().salary_structures.create({
    data: {
      company_id: company.id,
      code: 'UAE_STD_60_40',
      name: 'UAE Standard 60/40 Structure',
      unpaid_entry_types: ['UNPAID_LEAVE', 'SICK_UNPAID'],
    },
  });

  const section81Rules = [
    { code: 'BASIC', name: 'Basic Salary', category: 'Basic', sequence: 10, amount_type: 'Formula', formula: 'contract.basic * paid_days / month_days' },
    { code: 'HRA', name: 'Housing Allowance', category: 'Allowance', sequence: 20, amount_type: 'Formula', formula: 'contract.housing * paid_days / month_days' },
    { code: 'TRA', name: 'Transport Allowance', category: 'Allowance', sequence: 30, amount_type: 'Formula', formula: 'contract.transport * paid_days / month_days' },
    { code: 'OTH', name: 'Other Allowance', category: 'Allowance', sequence: 40, amount_type: 'Formula', formula: 'contract.other_allowances * paid_days / month_days' },
    { code: 'GROSS', name: 'Gross Salary', category: 'Gross', sequence: 50, amount_type: 'Formula', formula: 'BASIC + HRA + TRA + OTH' },
    { code: 'OT_NORMAL', name: 'Normal Overtime (1.25x)', category: 'Allowance', sequence: 60, amount_type: 'Formula', formula: '(basic / 30 / 8) * 1.25 * ot_hours_normal' },
    { code: 'OT_NIGHT', name: 'Night Overtime 10pm-4am (1.50x)', category: 'Allowance', sequence: 70, amount_type: 'Formula', formula: '(basic / 30 / 8) * 1.5 * ot_hours_night' },
    { code: 'OT_REST', name: 'Rest Day / Holiday Overtime (1.50x)', category: 'Allowance', sequence: 80, amount_type: 'Formula', formula: '(basic / 30 / 8) * 1.5 * ot_hours_rest' },
    { code: 'ABS', name: 'Absence / Unpaid Leave', category: 'Deduction', sequence: 90, amount_type: 'Formula', formula: 'gross / 30 * absent_days' },
    { code: 'LATE', name: 'Late / Early-Out Penalty', category: 'Deduction', sequence: 100, amount_type: 'Formula', formula: '(basic / 30 / 8) * late_units' },
    { code: 'SICK_HALF', name: 'Sick Leave Days 16-45 (50%)', category: 'Deduction', sequence: 110, amount_type: 'Formula', formula: 'gross / 30 * 0.5 * sick_half_days' },
    { code: 'SICK_NONE', name: 'Sick Leave Days 46-90 (100%)', category: 'Deduction', sequence: 120, amount_type: 'Formula', formula: 'gross / 30 * 1.0 * sick_none_days' },
    { code: 'LOAN', name: 'Loan Recovery', category: 'Deduction', sequence: 130, amount_type: 'Formula', formula: 'loan_instalment' },
    { code: 'ADV', name: 'Salary Advance Recovery', category: 'Deduction', sequence: 140, amount_type: 'Formula', formula: 'adv_instalment' },
    { code: 'GPSSA_EE', name: 'GPSSA UAE National Pension (Employee Share)', category: 'Deduction', sequence: 150, amount_type: 'Formula', formula: 'gpssa_salary * gpssa_ee_rate' },
    { code: 'GPSSA_ER', name: 'GPSSA UAE National Pension (Employer Share)', category: 'CompanyContribution', sequence: 160, amount_type: 'Formula', formula: 'gpssa_salary * gpssa_er_rate' },
    { code: 'NET', name: 'Net Pay to WPS', category: 'Net', sequence: 170, amount_type: 'Formula', formula: 'GROSS + allowances - deductions' },
  ];

  for (const r of section81Rules) {
    await prisma.$base().salary_rules.create({
      data: {
        company_id: company.id,
        structure_id: structure.id,
        code: r.code,
        name: r.name,
        category: r.category,
        sequence: r.sequence,
        amount_type: r.amount_type,
        formula: r.formula,
        is_active: true,
      },
    });
  }

  // 9. Statutory Approval Flows
  const payrollFlow = await prisma.$base().approval_flows.create({
    data: { company_id: company.id, request_type: 'PAYROLL', name: 'Pay Run Finalization Flow', is_active: true },
  });
  await prisma.$base().approval_flow_steps.create({
    data: { company_id: company.id, flow_id: payrollFlow.id, step_no: 1, role_id: rolesMap['HR_MANAGER'].id, approver_rule: 'SpecificRole' },
  });
  await prisma.$base().approval_flow_steps.create({
    data: { company_id: company.id, flow_id: payrollFlow.id, step_no: 2, role_id: rolesMap['GM'].id, approver_rule: 'SpecificRole' },
  });

  const leaveFlow = await prisma.$base().approval_flows.create({
    data: { company_id: company.id, request_type: 'LEAVE', name: 'UAE Statutory Leave Approval Chain', is_active: true },
  });
  await prisma.$base().approval_flow_steps.create({
    data: { company_id: company.id, flow_id: leaveFlow.id, step_no: 1, role_id: rolesMap['DEPT_MANAGER'].id, approver_rule: 'SpecificRole' },
  });
  await prisma.$base().approval_flow_steps.create({
    data: { company_id: company.id, flow_id: leaveFlow.id, step_no: 2, role_id: rolesMap['HR_OFFICER'].id, approver_rule: 'SpecificRole' },
  });
  await prisma.$base().approval_flow_steps.create({
    data: { company_id: company.id, flow_id: leaveFlow.id, step_no: 3, role_id: rolesMap['GM'].id, approver_rule: 'SpecificRole' },
  });

  const otFlow = await prisma.$base().approval_flows.create({
    data: { company_id: company.id, request_type: 'OVERTIME', name: 'Overtime Dual Authorization Flow', is_active: true },
  });
  await prisma.$base().approval_flow_steps.create({
    data: { company_id: company.id, flow_id: otFlow.id, step_no: 1, role_id: rolesMap['DEPT_MANAGER'].id, approver_rule: 'SpecificRole' },
  });
  await prisma.$base().approval_flow_steps.create({
    data: { company_id: company.id, flow_id: otFlow.id, step_no: 2, role_id: rolesMap['HR_OFFICER'].id, approver_rule: 'SpecificRole' },
  });

  // 10. Provision the 8 Role Users
  const roleUsersConfig = [
    { key: 'COMPANY_ADMIN', email: `admin.${slug}@demo-nextal.test`, roleCode: 'COMPANY_ADMIN', scopeType: 'Company', scopeId: null, notes: 'Full Company Admin' },
    { key: 'HR_MANAGER', email: `hr.manager.${slug}@demo-nextal.test`, roleCode: 'HR_MANAGER', scopeType: 'Company', scopeId: null, notes: 'HR Executive & Salary Access' },
    { key: 'HR_OFFICER', email: `hr.officer.${slug}@demo-nextal.test`, roleCode: 'HR_OFFICER', scopeType: 'Company', scopeId: null, notes: 'All-Company HR Officer' },
    { key: 'HR_OFFICER_V2', email: `hr.officer2.${slug}@demo-nextal.test`, roleCode: 'HR_OFFICER', scopeType: 'CompanyVisa', scopeId: visa2.id, notes: 'Visa 02 (DIFC) Scoped HR Officer' },
    { key: 'PAYROLL_OFFICER', email: `payroll.${slug}@demo-nextal.test`, roleCode: 'PAYROLL_OFFICER', scopeType: 'Company', scopeId: null, notes: 'Payroll & SIF Officer' },
    { key: 'GM', email: `gm.${slug}@demo-nextal.test`, roleCode: 'GM', scopeType: 'Company', scopeId: null, notes: 'General Manager' },
    { key: 'FINANCE', email: `finance.${slug}@demo-nextal.test`, roleCode: 'FINANCE', scopeType: 'Company', scopeId: null, notes: 'Finance & Bank Disbursements' },
    { key: 'DEPT_MANAGER', email: `dept.manager.${slug}@demo-nextal.test`, roleCode: 'DEPT_MANAGER', scopeType: 'Department', scopeId: deptOps.id, notes: 'Operations Dept Manager' },
  ];

  const createdRoleUsers = {};
  for (const rc of roleUsersConfig) {
    const user = await prisma.$base().users.create({
      data: {
        company_id: company.id,
        email: rc.email,
        password_hash: passwordHash,
        status: 'Active',
        must_change_password: false,
      },
    });
    createdRoleUsers[rc.key] = user;

    await prisma.$base().user_roles.create({
      data: {
        company_id: company.id,
        user_id: user.id,
        role_id: rolesMap[rc.roleCode].id,
        scope_type: rc.scopeType,
        scope_id: rc.scopeId,
      },
    });

    recordCredential(rc.key, rc.email, defaultPassword, rc.notes);
  }

  // 11. Provision N Employees with EMPLOYEE logins on @demo-nextal.test
  const seededEmployees = [];
  const totalEmployeesToSeed = Math.max(1, parseInt(employeesCount, 10) || 25);

  const sampleNames = [
    { en: 'Rashid Al-Falasi', ar: 'راشد الفلاسي', nat: 'ARE', gender: 'Male' },
    { en: 'Fatima Al-Suwaidi', ar: 'فاطمة السويدي', nat: 'ARE', gender: 'Female' },
    { en: 'Mohammed Tariq', ar: 'محمد طارق', nat: 'EGY', gender: 'Male' },
    { en: 'Priya Sharma', ar: 'بريا شارما', nat: 'IND', gender: 'Female' },
    { en: 'Johnathan Miller', ar: 'جوناثان ميلر', nat: 'GBR', gender: 'Male' },
    { en: 'Aisha Al-Hashimi', ar: 'عائشة الهاشمي', nat: 'ARE', gender: 'Female' },
    { en: 'Bilal Khan', ar: 'بلال خان', nat: 'PAK', gender: 'Male' },
    { en: 'Maria Santos', ar: 'ماريا سانتوس', nat: 'PHL', gender: 'Female' },
    { en: 'Omar Al-Zaabi', ar: 'عمر الزعابي', nat: 'ARE', gender: 'Male' },
    { en: 'Nour El-Din', ar: 'نور الدين', nat: 'JOR', gender: 'Male' },
    { en: 'Zaid Mansoor', ar: 'زيد منصور', nat: 'SYR', gender: 'Male' },
    { en: 'Sarah Jenkins', ar: 'سارة جينكينز', nat: 'USA', gender: 'Female' },
    { en: 'Hamad Al-Kaabi', ar: 'حمد الكعبي', nat: 'ARE', gender: 'Male' },
    { en: 'Reem Al-Mazrouei', ar: 'ريم المزروعي', nat: 'ARE', gender: 'Female' },
    { en: 'Anand Kumar', ar: 'أناند كومار', nat: 'IND', gender: 'Male' },
  ];

  for (let i = 1; i <= totalEmployeesToSeed; i++) {
    const nameInfo = sampleNames[(i - 1) % sampleNames.length];
    const isVisa2 = (i % 4 === 0); // 25% of employees on Visa 2
    const targetVisa = isVisa2 ? visa2 : visa1;
    const targetBranch = isVisa2 ? branch2 : branch1;
    const targetDept = departmentsList[(i - 1) % departmentsList.length];
    const targetJob = jobsList[(i - 1) % jobsList.length];

    const empEmail = `emp${i}.${slug}@demo-nextal.test`;
    const empUser = await prisma.$base().users.create({
      data: {
        company_id: company.id,
        email: empEmail,
        password_hash: passwordHash,
        status: 'Active',
        must_change_password: false,
      },
    });

    await prisma.$base().user_roles.create({
      data: {
        company_id: company.id,
        user_id: empUser.id,
        role_id: rolesMap['EMPLOYEE'].id,
        scope_type: 'Company',
      },
    });

    const empCode = `EMP-${slug.slice(0, 3).toUpperCase()}-${String(i).padStart(3, '0')}`;
    const emiratesId = `784-199${(i % 10) + 1}-1${String(100000 + i).slice(-6)}-1`;
    const passportNo = `A${String(10000000 + i).slice(-8)}`;

    const emp = await prisma.$base().employees.create({
      data: {
        company_id: company.id,
        employee_code: empCode,
        name: `${nameInfo.en} ${i > sampleNames.length ? `(${i})` : ''}`.trim(),
        arabic_name: `${nameInfo.ar} ${i > sampleNames.length ? `(${i})` : ''}`.trim(),
        work_email: empEmail,
        company_visa_id: targetVisa.id,
        branch_id: targetBranch.id,
        status: 'Active',
        nationality: nameInfo.nat,
        residency_type: nameInfo.nat === 'ARE' ? 'UAENational' : 'Expat',
        gender: nameInfo.gender,
        joining_date: new Date('2024-01-15'),
      },
    });
    emp.user_id = empUser.id;
    seededEmployees.push(emp);

    await prisma.$base().users.update({
      where: { id: empUser.id },
      data: { employee_id: emp.id },
    });

    recordCredential('EMPLOYEE', empEmail, defaultPassword, `${emp.name} (${empCode})`);

    // Contract
    const gross = 6000 + ((i % 8) * 1500); // 6k - 16.5k
    const basic = Math.round(gross * 0.6);
    const housing = Math.round(gross * 0.25);
    const transport = Math.round(gross * 0.10);
    const other = gross - basic - housing - transport;

    await prisma.$base().contracts.create({
      data: {
        company_id: company.id,
        employee_id: emp.id,
        version_no: 1,
        effective_date: new Date('2024-01-15'),
        contract_type: 'Limited',
        start_date: new Date('2024-01-15'),
        job_id: targetJob.id,
        department_id: targetDept.id,
        shift_id: shift.id,
        attendance_policy_id: policy.id,
        structure_id: structure.id,
        basic,
        housing,
        transport,
        other_allowances: other,
        gross,
        status: 'Approved',
      },
    });

    // Bank Account: Mod-97 valid UAE IBAN
    const iban = generateValidUaeIban('033', 4000000000 + i);
    if (!validateUaeIban(iban)) {
      throw new Error(`Generated invalid UAE IBAN for employee ${empCode}: ${iban}`);
    }

    await prisma.$base().bank_accounts.create({
      data: {
        company_id: company.id,
        employee_id: emp.id,
        bank_name: 'Emirates NBD',
        iban,
        routing_code: 'ENBD001',
        salary_split_pct: 100.00,
        is_primary: true,
        is_active: true,
      },
    });

    // Device Mapping
    await prisma.$base().device_mappings.create({
      data: {
        company_id: company.id,
        device_code: `DEV-${slug.slice(0, 3).toUpperCase()}-${String(i).padStart(3, '0')}`,
        employee_id: emp.id,
      },
    });

    // Realistic UAE Documents (with alert spectrum: expired, <=30d, <=60d, <=90d)
    const baseNow = new Date();
    let eidExpiryDays = 240;
    let passportExpiryDays = 365;

    if (i === 1) eidExpiryDays = -5; // Expired 5 days ago
    else if (i === 2) eidExpiryDays = 20; // <= 30d
    else if (i === 3) eidExpiryDays = 45; // <= 60d
    else if (i === 4) eidExpiryDays = 75; // <= 90d

    const eidDate = new Date(baseNow.getTime() + eidExpiryDays * 86400000);
    const passDate = new Date(baseNow.getTime() + passportExpiryDays * 86400000);

    await prisma.$base().employee_documents.create({
      data: {
        company_id: company.id,
        employee_id: emp.id,
        doc_type: 'EMIRATES_ID',
        doc_number: emiratesId,
        expiry_date: eidDate,
        file_url: '/storage/documents/demo_placeholder.pdf',
        status: eidExpiryDays < 0 ? 'Expired' : 'Valid',
        verification_status: 'Verified',
      },
    });

    await prisma.$base().employee_documents.create({
      data: {
        company_id: company.id,
        employee_id: emp.id,
        doc_type: 'PASSPORT',
        doc_number: passportNo,
        expiry_date: passDate,
        file_url: '/storage/documents/demo_placeholder.pdf',
        status: passportExpiryDays < 0 ? 'Expired' : 'Valid',
        verification_status: 'Verified',
      },
    });
  }

  // Statutory UAE Annual Leave Allocations (30 days/yr under UAE Labour Law Article 29)
  if (annualLeaveType) {
    for (const emp of seededEmployees) {
      await prisma.$base().leave_allocations.create({
        data: {
          company_id: company.id,
          employee_id: emp.id,
          leave_type_id: annualLeaveType.id,
          allocation_type: 'Regular',
          days_allocated: 30.00,
          days_taken: 0.00,
          valid_from: new Date('2026-01-01'),
          valid_to: new Date('2026-12-31'),
        },
      });
    }
  }

  // 12. One Past Month of Attendance and Overtime (October 2026)
  console.log('Seeding one past month of attendance punches and overtime requests...');
  for (let d = 1; d <= 25; d++) {
    const dayStr = `2026-10-${String(d).padStart(2, '0')}`;
    const dateObj = new Date(dayStr);
    const dayOfWeek = dateObj.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue; // Skip weekends

    // Seed attendance day for first 5 employees
    for (let j = 0; j < Math.min(5, seededEmployees.length); j++) {
      const e = seededEmployees[j];
      await prisma.$base().attendance_days.create({
        data: {
          company_id: company.id,
          employee_id: e.id,
          shift_id: shift.id,
          work_date: dateObj,
          check_in: new Date(`${dayStr}T07:55:00Z`),
          check_out: new Date(`${dayStr}T17:05:00Z`),
          worked_hours: 8.00,
          net_hours: 8.00,
          day_type: 'WorkDay',
          review_status: 'Approved',
        },
      });
    }
  }

  // 2 Overtime Requests
  if (seededEmployees.length >= 2) {
    await prisma.$base().overtime_requests.create({
      data: {
        company_id: company.id,
        employee_id: seededEmployees[0].id,
        work_date: new Date('2026-10-15'),
        hours: 3.00,
        source: 'Attendance',
        ot_type: 'Normal',
        rate: 1.2500,
        compensation: 'Pay',
        status: 'Approved',
      },
    });

    await prisma.$base().overtime_requests.create({
      data: {
        company_id: company.id,
        employee_id: seededEmployees[1].id,
        work_date: new Date('2026-10-22'),
        hours: 2.00,
        source: 'Attendance',
        ot_type: 'Normal',
        rate: 1.2500,
        compensation: 'Pay',
        status: 'Approved',
      },
    });
  }

  // 13. One PAID Pay Run (October 2026 Regular Pay Run)
  console.log('Calculating and finalizing one PAID pay run for October 2026...');
  const payrollService = new PayrollService(prisma.$base());
  const payRun = await payrollService.createPayRun(
    company.id,
    {
      company_visa_id: visa1.id,
      period_month: '2026-10-01',
      cutoff_date: '2026-10-25',
      run_type: 'Regular',
    },
    createdRoleUsers['PAYROLL_OFFICER'].id
  );

  await payrollService.calculatePayRun(company.id, payRun.id, createdRoleUsers['PAYROLL_OFFICER'].id);
  await payrollService.validatePayRun(company.id, payRun.id, createdRoleUsers['HR_MANAGER'].id);
  await payrollService.lockPayRun(company.id, payRun.id, createdRoleUsers['GM'].id);
  await payrollService.markPayRunPaid(company.id, payRun.id, createdRoleUsers['FINANCE'].id);
  console.log(`Pay Run ${payRun.id} successfully locked and marked PAID.`);

  // 14. 2 Leave Requests (1 Approved past, 1 Pending future with approval_requests entry)
  if (seededEmployees.length >= 2) {
    await prisma.$base().leave_requests.create({
      data: {
        company_id: company.id,
        employee_id: seededEmployees[0].id,
        leave_type_id: annualLeaveType.id,
        date_from: new Date('2026-10-05'),
        date_to: new Date('2026-10-09'),
        days: 5.00,
        reason: 'Annual personal leave',
        status: 'Approved',
      },
    });

    const pendingLeave = await prisma.$base().leave_requests.create({
      data: {
        company_id: company.id,
        employee_id: seededEmployees[1].id,
        leave_type_id: annualLeaveType.id,
        date_from: new Date('2026-12-10'),
        date_to: new Date('2026-12-14'),
        days: 5.00,
        reason: 'Family visit abroad',
        status: 'Pending',
      },
    });

    await prisma.$base().approval_requests.create({
      data: {
        company_id: company.id,
        flow_id: leaveFlow.id,
        request_type: 'LEAVE',
        record_id: pendingLeave.id,
        requested_by: seededEmployees[1].user_id,
        status: 'Pending',
        current_step: 1, // Department Manager approval
        payload: {
          employee_id: seededEmployees[1].id,
          employee_name: seededEmployees[1].name,
          title: `Annual Leave Request (5 Days) - ${seededEmployees[1].name}`,
        },
      },
    });
  }

  // 15. 1 Salary Adjustment (Staff Loan)
  if (seededEmployees.length >= 1) {
    await prisma.$base().salary_adjustments.create({
      data: {
        company_id: company.id,
        employee_id: seededEmployees[0].id,
        type: 'Loan',
        total_amount: 6000.0,
        monthly_amount: 500.0,
        balance: 5500.0,
        start_month: new Date('2026-10-01'),
        status: 'Approved',
        reason: 'Education advance loan',
        created_by: createdRoleUsers['FINANCE'].id,
      },
    });
  }

  // 16. Write Credentials ONCE to credentials file (Strictly never logged to stdout)
  const fullCredsPath = path.resolve(process.cwd(), credentialsPath);
  let credContent = `================================================================================\n`;
  credContent += `Nextal HR & Payroll - Demo Company Credentials\n`;
  credContent += `Company Name: ${companyName}\n`;
  credContent += `Company ID  : ${company.id}\n`;
  credContent += `Generated   : ${new Date().toISOString()}\n`;
  credContent += `MFA Bypassed: YES (require_privileged_mfa = false)\n`;
  credContent += `================================================================================\n\n`;

  credContent += `--- PRIVILEGED ROLE LOGINS (8 ROLES) ---\n`;
  for (const c of credentialsLog.filter((x) => x.roleName !== 'EMPLOYEE')) {
    credContent += `${c.roleName.padEnd(18)} : ${c.email.padEnd(35)} | Password: ${c.password} (${c.notes})\n`;
  }

  credContent += `\n--- EMPLOYEE LOGINS (${totalEmployeesToSeed} EMPLOYEES) ---\n`;
  for (const c of credentialsLog.filter((x) => x.roleName === 'EMPLOYEE')) {
    credContent += `EMPLOYEE           : ${c.email.padEnd(35)} | Password: ${c.password} | ${c.notes}\n`;
  }

  fs.writeFileSync(fullCredsPath, credContent, { mode: 0o600 });
  console.log(`✅ Demo company "${companyName}" provisioned successfully.`);
  console.log(`  - 2 Visas & 2 Branches created`);
  console.log(`  - 4 Departments, Shifts, Leave Types, Salary Rules, and Approval Flows created`);
  console.log(`  - 8 Privileged Role Accounts created (TOTP bypassed)`);
  console.log(`  - ${totalEmployeesToSeed} Employees provisioned with mod-97 valid IBANs and valid Emirates IDs`);
  console.log(`  - 1 Paid Pay Run, 2 Overtime records, 2 Leave Requests, 1 Loan Adjustment seeded`);
  console.log(`  - Credentials written ONCE to ${credentialsPath} (strictly gitignored).\n`);

  return {
    success: true,
    companyId: company.id,
    companyName: company.name,
    employeesCount: totalEmployeesToSeed,
    credentialsFile: fullCredsPath,
  };
}

async function main() {
  const options = {
    name: { type: 'string', short: 'n' },
    employees: { type: 'string', default: '25' },
    'confirm-demo': { type: 'boolean' },
    remove: { type: 'boolean' },
    'credentials-file': { type: 'string', default: 'demo-credentials.txt' },
  };

  const { values } = parseArgs({ options, allowPositionals: true, strict: false });

  const name = values.name || process.argv[2];
  const employeesCount = parseInt(values.employees, 10) || 25;
  const confirmDemo = Boolean(values['confirm-demo']);
  const isRemove = Boolean(values.remove);
  const credentialsPath = values['credentials-file'] || 'demo-credentials.txt';

  try {
    await runDemoCompanySeed({
      name,
      employeesCount,
      confirmDemo,
      isRemove,
      credentialsPath,
    });
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Execution failed:', err.message);
    process.exit(1);
  } finally {
    await prisma.$base().$disconnect();
  }
}

if (process.argv[1] && process.argv[1].endsWith('seed-demo-company.mjs')) {
  main();
}
