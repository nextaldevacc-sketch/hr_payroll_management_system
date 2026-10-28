/**
 * UAE Salary Rule Codes and Categories
 * Section 8.1 & Section 9.1
 */

export const SALARY_RULE_CODES = {
  BASIC: 'BASIC',
  HRA: 'HRA',
  TRA: 'TRA',
  OTH: 'OTH',
  GROSS: 'GROSS',
  OT_NORMAL: 'OT_NORMAL',
  OT_NIGHT: 'OT_NIGHT',
  OT_REST: 'OT_REST',
  ABS: 'ABS',
  LATE: 'LATE',
  SICK_HALF: 'SICK_HALF',
  SICK_NONE: 'SICK_NONE',
  LOAN: 'LOAN',
  ADV: 'ADV',
  GPSSA_EE: 'GPSSA_EE',
  NET: 'NET'
};

export const RULE_CATEGORIES = {
  BASIC: 'Basic',
  ALLOWANCE: 'Allowance',
  GROSS: 'Gross',
  DEDUCTION: 'Deduction',
  NET: 'Net'
};

export const DEFAULT_SALARY_RULES = [
  { code: 'BASIC', name: 'Basic Salary', category: RULE_CATEGORIES.BASIC, sequence: 10, formula: 'contract.basic * paid_days / month_days' },
  { code: 'HRA', name: 'Housing Allowance', category: RULE_CATEGORIES.ALLOWANCE, sequence: 20, formula: 'contract.hra * paid_days / month_days' },
  { code: 'TRA', name: 'Transport Allowance', category: RULE_CATEGORIES.ALLOWANCE, sequence: 30, formula: 'contract.tra * paid_days / month_days' },
  { code: 'OTH', name: 'Other Allowance', category: RULE_CATEGORIES.ALLOWANCE, sequence: 40, formula: 'contract.oth * paid_days / month_days' },
  { code: 'GROSS', name: 'Gross Salary', category: RULE_CATEGORIES.GROSS, sequence: 50, formula: 'BASIC + HRA + TRA + OTH' },
  { code: 'OT_NORMAL', name: 'Normal Overtime (1.25x)', category: RULE_CATEGORIES.ALLOWANCE, sequence: 60, formula: '(basic / 30 / 8) * 1.25 * ot_hours' },
  { code: 'OT_NIGHT', name: 'Night Overtime (1.5x)', category: RULE_CATEGORIES.ALLOWANCE, sequence: 70, formula: '(basic / 30 / 8) * 1.5 * ot_night_hours' },
  { code: 'OT_REST', name: 'Rest Day / Holiday OT (1.5x)', category: RULE_CATEGORIES.ALLOWANCE, sequence: 80, formula: '(basic / 30 / 8) * 1.5 * ot_rest_hours' },
  { code: 'ABS', name: 'Unapproved Absence', category: RULE_CATEGORIES.DEDUCTION, sequence: 90, formula: 'gross / 30 * absent_days' },
  { code: 'LATE', name: 'Late / Early-Out Penalty', category: RULE_CATEGORIES.DEDUCTION, sequence: 100, formula: 'policy_late_deduction' },
  { code: 'SICK_HALF', name: 'Sick Leave (Days 16-45, 50%)', category: RULE_CATEGORIES.DEDUCTION, sequence: 110, formula: 'gross / 30 * 0.5 * sick_half_days' },
  { code: 'SICK_NONE', name: 'Sick Leave (Days 46-90, 100%)', category: RULE_CATEGORIES.DEDUCTION, sequence: 120, formula: 'gross / 30 * 1.0 * sick_unpaid_days' },
  { code: 'LOAN', name: 'Loan Recovery', category: RULE_CATEGORIES.DEDUCTION, sequence: 130, formula: 'loan_installment' },
  { code: 'ADV', name: 'Salary Advance Recovery', category: RULE_CATEGORIES.DEDUCTION, sequence: 140, formula: 'advance_amount' },
  { code: 'GPSSA_EE', name: 'GPSSA Pension (UAE National EE)', category: RULE_CATEGORIES.DEDUCTION, sequence: 150, formula: 'gpssa_salary * gpssa_ee_rate' },
  { code: 'GPSSA_ER', name: 'GPSSA Pension (Employer Share)', category: 'CompanyContribution', sequence: 160, formula: 'gpssa_salary * gpssa_er_rate' },
  { code: 'NET', name: 'Net Pay to WPS', category: RULE_CATEGORIES.NET, sequence: 200, formula: 'GROSS + allowances - deductions' }
];
