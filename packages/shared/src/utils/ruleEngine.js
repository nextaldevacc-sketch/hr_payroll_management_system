import Decimal from 'decimal.js';
import { evaluateFormula, validateRuleStructureDependencies } from './formulaParser.js';
import { roundToCurrency, formatCurrency } from './money.js';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

/**
 * Standard 13 UAE Statutory Salary Rules (Section 8.1 & 9.1)
 */
export const STATUTORY_UAE_DEFAULT_RULES = [
  {
    code: 'BASIC',
    name: 'Basic Salary',
    category: 'Basic',
    sequence: 10,
    amount_type: 'Formula',
    formula: 'contract.basic * paid_days / month_days',
    appears_on_payslip: true,
    debit_account: '511000',
    credit_account: '211000',
  },
  {
    code: 'HRA',
    name: 'Housing Allowance',
    category: 'Allowance',
    sequence: 20,
    amount_type: 'Formula',
    formula: 'contract.hra * paid_days / month_days',
    appears_on_payslip: true,
    debit_account: '512000',
    credit_account: '211000',
  },
  {
    code: 'TRA',
    name: 'Transport Allowance',
    category: 'Allowance',
    sequence: 30,
    amount_type: 'Formula',
    formula: 'contract.tra * paid_days / month_days',
    appears_on_payslip: true,
    debit_account: '513000',
    credit_account: '211000',
  },
  {
    code: 'OTH',
    name: 'Other Allowance',
    category: 'Allowance',
    sequence: 40,
    amount_type: 'Formula',
    formula: 'contract.oth * paid_days / month_days',
    appears_on_payslip: true,
    debit_account: '514000',
    credit_account: '211000',
  },
  {
    code: 'GROSS',
    name: 'Gross Salary',
    category: 'Gross',
    sequence: 50,
    amount_type: 'Formula',
    formula: 'BASIC + HRA + TRA + OTH',
    appears_on_payslip: true,
    debit_account: null,
    credit_account: null,
  },
  {
    code: 'OT_NORMAL',
    name: 'Normal Overtime (1.25x)',
    category: 'Allowance',
    sequence: 60,
    amount_type: 'Formula',
    formula: '(basic / 30 / 8) * 1.25 * ot_hours_normal',
    appears_on_payslip: true,
    debit_account: '515000',
    credit_account: '211000',
  },
  {
    code: 'OT_NIGHT',
    name: 'Night Overtime (1.5x)',
    category: 'Allowance',
    sequence: 70,
    amount_type: 'Formula',
    formula: '(basic / 30 / 8) * 1.5 * ot_hours_night',
    appears_on_payslip: true,
    debit_account: '515000',
    credit_account: '211000',
  },
  {
    code: 'OT_REST',
    name: 'Rest Day / Holiday OT (1.5x)',
    category: 'Allowance',
    sequence: 80,
    amount_type: 'Formula',
    formula: '(basic / 30 / 8) * 1.5 * ot_hours_rest',
    appears_on_payslip: true,
    debit_account: '515000',
    credit_account: '211000',
  },
  {
    code: 'ABS',
    name: 'Unapproved Absence',
    category: 'Deduction',
    sequence: 90,
    amount_type: 'Formula',
    formula: 'gross / 30 * absent_days',
    appears_on_payslip: true,
    debit_account: '211000',
    credit_account: '519000',
  },
  {
    code: 'LATE',
    name: 'Late / Early-Out Penalty',
    category: 'Deduction',
    sequence: 100,
    amount_type: 'Formula',
    formula: '(basic / 30 / 8) * late_units',
    appears_on_payslip: true,
    debit_account: '211000',
    credit_account: '519000',
  },
  {
    code: 'SICK_HALF',
    name: 'Sick Leave (Days 16-45, 50%)',
    category: 'Deduction',
    sequence: 110,
    amount_type: 'Formula',
    formula: 'gross / 30 * 0.5 * sick_half_days',
    appears_on_payslip: true,
    debit_account: '211000',
    credit_account: '519000',
  },
  {
    code: 'SICK_NONE',
    name: 'Sick Leave (Days 46-90, 100%)',
    category: 'Deduction',
    sequence: 120,
    amount_type: 'Formula',
    formula: 'gross / 30 * 1.0 * sick_none_days',
    appears_on_payslip: true,
    debit_account: '211000',
    credit_account: '519000',
  },
  {
    code: 'LOAN',
    name: 'Loan Recovery',
    category: 'Deduction',
    sequence: 130,
    amount_type: 'Formula',
    formula: 'loan_instalment',
    appears_on_payslip: true,
    debit_account: '211000',
    credit_account: '115000',
  },
  {
    code: 'ADV',
    name: 'Salary Advance Recovery',
    category: 'Deduction',
    sequence: 140,
    amount_type: 'Formula',
    formula: 'adv_instalment',
    appears_on_payslip: true,
    debit_account: '211000',
    credit_account: '115000',
  },
  {
    code: 'GPSSA_EE',
    name: 'GPSSA Pension (Employee Share)',
    category: 'Deduction',
    sequence: 150,
    amount_type: 'Formula',
    formula: 'gpssa_salary * 0.05',
    appears_on_payslip: true,
    debit_account: '211000',
    credit_account: '212000',
  },
  {
    code: 'GPSSA_ER',
    name: 'GPSSA Pension (Employer Share)',
    category: 'CompanyContribution',
    sequence: 160,
    amount_type: 'Formula',
    formula: 'gpssa_salary * 0.15',
    appears_on_payslip: false,
    debit_account: '516000',
    credit_account: '212000',
  },
  {
    code: 'NET',
    name: 'Net Pay to WPS',
    category: 'Net',
    sequence: 170,
    amount_type: 'Formula',
    formula: 'GROSS + allowances - deductions',
    appears_on_payslip: true,
    debit_account: '211000',
    credit_account: '111000',
  },
];

