import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting Nextal HR & Payroll Database Seed ---');

  // --------------------------------------------------------------------------
  // 0. Clean up existing data for fresh idempotent seeding
  // --------------------------------------------------------------------------
  console.log('Cleaning existing demo data...');
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE 
      companies, 
      roles, 
      public_holidays, 
      leave_types, 
      accrual_plans 
    CASCADE;
  `);

  const passwordHash = await bcrypt.hash('Nextal@2026!', 10);

  // --------------------------------------------------------------------------
  // 1. Roles (Platform-wide catalog)
  // --------------------------------------------------------------------------
  console.log('Seeding roles...');
  const roleDefs = [
    { code: 'EMPLOYEE', name: 'Employee', sees_salary: false },
    { code: 'DEPT_MANAGER', name: 'Department Manager', sees_salary: false },
    { code: 'HR_OFFICER', name: 'HR Officer', sees_salary: false },
    { code: 'PAYROLL_OFFICER', name: 'Payroll Officer', sees_salary: true },
    { code: 'HR_MANAGER', name: 'HR Manager', sees_salary: true },
    { code: 'GM', name: 'General Manager', sees_salary: true },
    { code: 'FINANCE', name: 'Finance / Accounts', sees_salary: true },
    { code: 'COMPANY_ADMIN', name: 'Company Administrator', sees_salary: true },
  ];

  const rolesMap = {};
  for (const r of roleDefs) {
    const role = await prisma.roles.create({
      data: { code: r.code, name: r.name, sees_salary: r.sees_salary }
    });
    rolesMap[r.code] = role;
  }

  // --------------------------------------------------------------------------
  // 2. Company 1: Gulf Tech Logistics LLC (Dashboard Primary Demo Company)
  // --------------------------------------------------------------------------
  console.log('Seeding Company 1: Gulf Tech Logistics LLC...');
  const company1 = await prisma.companies.create({
    data: {
      name: 'Gulf Tech Logistics LLC',
      name_ar: 'شركة الخليج للتقنية اللوجستية ذ.م.م',
      trade_license_no: 'TL-DXB-98421',
      default_language: 'en',
      status: 'Active',
      default_cutoff_day: 25,
      variance_threshold_pct: 5.00,
      alert_days: [90, 60, 30],
    }
  });

  // Visas for Company 1 (Dual-visa setup: MOHRE Dubai & DIFC Freezone)
  const visa1_01 = await prisma.company_visas.create({
    data: {
      company_id: company1.id,
      name: 'Visa 01 (MOHRE Dubai)',
      mol_establishment_id: 'MOHRE-784-0129',
      bank_routing_code: 'ENBD001',
      emirate: 'Dubai'
    }
  });

  const visa1_02 = await prisma.company_visas.create({
    data: {
      company_id: company1.id,
      name: 'Visa 02 (DIFC Freezone)',
      mol_establishment_id: 'DIFC-892-4410',
      bank_routing_code: 'FAB002',
      emirate: 'Dubai'
    }
  });

  // Branches
  const branch1_main = await prisma.branches.create({
    data: {
      company_id: company1.id,
      company_visa_id: visa1_01.id,
      name: 'Dubai Headquarters (Al Quoz)',
      name_ar: 'المقر الرئيسي بدبي (القوز)',
      emirate: 'Dubai'
    }
  });

  const branch1_difc = await prisma.branches.create({
    data: {
      company_id: company1.id,
      company_visa_id: visa1_02.id,
      name: 'DIFC FinTech Hub',
      name_ar: 'مركز مركز دبي المالي العالمي للتقنية المالية',
      emirate: 'Dubai'
    }
  });

  // Departments
  const deptNames = [
    { name: 'Engineering', name_ar: 'الهندسة والبرمجيات', cost_centre: 'CC-ENG' },
    { name: 'Operations', name_ar: 'العمليات اللوجستية', cost_centre: 'CC-OPS' },
    { name: 'Logistics & Fleet', name_ar: 'الخدمات اللوجستية والأسطول', cost_centre: 'CC-LOG' },
    { name: 'HR & Admin', name_ar: 'الموارد البشرية والإدارة', cost_centre: 'CC-HR' },
    { name: 'Sales & Support', name_ar: 'المبيعات وخدمة العملاء', cost_centre: 'CC-SALES' },
  ];

  const depts1 = {};
  for (const d of deptNames) {
    const dept = await prisma.departments.create({
      data: {
        company_id: company1.id,
        name: d.name,
        name_ar: d.name_ar,
        cost_centre: d.cost_centre
      }
    });
    depts1[d.name] = dept;
  }

  // Jobs
  const jobEng = await prisma.jobs.create({
    data: { company_id: company1.id, department_id: depts1['Engineering'].id, title: 'Senior Software Engineer', title_ar: 'مهندس برمجيات أول', grade: 'L4' }
  });
  const jobOps = await prisma.jobs.create({
    data: { company_id: company1.id, department_id: depts1['Operations'].id, title: 'Operations Specialist', title_ar: 'أخصائي عمليات', grade: 'L3' }
  });
  const jobFleet = await prisma.jobs.create({
    data: { company_id: company1.id, department_id: depts1['Logistics & Fleet'].id, title: 'Fleet Supervisor', title_ar: 'مشرف أسطول', grade: 'L3' }
  });
  const jobHR = await prisma.jobs.create({
    data: { company_id: company1.id, department_id: depts1['HR & Admin'].id, title: 'HR Manager', title_ar: 'مدير الموارد البشرية', grade: 'M1' }
  });
  const jobSales = await prisma.jobs.create({
    data: { company_id: company1.id, department_id: depts1['Sales & Support'].id, title: 'Account Manager', title_ar: 'مدير حسابات', grade: 'L3' }
  });

  // Users for Company 1
  console.log('Seeding users and roles for Company 1...');
  const userAdmin1 = await prisma.users.create({
    data: {
      company_id: company1.id,
      email: 'admin@gulftech.ae',
      password_hash: passwordHash,
      status: 'Active'
    }
  });
  await prisma.user_roles.create({
    data: { company_id: company1.id, user_id: userAdmin1.id, role_id: rolesMap['COMPANY_ADMIN'].id }
  });

  const userHR1 = await prisma.users.create({
    data: {
      company_id: company1.id,
      email: 'hr@gulftech.ae',
      password_hash: passwordHash,
      status: 'Active'
    }
  });
  await prisma.user_roles.create({
    data: { company_id: company1.id, user_id: userHR1.id, role_id: rolesMap['HR_MANAGER'].id }
  });

  const userFinance1 = await prisma.users.create({
    data: {
      company_id: company1.id,
      email: 'finance@gulftech.ae',
      password_hash: passwordHash,
      status: 'Active'
    }
  });
  await prisma.user_roles.create({
    data: { company_id: company1.id, user_id: userFinance1.id, role_id: rolesMap['FINANCE'].id }
  });

  const userPayroll1 = await prisma.users.create({
    data: {
      company_id: company1.id,
      email: 'payroll@gulftech.ae',
      password_hash: passwordHash,
      status: 'Active'
    }
  });
  await prisma.user_roles.create({
    data: { company_id: company1.id, user_id: userPayroll1.id, role_id: rolesMap['PAYROLL_OFFICER'].id }
  });

  // Approval Flows for Company 1
  console.log('Seeding approval flows for Company 1...');
  const leaveFlow1 = await prisma.approval_flows.create({
    data: {
      company_id: company1.id,
      request_type: 'Leave',
      name: 'Standard Leave Approval Flow',
      priority: 1,
      is_active: true
    }
  });
  await prisma.approval_flow_steps.createMany({
    data: [
      {
        company_id: company1.id,
        flow_id: leaveFlow1.id,
        step_no: 1,
        role_id: rolesMap['HR_MANAGER'].id,
        approver_rule: 'SpecificRole'
      },
      {
        company_id: company1.id,
        flow_id: leaveFlow1.id,
        step_no: 2,
        role_id: rolesMap['COMPANY_ADMIN'].id,
        approver_rule: 'SpecificRole'
      }
    ]
  });

  const otFlow1 = await prisma.approval_flows.create({
    data: {
      company_id: company1.id,
      request_type: 'Overtime',
      name: 'Overtime Approval Flow',
      priority: 1,
      is_active: true
    }
  });
  await prisma.approval_flow_steps.create({
    data: {
      company_id: company1.id,
      flow_id: otFlow1.id,
      step_no: 1,
      role_id: rolesMap['HR_MANAGER'].id,
      approver_rule: 'SpecificRole'
    }
  });

  const payRunFlow1 = await prisma.approval_flows.create({
    data: {
      company_id: company1.id,
      request_type: 'PayRun',
      name: 'Pay Run Signoff Flow',
      priority: 1,
      is_active: true
    }
  });
  await prisma.approval_flow_steps.createMany({
    data: [
      {
        company_id: company1.id,
        flow_id: payRunFlow1.id,
        step_no: 1,
        role_id: rolesMap['FINANCE'].id,
        approver_rule: 'SpecificRole'
      },
      {
        company_id: company1.id,
        flow_id: payRunFlow1.id,
        step_no: 2,
        role_id: rolesMap['GM'].id,
        approver_rule: 'SpecificRole'
      }
    ]
  });

  // Shifts
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
      ramadan_end_time: '15:00:00'
    }
  });

  // Attendance Policy
  const policy1 = await prisma.attendance_policies.create({
    data: {
      company_id: company1.id,
      name: 'Default UAE Attendance Policy',
      late_grace_minutes: 15,
      early_out_grace_minutes: 15,
      ot_eligible: true,
      ot_min_minutes: 30,
      night_start: '22:00:00',
      night_end: '04:00:00'
    }
  });

  // Penalty Steps
  await prisma.penalty_steps.createMany({
    data: [
      { company_id: company1.id, policy_id: policy1.id, applies_to: 'Late', occurrence_from: 1, min_minutes: 15, penalty_type: 'Warning', penalty_value: 0.00 },
      { company_id: company1.id, policy_id: policy1.id, applies_to: 'Late', occurrence_from: 2, min_minutes: 15, penalty_type: 'Warning', penalty_value: 0.00 },
      { company_id: company1.id, policy_id: policy1.id, applies_to: 'Late', occurrence_from: 3, min_minutes: 15, penalty_type: 'DeductionFraction', penalty_value: 0.25 },
      { company_id: company1.id, policy_id: policy1.id, applies_to: 'Late', occurrence_from: 4, min_minutes: 15, penalty_type: 'DeductionFraction', penalty_value: 0.50 },
    ]
  });

  // UAE Public Holidays 2026
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
        year: 2026
      }
    });
  }

  // UAE Statutory Leave Types
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
        needs_attachment: lt.needs_attachment
      }
    });
    leaveTypesMap1[lt.code] = leaveType;
  }

  // Accrual Plan (2.5 days per month = 30 days per year UAE statutory)
  const accrualPlan1 = await prisma.accrual_plans.create({
    data: {
      company_id: company1.id,
      leave_type_id: leaveTypesMap1['ANNUAL'].id,
      name: 'Standard UAE Annual Accrual (2.5 days/mo)',
      days_per_month: 2.50,
      start_after_months: 6,
      yearly_cap: 30,
      carry_over_max: 15
    }
  });

  // Salary Structure (UAE Standard 60/40 Split)
  console.log('Seeding Salary Structure and Section 8.1 Salary Rules...');
  const salaryStructure1 = await prisma.salary_structures.create({
    data: {
      company_id: company1.id,
      code: 'UAE_STD_60_40',
      name: 'UAE Standard 60/40 Structure',
      unpaid_entry_types: ['UNPAID_LEAVE', 'SICK_UNPAID']
    }
  });

  // Helper to seed full 17 Section 8.1 Salary Rules per company
  async function seedFullSection81SalaryRules(companyId, structureId) {
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
      { code: 'GPSSA_EE', name: 'GPSSA UAE National Pension (Employee 5%)', category: 'Deduction', sequence: 150, amount_type: 'Percentage', formula: 'gross * 0.05' },
      { code: 'GPSSA_ER', name: 'GPSSA UAE National Pension (Employer 12.5%)', category: 'CompanyContribution', sequence: 160, amount_type: 'Percentage', formula: 'gross * 0.125' },
      { code: 'NET', name: 'Net Pay to WPS', category: 'Basic', sequence: 170, amount_type: 'Formula', formula: 'GROSS + earnings - deductions' },
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
          appears_on_payslip: true
        }
      });
      map[r.code] = rule;
    }
    return map;
  }

  const rulesMap1 = await seedFullSection81SalaryRules(company1.id, salaryStructure1.id);

  // --------------------------------------------------------------------------
  // Seed 42 Employees for Gulf Tech Logistics LLC (Dashboard Parity)
  // --------------------------------------------------------------------------
  console.log('Seeding 42 employees for Company 1...');
  const employeeNames = [
    { name: 'Rashid Al-Falasi', name_ar: 'راشد الفلاسي', nat: 'Emirati', gender: 'Male', uae: true, job: jobHR, dept: depts1['HR & Admin'], gross: 25000 },
    { name: 'Fatima Al-Mazrouei', name_ar: 'فاطمة المزروعي', nat: 'Emirati', gender: 'Female', uae: true, job: jobEng, dept: depts1['Engineering'], gross: 22000 },
    { name: 'Mansour Al-Ketbi', name_ar: 'منصور الكتبي', nat: 'Emirati', gender: 'Male', uae: true, job: jobOps, dept: depts1['Operations'], gross: 18000 },
    { name: 'Mariam Al-Zaabi', name_ar: 'مريم الزعابي', nat: 'Emirati', gender: 'Female', uae: true, job: jobSales, dept: depts1['Sales & Support'], gross: 19000 },
    { name: 'Alexander Wright', name_ar: 'ألكسندر رايت', nat: 'British', gender: 'Male', uae: false, job: jobEng, dept: depts1['Engineering'], gross: 16000 },
    { name: 'Rajesh Sharma', name_ar: 'راجيش شارما', nat: 'Indian', gender: 'Male', uae: false, job: jobEng, dept: depts1['Engineering'], gross: 14000 },
    { name: 'Sarah Jenkins', name_ar: 'سارة جينكينز', nat: 'British', gender: 'Female', uae: false, job: jobEng, dept: depts1['Engineering'], gross: 15500 },
    { name: 'Muhammad Tariq', name_ar: 'محمد طارق', nat: 'Pakistani', gender: 'Male', uae: false, job: jobOps, dept: depts1['Operations'], gross: 7500 },
    { name: 'Omar Farooq', name_ar: 'عمر فاروق', nat: 'Egyptian', gender: 'Male', uae: false, job: jobOps, dept: depts1['Operations'], gross: 8000 },
    { name: 'Kareem Abdelaziz', name_ar: 'كريم عبدالعزيز', nat: 'Egyptian', gender: 'Male', uae: false, job: jobSales, dept: depts1['Sales & Support'], gross: 8500 },
    { name: 'Vikram Patel', name_ar: 'فيكرام باتيل', nat: 'Indian', gender: 'Male', uae: false, job: jobFleet, dept: depts1['Logistics & Fleet'], gross: 6500 },
    { name: 'Anil Kumar', name_ar: 'أنيل كومار', nat: 'Indian', gender: 'Male', uae: false, job: jobFleet, dept: depts1['Logistics & Fleet'], gross: 6000 },
  ];

  const seededEmployees = [];
  const seededContracts = [];
  let totalSeededGross = 0;

  for (let i = 1; i <= 42; i++) {
    const code = `EMP-DXB-${String(i).padStart(3, '0')}`;
    const targetVisa = i <= 30 ? visa1_01 : visa1_02;
    const targetBranch = i <= 30 ? branch1_main : branch1_difc;

    const baseInfo = i <= employeeNames.length
      ? employeeNames[i - 1]
      : {
          name: `Logistics Associate ${i}`,
          name_ar: `مساعد لوجستي ${i}`,
          nat: i % 3 === 0 ? 'Filipino' : i % 2 === 0 ? 'Indian' : 'Pakistani',
          gender: i % 4 === 0 ? 'Female' : 'Male',
          uae: false,
          job: i % 2 === 0 ? jobFleet : jobOps,
          dept: i % 2 === 0 ? depts1['Logistics & Fleet'] : depts1['Operations'],
          gross: i <= 32 ? 5500 : 6000
        };

    const basic = Math.round(baseInfo.gross * 0.60);
    const housing = Math.round(baseInfo.gross * 0.30);
    const trans = Math.round(baseInfo.gross * 0.05);
    const oth = baseInfo.gross - (basic + housing + trans);
    const empGross = basic + housing + trans + oth;

    const emp = await prisma.employees.create({
      data: {
        company_id: company1.id,
        employee_code: code,
        name: baseInfo.name,
        arabic_name: baseInfo.name_ar,
        legal_name: baseInfo.name,
        status: i === 42 ? 'Archived' : 'Active', // 1 leaver
        joining_date: i >= 40 ? new Date('2026-10-01') : new Date('2024-01-15'), // 3 joiners in Oct 2026
        residency_type: (i <= 4 || baseInfo.uae) ? 'UAENational' : 'Expat',
        nationality: baseInfo.nat,
        gender: baseInfo.gender,
        birth_date: new Date('1990-05-15'),
        mohre_person_id: `MOHRE${String(1000000 + i)}`,
        company_visa_id: targetVisa.id,
        branch_id: targetBranch.id,
        work_email: `emp${i}@gulftech.ae`,
        mobile: `+97150${String(1000000 + i).substring(1)}`,
      }
    });
    seededEmployees.push(emp);

    // Contract
    const contract = await prisma.contracts.create({
      data: {
        company_id: company1.id,
        employee_id: emp.id,
        version_no: 1,
        effective_date: new Date('2024-01-15'),
        contract_type: 'Limited',
        start_date: new Date('2024-01-15'),
        job_id: baseInfo.job.id,
        department_id: baseInfo.dept.id,
        shift_id: shift1.id,
        attendance_policy_id: policy1.id,
        structure_id: salaryStructure1.id,
        basic: basic,
        housing: housing,
        transport: trans,
        other_allowances: oth,
        gross: empGross,
        status: 'Approved'
      }
    });
    seededContracts.push(contract);

    totalSeededGross += empGross;

    // Bank accounts: 40 valid, 1 missing IBAN (emp 41), 1 missing routing code (emp 42)
    // Matches WPS Readiness check on dashboard!
    const hasIban = i !== 41;
    const hasRouting = i !== 42;

    await prisma.bank_accounts.create({
      data: {
        company_id: company1.id,
        employee_id: emp.id,
        bank_name: 'Emirates NBD',
        iban: hasIban ? `AE${String(i).padStart(2, '0')}0331234567890123456` : '',
        routing_code: hasRouting ? 'ENBD001' : '',
        salary_split_pct: 100.00,
        is_primary: true,
        is_active: true
      }
    });

    // Device mapping
    await prisma.device_mappings.create({
      data: {
        company_id: company1.id,
        device_code: `DEV-${String(i).padStart(3, '0')}`,
        employee_id: emp.id
      }
    });

    // Documents (EmiratesID)
    const expiryOffset = (i * 17) % 180; // Days from now
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + expiryOffset);

    await prisma.employee_documents.create({
      data: {
        company_id: company1.id,
        employee_id: emp.id,
        doc_type: 'EmiratesID',
        doc_number: `784-1990-${String(1000000 + i).substring(1)}-1`,
        expiry_date: expiryDate,
        status: expiryOffset < 30 ? 'ExpiringSoon' : 'Valid'
      }
    });

    // Leave allocations
    await prisma.leave_allocations.create({
      data: {
        company_id: company1.id,
        employee_id: emp.id,
        leave_type_id: leaveTypesMap1['ANNUAL'].id,
        allocation_type: 'Regular',
        accrual_plan_id: accrualPlan1.id,
        days_allocated: 30.00,
        days_taken: (i % 5),
        valid_from: new Date('2026-01-01'),
        valid_to: new Date('2026-12-31')
      }
    });
  }

  // --------------------------------------------------------------------------
  // October 2026 Biometric Imports, Punches & Attendance Days
  // --------------------------------------------------------------------------
  console.log('Seeding October 2026 biometric punches and attendance records...');
  const bioImport = await prisma.biometric_imports.create({
    data: {
      company_id: company1.id,
      period_from: new Date('2026-10-01'),
      period_to: new Date('2026-10-31'),
      rows_total: 42 * 22 * 2,
      rows_imported: 42 * 22 * 2,
      rows_duplicate: 0,
      rows_unmapped: 0,
      imported_by: userHR1.id
    }
  });

  // Seed punches and attendance_days for all 42 employees across all working days of October 2026
  const punchesBatch = [];
  const attendanceBatch = [];

  for (let d = 1; d <= 31; d++) {
    const workDate = new Date(`2026-10-${String(d).padStart(2, '0')}`);
    const isWeekend = workDate.getDay() === 0 || workDate.getDay() === 6;

    if (!isWeekend) {
      for (let e = 0; e < 42; e++) {
        const emp = seededEmployees[e];
        const inTime = new Date(workDate);
        inTime.setHours(8, 0, 0);
        const outTime = new Date(workDate);
        outTime.setHours(17, 0, 0);

        punchesBatch.push({
          company_id: company1.id,
          import_id: bioImport.id,
          employee_id: emp.id,
          punched_at: inTime,
          direction: 'In'
        });

        punchesBatch.push({
          company_id: company1.id,
          import_id: bioImport.id,
          employee_id: emp.id,
          punched_at: outTime,
          direction: 'Out'
        });

        attendanceBatch.push({
          company_id: company1.id,
          employee_id: emp.id,
          work_date: workDate,
          shift_id: shift1.id,
          check_in: inTime,
          check_out: outTime,
          worked_hours: 9.00,
          break_deducted: 1.00,
          net_hours: 8.00,
          late_minutes: 0,
          early_out_minutes: 0,
          day_type: 'WorkDay',
          review_status: 'HRConfirmed'
        });
      }
    }
  }

  // Insert in batches of 500 for optimal performance
  for (let i = 0; i < punchesBatch.length; i += 500) {
    await prisma.punches.createMany({ data: punchesBatch.slice(i, i + 500) });
  }
  for (let i = 0; i < attendanceBatch.length; i += 500) {
    await prisma.attendance_days.createMany({ data: attendanceBatch.slice(i, i + 500) });
  }

  // --------------------------------------------------------------------------
  // Overtime Requests (Matching 196 hours, 8,420.50 AED from dashboard)
  // --------------------------------------------------------------------------
  console.log('Seeding overtime requests matching dashboard figures...');
  // Normal x1.25 (110h, 4200.00 AED)
  await prisma.overtime_requests.create({
    data: {
      company_id: company1.id,
      employee_id: seededEmployees[0].id,
      work_date: new Date('2026-10-12'),
      hours: 110.00,
      source: 'Attendance',
      ot_type: 'Normal',
      rate: 1.2500,
      compensation: 'Pay',
      status: 'Approved'
    }
  });

  // Night x1.5 (42h, 2016.00 AED)
  await prisma.overtime_requests.create({
    data: {
      company_id: company1.id,
      employee_id: seededEmployees[1].id,
      work_date: new Date('2026-10-14'),
      hours: 42.00,
      source: 'Attendance',
      ot_type: 'Night',
      rate: 1.5000,
      compensation: 'Pay',
      status: 'Approved'
    }
  });

  // Rest day x1.5 (20h, 1008.00 AED)
  await prisma.overtime_requests.create({
    data: {
      company_id: company1.id,
      employee_id: seededEmployees[2].id,
      work_date: new Date('2026-10-18'),
      hours: 20.00,
      source: 'Attendance',
      ot_type: 'RestDay',
      rate: 1.5000,
      compensation: 'Pay',
      status: 'Approved'
    }
  });

  // Holiday x1.5 (24h, 1196.50 AED)
  await prisma.overtime_requests.create({
    data: {
      company_id: company1.id,
      employee_id: seededEmployees[3].id,
      work_date: new Date('2026-10-20'),
      hours: 24.00,
      source: 'Attendance',
      ot_type: 'Holiday',
      rate: 1.5000,
      compensation: 'Pay',
      status: 'Approved'
    }
  });

  // --------------------------------------------------------------------------
  // October 2026 Pay Run (Matching dashboard netToWps 335,490.50 AED)
  // --------------------------------------------------------------------------
  console.log('Seeding October 2026 Pay Run, Payslips & Payslip Lines...');
  const payRun1 = await prisma.pay_runs.create({
    data: {
      company_id: company1.id,
      company_visa_id: visa1_01.id,
      run_type: 'Regular',
      period_month: new Date('2026-10-01'),
      cutoff_date: new Date('2026-10-25'),
      status: 'Calculated',
      calculated_at: new Date('2026-10-25T14:30:00Z')
    }
  });

  // Pay run issues (2 blocking issues from dashboard)
  await prisma.pay_run_issues.createMany({
    data: [
      {
        company_id: company1.id,
        pay_run_id: payRun1.id,
        employee_id: seededEmployees[40].id,
        issue_code: 'MISSING_IBAN',
        message: 'Employee has no IBAN on primary bank account',
        severity: 'Blocking'
      },
      {
        company_id: company1.id,
        pay_run_id: payRun1.id,
        employee_id: seededEmployees[41].id,
        issue_code: 'MISSING_ROUTING_CODE',
        message: 'Bank routing code missing for SIF file export',
        severity: 'Blocking'
      }
    ]
  });

  // Seed Payslips and Payslip Lines for all 42 employees
  // Overall Dashboard Targets:
  // Gross: 341,200.00 AED
  // Net to WPS: 335,490.50 AED
  // Additions (OT): +8,420.50 AED
  // Deductions (Absence/Pension): -14,130.00 AED
  for (let idx = 0; idx < 42; idx++) {
    const emp = seededEmployees[idx];
    const contract = seededContracts[idx];
    const basic = Number(contract.basic);
    const gross = Number(contract.gross);

    // Lines for this employee
    const linesToCreate = [];

    // 1. Basic line
    linesToCreate.push({
      salary_rule_id: rulesMap1['BASIC'].id,
      code: 'BASIC',
      name: 'Basic Salary',
      category: 'Basic',
      amount: basic
    });

    // 2. Housing allowance line
    const housing = Number(contract.housing || 0);
    if (housing > 0) {
      linesToCreate.push({
        salary_rule_id: rulesMap1['HRA'].id,
        code: 'HRA',
        name: 'Housing Allowance',
        category: 'Allowance',
        amount: housing
      });
    }

    // 3. Transport allowance line
    const transport = Number(contract.transport || 0);
    if (transport > 0) {
      linesToCreate.push({
        salary_rule_id: rulesMap1['TRA'].id,
        code: 'TRA',
        name: 'Transport Allowance',
        category: 'Allowance',
        amount: transport
      });
    }

    // 4. Other allowance line
    const other = Number(contract.other_allowances || 0);
    if (other > 0) {
      linesToCreate.push({
        salary_rule_id: rulesMap1['OTH'].id,
        code: 'OTH',
        name: 'Other Allowance',
        category: 'Allowance',
        amount: other
      });
    }

    // 5. Overtime lines (from approved overtime)
    if (idx === 0) {
      linesToCreate.push({
        salary_rule_id: rulesMap1['OT_NORMAL'].id,
        code: 'OT_NORMAL',
        name: 'Normal Overtime (1.25x)',
        category: 'Addition',
        amount: 4200.00
      });
    } else if (idx === 1) {
      linesToCreate.push({
        salary_rule_id: rulesMap1['OT_NIGHT'].id,
        code: 'OT_NIGHT',
        name: 'Night Overtime (1.50x)',
        category: 'Addition',
        amount: 2016.00
      });
    } else if (idx === 2) {
      linesToCreate.push({
        salary_rule_id: rulesMap1['OT_REST'].id,
        code: 'OT_REST',
        name: 'Rest Day Overtime (1.50x)',
        category: 'Addition',
        amount: 1008.00
      });
    } else if (idx === 3) {
      linesToCreate.push({
        salary_rule_id: rulesMap1['OT_REST'].id,
        code: 'OT_REST',
        name: 'Holiday Overtime (1.50x)',
        category: 'Addition',
        amount: 1196.50
      });
    }

    // 6. Deductions: Loans (Section 8.1 LOAN)
    if (idx === 5) {
      linesToCreate.push({
        salary_rule_id: rulesMap1['LOAN'].id,
        code: 'LOAN',
        name: 'Loan Recovery',
        category: 'Deduction',
        amount: 2000.00
      });
    } else if (idx === 6) {
      linesToCreate.push({
        salary_rule_id: rulesMap1['LOAN'].id,
        code: 'LOAN',
        name: 'Loan Recovery',
        category: 'Deduction',
        amount: 1500.00
      });
    } else if (idx === 7) {
      linesToCreate.push({
        salary_rule_id: rulesMap1['LOAN'].id,
        code: 'LOAN',
        name: 'Loan Recovery',
        category: 'Deduction',
        amount: 1000.00
      });
    }

    // 7. Deductions: Unapproved absence (Section 8.1 ABS)
    if (idx === 8) {
      linesToCreate.push({
        salary_rule_id: rulesMap1['ABS'].id,
        code: 'ABS',
        name: 'Absence / Unpaid Leave Deduction',
        category: 'Deduction',
        amount: 1590.00
      });
    } else if (idx === 9) {
      linesToCreate.push({
        salary_rule_id: rulesMap1['ABS'].id,
        code: 'ABS',
        name: 'Absence / Unpaid Leave Deduction',
        category: 'Deduction',
        amount: 1590.00
      });
    }

    // 8. Deductions: Late penalties (Section 8.1 LATE)
    if (idx === 10) {
      linesToCreate.push({
        salary_rule_id: rulesMap1['LATE'].id,
        code: 'LATE',
        name: 'Late Penalty Deduction',
        category: 'Deduction',
        amount: 250.00
      });
    } else if (idx === 11) {
      linesToCreate.push({
        salary_rule_id: rulesMap1['LATE'].id,
        code: 'LATE',
        name: 'Late Penalty Deduction',
        category: 'Deduction',
        amount: 200.00
      });
    }

    // 9. Deductions: Salary advance / other (Section 8.1 ADV)
    if (idx === 12) {
      linesToCreate.push({
        salary_rule_id: rulesMap1['ADV'].id,
        code: 'ADV',
        name: 'Salary Advance Recovery',
        category: 'Deduction',
        amount: 800.00
      });
    }

    // CALCULATE: payslip gross, deductions, and net derived directly from the sum of line amounts
    const computedGross = linesToCreate
      .filter(l => l.category !== 'Deduction' && l.category !== 'CompanyContribution')
      .reduce((sum, l) => sum + l.amount, 0);

    const computedDeductions = linesToCreate
      .filter(l => l.category === 'Deduction')
      .reduce((sum, l) => sum + l.amount, 0);

    const computedNet = computedGross - computedDeductions;

    const payslip = await prisma.payslips.create({
      data: {
        company_id: company1.id,
        pay_run_id: payRun1.id,
        employee_id: emp.id,
        contract_id: contract.id,
        period_from: new Date('2026-10-01'),
        period_to: new Date('2026-10-31'),
        paid_days: 30.00,
        worked_days: 22.00,
        basic: basic,
        gross: computedGross,
        total_deductions: computedDeductions,
        net: computedNet,
        status: 'Calculated'
      }
    });

    for (const line of linesToCreate) {
      await prisma.payslip_lines.create({
        data: {
          company_id: company1.id,
          payslip_id: payslip.id,
          salary_rule_id: line.salary_rule_id,
          code: line.code,
          name: line.name,
          amount: line.amount
        }
      });
    }
  }

  // Sample Leave Requests
  console.log('Seeding sample leave requests...');
  await prisma.leave_requests.create({
    data: {
      company_id: company1.id,
      employee_id: seededEmployees[4].id,
      leave_type_id: leaveTypesMap1['ANNUAL'].id,
      date_from: new Date('2026-10-26'),
      date_to: new Date('2026-10-30'),
      days: 5.00,
      reason: 'Annual family leave',
      status: 'Approved'
    }
  });

  await prisma.leave_requests.create({
    data: {
      company_id: company1.id,
      employee_id: seededEmployees[8].id,
      leave_type_id: leaveTypesMap1['SICK_FULL'].id,
      date_from: new Date('2026-10-22'),
      date_to: new Date('2026-10-23'),
      days: 2.00,
      reason: 'Seasonal flu',
      status: 'Approved'
    }
  });

  // Seed sample Audit Log entry
  console.log('Seeding initial audit logs...');
  await prisma.audit_logs.create({
    data: {
      company_id: company1.id,
      user_id: userAdmin1.id,
      action: 'CREATE',
      table_name: 'companies',
      record_id: company1.id,
      new_values: { name: company1.name, trade_license_no: company1.trade_license_no },
      ip_address: '127.0.0.1'
    }
  });

  await prisma.audit_logs.create({
    data: {
      company_id: company1.id,
      user_id: userHR1.id,
      action: 'CALCULATE',
      table_name: 'pay_runs',
      record_id: payRun1.id,
      new_values: { period_month: '2026-10-01', status: 'Calculated' },
      ip_address: '127.0.0.1'
    }
  });

  // --------------------------------------------------------------------------
  // 3. Company 2: Emirates Horizon Trading LLC (Second Demo Company for Multi-Tenant Testing)
  // --------------------------------------------------------------------------
  console.log('Seeding Company 2: Emirates Horizon Trading LLC...');
  const company2 = await prisma.companies.create({
    data: {
      name: 'Emirates Horizon Trading LLC',
      name_ar: 'شركة أفق الإمارات للتجارة ذ.م.م',
      trade_license_no: 'TL-AUH-55412',
      default_language: 'ar',
      status: 'Active',
      default_cutoff_day: 20,
      variance_threshold_pct: 5.00,
      alert_days: [90, 60, 30]
    }
  });

  const visa2 = await prisma.company_visas.create({
    data: {
      company_id: company2.id,
      name: 'Abu Dhabi Mainland Visa',
      mol_establishment_id: 'MOHRE-AUH-8821',
      bank_routing_code: 'ADCB001',
      emirate: 'Abu Dhabi'
    }
  });

  const branch2 = await prisma.branches.create({
    data: {
      company_id: company2.id,
      company_visa_id: visa2.id,
      name: 'Abu Dhabi Corniche Branch',
      name_ar: 'فرع كورنيش أبوظبي',
      emirate: 'Abu Dhabi'
    }
  });

  const dept2 = await prisma.departments.create({
    data: {
      company_id: company2.id,
      name: 'General Trading',
      name_ar: 'التجارة العامة',
      cost_centre: 'CC-AUH-01'
    }
  });

  const job2 = await prisma.jobs.create({
    data: {
      company_id: company2.id,
      department_id: dept2.id,
      title: 'Commercial Executive',
      title_ar: 'تنفيذي تجاري'
    }
  });

  // Users for Company 2
  const userAdmin2 = await prisma.users.create({
    data: {
      company_id: company2.id,
      email: 'admin@horizon.ae',
      password_hash: passwordHash,
      status: 'Active'
    }
  });
  await prisma.user_roles.create({
    data: { company_id: company2.id, user_id: userAdmin2.id, role_id: rolesMap['COMPANY_ADMIN'].id }
  });

  const userHR2 = await prisma.users.create({
    data: {
      company_id: company2.id,
      email: 'hr@horizon.ae',
      password_hash: passwordHash,
      status: 'Active'
    }
  });
  await prisma.user_roles.create({
    data: { company_id: company2.id, user_id: userHR2.id, role_id: rolesMap['HR_MANAGER'].id }
  });

  // Approval flow for Company 2
  const leaveFlow2 = await prisma.approval_flows.create({
    data: {
      company_id: company2.id,
      request_type: 'Leave',
      name: 'Horizon Leave Flow',
      priority: 1,
      is_active: true
    }
  });
  await prisma.approval_flow_steps.create({
    data: {
      company_id: company2.id,
      flow_id: leaveFlow2.id,
      step_no: 1,
      role_id: rolesMap['HR_MANAGER'].id,
      approver_rule: 'SpecificRole'
    }
  });

  const shift2 = await prisma.shifts.create({
    data: {
      company_id: company2.id,
      name: 'Retail Shift 9 to 6',
      start_time: '09:00:00',
      end_time: '18:00:00',
      break_minutes: 60,
      weekly_off_days: [5] // Friday off
    }
  });

  const policy2 = await prisma.attendance_policies.create({
    data: {
      company_id: company2.id,
      name: 'Horizon Attendance Policy',
      late_grace_minutes: 10,
      early_out_grace_minutes: 10,
      ot_eligible: false
    }
  });

  const salaryStructure2 = await prisma.salary_structures.create({
    data: {
      company_id: company2.id,
      code: 'RETAIL_AUH_01',
      name: 'Horizon Retail Structure',
      unpaid_entry_types: ['UNPAID']
    }
  });

  await seedFullSection81SalaryRules(company2.id, salaryStructure2.id);

  const leaveType2 = await prisma.leave_types.create({
    data: {
      company_id: company2.id,
      code: 'ANNUAL',
      name: 'Annual Leave',
      name_ar: 'إجازة سنوية',
      is_paid: true,
      max_days_per_year: 30
    }
  });

  const accrualPlan2 = await prisma.accrual_plans.create({
    data: {
      company_id: company2.id,
      leave_type_id: leaveType2.id,
      name: 'Horizon Annual Accrual',
      days_per_month: 2.50,
      start_after_months: 6,
      yearly_cap: 30,
      carry_over_max: 10
    }
  });

  // Seed 10 Employees for Company 2
  console.log('Seeding 10 employees for Company 2...');
  for (let j = 1; j <= 10; j++) {
    const code2 = `EMP-AUH-${String(j).padStart(3, '0')}`;
    const emp2 = await prisma.employees.create({
      data: {
        company_id: company2.id,
        employee_code: code2,
        name: `Horizon Specialist ${j}`,
        arabic_name: `أخصائي أفق ${j}`,
        status: 'Active',
        joining_date: new Date('2025-03-01'),
        residency_type: 'Expat',
        nationality: 'Jordanian',
        gender: j % 2 === 0 ? 'Female' : 'Male',
        company_visa_id: visa2.id,
        branch_id: branch2.id,
        work_email: `emp${j}@horizon.ae`
      }
    });

    await prisma.contracts.create({
      data: {
        company_id: company2.id,
        employee_id: emp2.id,
        version_no: 1,
        effective_date: new Date('2025-03-01'),
        contract_type: 'Limited',
        start_date: new Date('2025-03-01'),
        job_id: job2.id,
        department_id: dept2.id,
        shift_id: shift2.id,
        attendance_policy_id: policy2.id,
        structure_id: salaryStructure2.id,
        basic: 6000.00,
        housing: 2400.00,
        transport: 600.00,
        gross: 9000.00,
        status: 'Approved'
      }
    });

    await prisma.bank_accounts.create({
      data: {
        company_id: company2.id,
        employee_id: emp2.id,
        bank_name: 'Abu Dhabi Commercial Bank',
        iban: `AE${String(j).padStart(2, '0')}0031234567890123456`,
        routing_code: 'ADCB001',
        is_primary: true
      }
    });

    await prisma.leave_allocations.create({
      data: {
        company_id: company2.id,
        employee_id: emp2.id,
        leave_type_id: leaveType2.id,
        allocation_type: 'Regular',
        accrual_plan_id: accrualPlan2.id,
        days_allocated: 30.00,
        days_taken: 0,
        valid_from: new Date('2026-01-01'),
        valid_to: new Date('2026-12-31')
      }
    });
  }

  // --------------------------------------------------------------------------
  // Summary counts per table
  // --------------------------------------------------------------------------
  console.log('\n--- Database Seed Completed Successfully ---');
  console.log('Counting seeded rows per table across database...');

  const allModels = [
    'companies', 'company_visas', 'branches', 'departments', 'jobs', 'users', 'roles',
    'user_roles', 'support_access_grants', 'approval_flows', 'approval_flow_steps',
    'approval_requests', 'approval_actions', 'audit_logs', 'employees', 'contracts',
    'employee_documents', 'bank_accounts', 'shifts', 'attendance_policies', 'penalty_steps',
    'device_mappings', 'biometric_imports', 'punches', 'attendance_days', 'attendance_requests',
    'overtime_requests', 'public_holidays', 'leave_types', 'accrual_plans', 'leave_allocations',
    'leave_requests', 'salary_structures', 'salary_rules', 'pay_runs', 'pay_run_issues',
    'payslips', 'payslip_lines', 'salary_adjustments', 'separations', 'clearance_items',
    'final_settlements', 'separation_tasks'
  ];

  const counts = {};
  for (const t of allModels) {
    counts[t] = await prisma[t].count();
    console.log(`  ${t.padEnd(25)}: ${counts[t]} rows`);
  }

  return counts;
}

main()
  .catch((e) => {
    console.error('Seed execution error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
