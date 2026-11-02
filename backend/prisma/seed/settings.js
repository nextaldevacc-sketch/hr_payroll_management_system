/**
 * Seed Module: Settings
 * Approvals, Shifts, Policies, Holidays, Leave Types, Accrual Plans, Salary Rules
 */
export async function seedSettings(prisma, { company1, company2, rolesMap }) {
  // 1. Approval Flows for Company 1
  console.log('Seeding approval flows for Company 1...');
  const leaveFlow1 = await prisma.approval_flows.create({
    data: {
      company_id: company1.id,
      request_type: 'Leave',
      name: 'Standard Leave Approval Flow',
      priority: 1,
      is_active: true,
    },
  });
  await prisma.approval_flow_steps.createMany({
    data: [
      { company_id: company1.id, flow_id: leaveFlow1.id, step_no: 1, role_id: rolesMap['HR_MANAGER'].id, approver_rule: 'SpecificRole' },
      { company_id: company1.id, flow_id: leaveFlow1.id, step_no: 2, role_id: rolesMap['GM'].id, approver_rule: 'SpecificRole' },
    ],
  });

  const otFlow1 = await prisma.approval_flows.create({
    data: {
      company_id: company1.id,
      request_type: 'Overtime',
      name: 'Overtime Approval Flow',
      priority: 1,
      is_active: true,
    },
  });
  await prisma.approval_flow_steps.create({
    data: {
      company_id: company1.id,
      flow_id: otFlow1.id,
      step_no: 1,
      role_id: rolesMap['HR_MANAGER'].id,
      approver_rule: 'SpecificRole',
    },
  });

  const payRunFlow1 = await prisma.approval_flows.create({
    data: {
      company_id: company1.id,
      request_type: 'PayRun',
      name: 'Pay Run Signoff Flow',
      priority: 1,
      is_active: true,
    },
  });
  await prisma.approval_flow_steps.createMany({
    data: [
      { company_id: company1.id, flow_id: payRunFlow1.id, step_no: 1, role_id: rolesMap['FINANCE'].id, approver_rule: 'SpecificRole' },
      { company_id: company1.id, flow_id: payRunFlow1.id, step_no: 2, role_id: rolesMap['GM'].id, approver_rule: 'SpecificRole' },
    ],
  });

  const separationFlow1 = await prisma.approval_flows.create({
    data: {
      company_id: company1.id,
      request_type: 'Separation',
      name: 'Separation & Exit Approval Flow',
      priority: 1,
      is_active: true,
    },
  });
  await prisma.approval_flow_steps.create({
    data: {
      company_id: company1.id,
      flow_id: separationFlow1.id,
      step_no: 1,
      role_id: rolesMap['HR_MANAGER'].id,
      approver_rule: 'SpecificRole',
    },
  });

  // 2. Shifts & Policies for Company 1
  console.log('Seeding shifts and attendance policies for Company 1...');
  const shift1 = await prisma.shifts.create({
    data: {
      company_id: company1.id,
      name: 'Standard Office 8 to 5',
      start_time: '08:00:00',
      end_time: '17:00:00',
      break_minutes: 60,
      grace_minutes: 15,
      weekly_off_days: [0, 6], // Sunday & Saturday
      ramadan_start_time: '09:00:00',
      ramadan_end_time: '15:00:00',
    },
  });

  const policy1 = await prisma.attendance_policies.create({
    data: {
      company_id: company1.id,
      name: 'Default UAE Attendance Policy',
      late_grace_minutes: 15,
      early_out_grace_minutes: 15,
      ot_eligible: true,
      ot_min_minutes: 30,
      night_start: '22:00:00',
      night_end: '04:00:00',
    },
  });

  await prisma.penalty_steps.createMany({
    data: [
      { company_id: company1.id, policy_id: policy1.id, applies_to: 'Late', occurrence_from: 1, min_minutes: 15, penalty_type: 'Warning', penalty_value: 0.00 },
      { company_id: company1.id, policy_id: policy1.id, applies_to: 'Late', occurrence_from: 2, min_minutes: 15, penalty_type: 'Warning', penalty_value: 0.00 },
      { company_id: company1.id, policy_id: policy1.id, applies_to: 'Late', occurrence_from: 3, min_minutes: 15, penalty_type: 'DeductionFraction', penalty_value: 0.25 },
      { company_id: company1.id, policy_id: policy1.id, applies_to: 'Late', occurrence_from: 4, min_minutes: 15, penalty_type: 'DeductionFraction', penalty_value: 0.50 },
    ],
  });

  // 3. Public Holidays 2026 for Company 1
  console.log('Seeding UAE Public Holidays 2026...');
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
    await prisma.public_holidays.create({
      data: {
        company_id: company1.id,
        holiday_date: new Date(h.date),
        name: h.name,
        name_ar: h.name_ar,
        year: 2026,
      },
    });
  }

  // 4. Leave Types & Accruals for Company 1
  console.log('Seeding UAE Statutory Leave Types & Accruals...');
  const leaveDefs = [
    { code: 'ANNUAL', name: 'Annual Leave', name_ar: 'إجازة سنوية', is_paid: true, max_days_per_year: 30, needs_attachment: false },
    { code: 'SICK_FULL', name: 'Sick Leave (Full Pay)', name_ar: 'إجازة مرضية (مدفوعة بالكامل)', is_paid: true, max_days_per_year: 15, needs_attachment: true },
    { code: 'SICK_HALF', name: 'Sick Leave (Half Pay)', name_ar: 'إجازة مرضية (نصف أجر)', is_paid: true, max_days_per_year: 30, needs_attachment: true },
    { code: 'SICK_UNPAID', name: 'Sick Leave (Unpaid)', name_ar: 'إجازة مرضية (بدون أجر)', is_paid: false, max_days_per_year: 45, needs_attachment: true },
    { code: 'MATERNITY', name: 'Maternity Leave', name_ar: 'إجازة أمومة', is_paid: true, max_days_per_year: 60, needs_attachment: true },
    { code: 'PATERNITY', name: 'Paternity Leave', name_ar: 'إجازة أبوة', is_paid: true, max_days_per_year: 5, needs_attachment: true },
    { code: 'BEREAVEMENT', name: 'Bereavement Leave', name_ar: 'إجازة عزاء', is_paid: true, max_days_per_year: 5, needs_attachment: true },
    { code: 'STUDY', name: 'Study / Exam Leave', name_ar: 'إجازة دراسية وامتحانات', is_paid: true, max_days_per_year: 10, needs_attachment: true },
    { code: 'UNPAID', name: 'Unpaid Leave', name_ar: 'إجازة غير مدفوعة الأجر', is_paid: false, max_days_per_year: 365, needs_attachment: false },
  ];

  const leaveTypesMap1 = {};
  for (const lt of leaveDefs) {
    const leaveType = await prisma.leave_types.create({
      data: {
        company_id: company1.id,
        code: lt.code,
        name: lt.name,
        name_ar: lt.name_ar,
        is_paid: lt.is_paid,
        max_days_per_year: lt.max_days_per_year,
        needs_attachment: lt.needs_attachment,
      },
    });
    leaveTypesMap1[lt.code] = leaveType;
  }

  const accrualPlan1 = await prisma.accrual_plans.create({
    data: {
      company_id: company1.id,
      leave_type_id: leaveTypesMap1['ANNUAL'].id,
      name: 'Standard UAE Annual Accrual (2.5 days/mo)',
      days_per_month: 2.50,
      start_after_months: 6,
      yearly_cap: 30,
      carry_over_max: 15,
    },
  });

  // 5. Salary Structure & Rules for Company 1
  console.log('Seeding Salary Structure and Section 8.1 Salary Rules...');
  const salaryStructure1 = await prisma.salary_structures.create({
    data: {
      company_id: company1.id,
      code: 'UAE_STD_60_40',
      name: 'UAE Standard 60/40 Structure',
      unpaid_entry_types: ['UNPAID_LEAVE', 'SICK_UNPAID'],
    },
  });

  async function seedFullSection81SalaryRules(companyId, structureId) {
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

    const map = {};
    for (const r of section81Rules) {
      const rule = await prisma.salary_rules.create({
        data: {
          company_id: companyId,
          structure_id: structureId,
          code: r.code,
          name: r.name,
          category: r.category,
          sequence: r.sequence,
          amount_type: r.amount_type,
          formula: r.formula,
          appears_on_payslip: true,
          is_pensionable: ['BASIC', 'HRA'].includes(r.code),
        },
      });
      map[r.code] = rule;
    }
    return map;
  }

  const rulesMap1 = await seedFullSection81SalaryRules(company1.id, salaryStructure1.id);

  // Settings for Company 2
  const shift2 = await prisma.shifts.create({
    data: {
      company_id: company2.id,
      name: 'Retail Shift 9 to 6',
      start_time: '09:00:00',
      end_time: '18:00:00',
      break_minutes: 60,
      weekly_off_days: [5], // Friday off
    },
  });

  const policy2 = await prisma.attendance_policies.create({
    data: {
      company_id: company2.id,
      name: 'Horizon Attendance Policy',
      late_grace_minutes: 10,
      early_out_grace_minutes: 10,
      ot_eligible: false,
    },
  });

  const salaryStructure2 = await prisma.salary_structures.create({
    data: {
      company_id: company2.id,
      code: 'RETAIL_AUH_01',
      name: 'Horizon Retail Structure',
      unpaid_entry_types: ['UNPAID'],
    },
  });

  await seedFullSection81SalaryRules(company2.id, salaryStructure2.id);

  const leaveType2 = await prisma.leave_types.create({
    data: {
      company_id: company2.id,
      code: 'ANNUAL',
      name: 'Annual Leave',
      name_ar: 'إجازة سنوية',
      is_paid: true,
      max_days_per_year: 30,
    },
  });

  const accrualPlan2 = await prisma.accrual_plans.create({
    data: {
      company_id: company2.id,
      leave_type_id: leaveType2.id,
      name: 'Horizon Annual Accrual',
      days_per_month: 2.50,
      start_after_months: 6,
      yearly_cap: 30,
      carry_over_max: 10,
    },
  });

  return {
    shift1,
    policy1,
    leaveTypesMap1,
    accrualPlan1,
    salaryStructure1,
    rulesMap1,
    shift2,
    policy2,
    salaryStructure2,
    leaveType2,
    accrualPlan2,
  };
}

export default seedSettings;