/**
 * Executes a salary rule set for an employee's context step-by-step
 * @param {Array} rules - Array of salary rules to execute
 * @param {Object} inputContext - Monthly inputs for the employee
 * @returns {Object} Result breakdown with step-by-step lines and totals
 */
export function executeRuleEngine(rules = STATUTORY_UAE_DEFAULT_RULES, inputContext = {}) {
  // 1. Sort rules by sequence ascending
  const sortedRules = [...rules].sort((a, b) => a.sequence - b.sequence);

  // 2. Prepare execution context
  const context = {
    // Contract base values
    contract: {
      basic: new Decimal(inputContext.contract?.basic || inputContext.basic || 0),
      hra: new Decimal(inputContext.contract?.hra || inputContext.hra || 0),
      tra: new Decimal(inputContext.contract?.tra || inputContext.tra || 0),
      oth: new Decimal(inputContext.contract?.oth || inputContext.oth || 0),
    },
    basic: new Decimal(inputContext.contract?.basic || inputContext.basic || 0),
    hra: new Decimal(inputContext.contract?.hra || inputContext.hra || 0),
    tra: new Decimal(inputContext.contract?.tra || inputContext.tra || 0),
    oth: new Decimal(inputContext.contract?.oth || inputContext.oth || 0),

    // Days & Attendance
    paid_days: new Decimal(inputContext.paid_days !== undefined ? inputContext.paid_days : 30),
    month_days: new Decimal(inputContext.month_days !== undefined ? inputContext.month_days : 30),
    absent_days: new Decimal(inputContext.absent_days || 0),
    late_units: new Decimal(inputContext.late_units || 0),
    sick_half_days: new Decimal(inputContext.sick_half_days || 0),
    sick_none_days: new Decimal(inputContext.sick_none_days || 0),

    // Overtime
    ot_hours_normal: new Decimal(inputContext.ot_hours_normal || inputContext.ot_hours || 0),
    ot_hours_night: new Decimal(inputContext.ot_hours_night || inputContext.ot_night_hours || 0),
    ot_hours_rest: new Decimal(inputContext.ot_hours_rest || inputContext.ot_rest_hours || 0),

    // Adjustments & Pension
    loan_instalment: new Decimal(inputContext.loan_instalment || inputContext.loan_installment || 0),
    adv_instalment: new Decimal(inputContext.adv_instalment || inputContext.advance_amount || 0),
    gpssa_salary: new Decimal(inputContext.gpssa_salary || inputContext.contribution_salary || 0),

    // Dynamic totals tracked during run
    allowances: new Decimal(0),
    deductions: new Decimal(0),
    GROSS: new Decimal(0),
  };

  const steps = [];
  let calculatedGross = new Decimal(0);
  let totalAllowances = new Decimal(0);
  let totalDeductions = new Decimal(0);

  // 3. Execute each rule in sequence
  for (const rule of sortedRules) {
    if (rule.code === 'NET') {
      // Net pay calculation: Gross + extra allowances - deductions
      const netAmount = calculatedGross.plus(totalAllowances).minus(totalDeductions);
      const roundedNet = roundToCurrency(netAmount);

      steps.push({
        code: 'NET',
        name: rule.name || 'Net Pay to WPS',
        category: 'Net',
        sequence: rule.sequence,
        formula: 'GROSS + allowances - deductions',
        amount: roundedNet.toNumber(),
        unroundedAmount: netAmount.toString(),
        formattedAmount: formatCurrency(roundedNet),
      });

      context['NET'] = roundedNet;
      continue;
    }

    if (rule.code === 'GROSS') {
      const basicAmount = context['BASIC'] || new Decimal(0);
      const hraAmount = context['HRA'] || new Decimal(0);
      const traAmount = context['TRA'] || new Decimal(0);
      const othAmount = context['OTH'] || new Decimal(0);

      calculatedGross = basicAmount.plus(hraAmount).plus(traAmount).plus(othAmount);
      const roundedGross = roundToCurrency(calculatedGross);

      context['GROSS'] = roundedGross;
      context['gross'] = roundedGross;

      steps.push({
        code: 'GROSS',
        name: rule.name || 'Gross Salary',
        category: 'Gross',
        sequence: rule.sequence,
        formula: rule.formula || 'BASIC + HRA + TRA + OTH',
        amount: roundedGross.toNumber(),
        unroundedAmount: calculatedGross.toString(),
        formattedAmount: formatCurrency(roundedGross),
      });
      continue;
    }

    // Evaluate standard formula
    let rawResult = new Decimal(0);
    if (rule.amount_type === 'Fixed' && rule.fixed_amount !== undefined) {
      rawResult = new Decimal(rule.fixed_amount);
    } else if (rule.formula) {
      // If company policy specifies 365 divisor for absence:
      let formulaToRun = rule.formula;
      if (rule.code === 'ABS' && inputContext.absence_divisor === 'DAYS_365') {
        formulaToRun = 'gross * 12 / 365 * absent_days';
      }
      rawResult = evaluateFormula(formulaToRun, context);
    }

    const roundedResult = roundToCurrency(rawResult);

    // Save into context for subsequent rules
    context[rule.code] = roundedResult;
    context[rule.code.toLowerCase()] = roundedResult;

    // Track categorised totals
    if (rule.category === 'Allowance') {
      // Normal/night/rest OT are extra allowances beyond standard package (BASIC, HRA, TRA, OTH)
      if (!['BASIC', 'HRA', 'TRA', 'OTH'].includes(rule.code)) {
        totalAllowances = totalAllowances.plus(roundedResult);
      }
    } else if (rule.category === 'Deduction') {
      totalDeductions = totalDeductions.plus(roundedResult);
    }

    // Keep dynamic allowances/deductions updated in context
    context.allowances = totalAllowances;
    context.deductions = totalDeductions;

    steps.push({
      code: rule.code,
      name: rule.name,
      category: rule.category,
      sequence: rule.sequence,
      formula: rule.formula,
      amount: roundedResult.toNumber(),
      unroundedAmount: rawResult.toString(),
      formattedAmount: formatCurrency(roundedResult),
    });
  }

  const finalNetStep = steps.find((s) => s.code === 'NET');
  const finalGrossStep = steps.find((s) => s.code === 'GROSS');

  return {
    steps,
    gross: finalGrossStep ? finalGrossStep.amount : calculatedGross.toNumber(),
    totalAllowances: totalAllowances.toNumber(),
    totalDeductions: totalDeductions.toNumber(),
    net: finalNetStep ? finalNetStep.amount : 0,
    formattedNet: finalNetStep ? finalNetStep.formattedAmount : 'AED 0.00',
  };
}

/**
 * Pre-defined Worked Examples from Spec Section 8.4
 * Contract: Basic 5,000, Housing 2,000, Transport 500, Other 500 (Gross 8,000)
 */
export const SECTION_84_WORKED_EXAMPLES = {
  // Ahmed Examples 1-8
  AHMED_CONTRACT: {
    basic: 5000,
    hra: 2000,
    tra: 500,
    oth: 500,
    gross: 8000,
  },
  AHMED_EXAMPLE_1_OT_NORMAL: {
    name: 'Ahmed Ex 1: Normal Overtime (3 hrs @ 1.25x)',
    contract: { basic: 5000, hra: 2000, tra: 500, oth: 500 },
    ot_hours_normal: 3,
    expectedRuleAmount: 78.13, // (5000/30/8) * 1.25 * 3 = 78.125 -> 78.13
  },
  AHMED_EXAMPLE_2_OT_NIGHT: {
    name: 'Ahmed Ex 2: Night Overtime (2 hrs @ 1.50x)',
    contract: { basic: 5000, hra: 2000, tra: 500, oth: 500 },
    ot_hours_night: 2,
    expectedRuleAmount: 62.50, // (5000/30/8) * 1.50 * 2 = 62.50
  },
  AHMED_EXAMPLE_3_HOLIDAY: {
    name: 'Ahmed Ex 3: Holiday Overtime (1 day / 8 hrs @ 1.50x)',
    contract: { basic: 5000, hra: 2000, tra: 500, oth: 500 },
    ot_hours_rest: 8,
    expectedRuleAmount: 250.00, // (5000/30/8) * 1.50 * 8 = 250.00
  },
  AHMED_EXAMPLE_4_ABSENCE_DIV30: {
    name: 'Ahmed Ex 4: Absence 2 days (÷30 divisor)',
    contract: { basic: 5000, hra: 2000, tra: 500, oth: 500 },
    absent_days: 2,
    absence_divisor: 'DAYS_30',
    expectedRuleAmount: 533.33, // 8000/30 * 2 = 533.333... -> 533.33
  },
  AHMED_EXAMPLE_5_ABSENCE_365: {
    name: 'Ahmed Ex 5: Absence 2 days (x12÷365 divisor)',
    contract: { basic: 5000, hra: 2000, tra: 500, oth: 500 },
    absent_days: 2,
    absence_divisor: 'DAYS_365',
    expectedRuleAmount: 526.03, // 8000 * 12 / 365 * 2 = 526.027... -> 526.03
  },
  AHMED_EXAMPLE_6_SICK_HALF: {
    name: 'Ahmed Ex 6: Sick Leave Half Pay (5 days @ 50%)',
    contract: { basic: 5000, hra: 2000, tra: 500, oth: 500 },
    sick_half_days: 5,
    expectedRuleAmount: 666.67, // 8000 / 30 * 0.5 * 5 = 666.666... -> 666.67
  },
  AHMED_EXAMPLE_7_LOAN: {
    name: 'Ahmed Ex 7: Company Loan Recovery',
    contract: { basic: 5000, hra: 2000, tra: 500, oth: 500 },
    loan_instalment: 500,
    expectedRuleAmount: 500.00,
  },
  AHMED_EXAMPLE_8_COMBINED: {
    name: 'Ahmed Ex 8: Combined Pay Slip (Standard + OT 3h + Abs 2d + Loan 500)',
    contract: { basic: 5000, hra: 2000, tra: 500, oth: 500 },
    paid_days: 30,
    month_days: 30,
    ot_hours_normal: 3,
    ot_hours_night: 0,
    ot_hours_rest: 0,
    absent_days: 2,
    absence_divisor: 'DAYS_30',
    late_units: 0,
    loan_instalment: 500,
    adv_instalment: 0,
    gpssa_salary: 0,
    expectedGross: 8000.00,
    expectedAllowances: 78.13,
    expectedDeductions: 1033.33, // 533.33 absence + 500 loan
    expectedNet: 7044.80, // 8000 + 78.13 - 1033.33 = 7044.80
  },

  // Sara Gratuity (Section 8.4)
  SARA_GRATUITY: {
    name: 'Sara Gratuity: Basic 5,000, 3y 6m (3.5 years)',
    basic: 5000,
    serviceYears: 3.5,
    expectedGratuity: 12082.19, // 5000 * 12 / 365 * 21 * 3.5 = 12082.19
  },

  // Omar Gratuity & Leave Encashment (Section 8.4)
  OMAR_GRATUITY_AND_LEAVE: {
    name: 'Omar Gratuity & Leave: Basic 6,000, 7 years, 12 days unused leave',
    basic: 6000,
    serviceYears: 7,
    unusedLeaveDays: 12,
    expectedGratuity: 32547.95, // (6000 * 12 / 365) * (105 + 60) = 32547.95
    expectedLeaveEncashment: 2367.12, // 12 * (6000 * 12 / 365) = 2367.12
  },

  // Clearly labelled extra preset
  UAE_NATIONAL_GPSSA_EXTRA: {
    name: 'Extra Preset: UAE National with GPSSA Pension',
    contract: { basic: 6000, hra: 2500, tra: 1000, oth: 500 },
    paid_days: 30,
    month_days: 30,
    ot_hours_normal: 0,
    ot_hours_night: 0,
    ot_hours_rest: 0,
    absent_days: 0,
    late_units: 0,
    loan_instalment: 0,
    adv_instalment: 0,
    gpssa_salary: 10000,
    expectedGross: 10000.00,
    expectedNet: 9500.00, // 10000 Gross - 500 (5% legacy) = 9500
  },
};

// Aliased for backward compatibility with simulator UI
export const DEMO_PRESETS = {
  AHMED: SECTION_84_WORKED_EXAMPLES.AHMED_EXAMPLE_8_COMBINED,
  SARA_GRATUITY: SECTION_84_WORKED_EXAMPLES.SARA_GRATUITY,
  OMAR_END_OF_SERVICE: SECTION_84_WORKED_EXAMPLES.OMAR_GRATUITY_AND_LEAVE,
  UAE_NATIONAL_GPSSA_EXTRA: SECTION_84_WORKED_EXAMPLES.UAE_NATIONAL_GPSSA_EXTRA,
};

