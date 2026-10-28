import test from 'node:test';
import assert from 'node:assert';
import {
  calculateHourlyRate,
  calculateNormalOvertime,
  calculateSpecialOvertime,
  calculateAbsenceDeduction,
  calculateGratuity,
  calculateLeaveEncashment,
  calculatePensionContribution,
  formatCurrency,
  toDecimal,
  roundToCurrency,
} from '../src/utils/money.js';
import {
  executeRuleEngine,
  STATUTORY_UAE_DEFAULT_RULES,
  SECTION_84_WORKED_EXAMPLES,
} from '../src/utils/ruleEngine.js';

// =========================================================================
// SECTION 8.4 AHMED WORKED EXAMPLES 1 to 8
// Contract: Basic 5,000, Housing 2,000, Transport 500, Other 500 (Gross 8,000)
// =========================================================================

test('Section 8.4 Example 1: Normal Overtime (3h) -> 78.13', () => {
  // basic 5,000 / 30 / 8 * 1.25 * 3h = 78.125 -> 78.13
  const ot = roundToCurrency(calculateNormalOvertime(5000, 3));
  assert.strictEqual(ot.toFixed(2), '78.13');
  assert.strictEqual(formatCurrency(ot), 'AED 78.13');
});

test('Section 8.4 Example 2: Night Overtime (2h) -> 62.50', () => {
  // basic 5,000 / 30 / 8 * 1.50 * 2h = 62.50
  const ot = roundToCurrency(calculateSpecialOvertime(5000, 2));
  assert.strictEqual(ot.toFixed(2), '62.50');
  assert.strictEqual(formatCurrency(ot), 'AED 62.50');
});

test('Section 8.4 Example 3: Rest Day / Public Holiday Overtime (8h / 1 day) -> 250.00', () => {
  // basic 5,000 / 30 * 1.50 = 250.00
  const ot = roundToCurrency(calculateSpecialOvertime(5000, 8));
  assert.strictEqual(ot.toFixed(2), '250.00');
  assert.strictEqual(formatCurrency(ot), 'AED 250.00');
});

test('Section 8.4 Example 4: Absence 2 days (÷30 divisor) -> 533.33', () => {
  // gross 8,000 / 30 * 2 = 533.333... -> 533.33
  const abs = roundToCurrency(calculateAbsenceDeduction(8000, 2, 30));
  assert.strictEqual(abs.toFixed(2), '533.33');
  assert.strictEqual(formatCurrency(abs), 'AED 533.33');
});

test('Section 8.4 Example 5: Absence 2 days (x12÷365 statutory divisor) -> 526.03', () => {
  // gross 8,000 * 12 / 365 * 2 = 526.027... -> 526.03
  const dailyRate = toDecimal(8000).times(12).dividedBy(365);
  const abs = roundToCurrency(dailyRate.times(2));
  assert.strictEqual(abs.toFixed(2), '526.03');
  assert.strictEqual(formatCurrency(abs), 'AED 526.03');
});

test('Section 8.4 Example 6: Sick Leave Half Pay (5 days at 50%) -> 666.67', () => {
  // gross 8,000 / 30 * 0.5 * 5 = 666.666... -> 666.67
  const sick = roundToCurrency(toDecimal(8000).dividedBy(30).times(0.5).times(5));
  assert.strictEqual(sick.toFixed(2), '666.67');
  assert.strictEqual(formatCurrency(sick), 'AED 666.67');
});

test('Section 8.4 Example 7: Company Loan Recovery -> 500.00', () => {
  const loan = roundToCurrency(500);
  assert.strictEqual(loan.toFixed(2), '500.00');
  assert.strictEqual(formatCurrency(loan), 'AED 500.00');
});

test('Section 8.4 Example 8: Ahmed Combined Pay Slip nets AED 7,044.80', () => {
  // Standard month + OT normal 3h + Absence 2d (div30) + Loan 500
  // Gross: 5000 basic + 2000 hra + 500 tra + 500 oth = 8000.00
  // Addition: OT normal = 78.13
  // Deduction: Absence = 533.33, Loan = 500.00
  // Net = 8000 + 78.13 - 533.33 - 500.00 = 7044.80
  const gross = toDecimal(8000);
  const ot = roundToCurrency(calculateNormalOvertime(5000, 3));
  const abs = roundToCurrency(calculateAbsenceDeduction(8000, 2, 30));
  const loan = roundToCurrency(500);

  const net = gross.plus(ot).minus(abs).minus(loan);
  assert.strictEqual(net.toFixed(2), '7044.80');
  assert.strictEqual(formatCurrency(net), 'AED 7,044.80');

  // Verify through Rule Engine with pure AST formula evaluation
  const engineResult = executeRuleEngine(
    STATUTORY_UAE_DEFAULT_RULES,
    SECTION_84_WORKED_EXAMPLES.AHMED_EXAMPLE_8_COMBINED
  );
  assert.strictEqual(engineResult.gross, 8000.00);
  assert.strictEqual(engineResult.totalAllowances, 78.13);
  assert.strictEqual(engineResult.totalDeductions, 1033.33);
  assert.strictEqual(engineResult.net, 7044.80);
  assert.strictEqual(engineResult.formattedNet, 'AED 7,044.80');
});

// =========================================================================
// SARA & OMAR GRATUITY AND LEAVE ENCASHMENT (SECTION 8.4)
// =========================================================================

test('Section 8.4 Sara Gratuity: AED 12,082.19 (basic 5,000, 3y 6m)', () => {
  // Daily wage = 5,000 * 12 / 365 = 164.38356...
  // First 5 years = 21 days/year * 3.5 = 73.5 days
  // Gratuity = 73.5 * (5,000 * 12 / 365) = 12,082.19
  const gratuity = calculateGratuity(5000, 3.5);
  assert.strictEqual(gratuity.toFixed(2), '12082.19');
  assert.strictEqual(formatCurrency(gratuity), 'AED 12,082.19');
});

test('Section 8.4 Omar Gratuity: AED 32,547.95 (basic 6,000, 7 years)', () => {
  // Daily wage = 6,000 * 12 / 365 = 197.26027...
  // Days of wage: (21 * 5) + (30 * 2) = 105 + 60 = 165 days
  // Gratuity = 165 * (6,000 * 12 / 365) = 32,547.95
  const gratuity = calculateGratuity(6000, 7);
  assert.strictEqual(gratuity.toFixed(2), '32547.95');
  assert.strictEqual(formatCurrency(gratuity), 'AED 32,547.95');
});

test('Section 8.4 Omar Leave Encashment: AED 2,367.12 (12 unused days)', () => {
  // 12 days * (6,000 * 12 / 365) = 2,367.12
  const encashment = calculateLeaveEncashment(6000, 12);
  assert.strictEqual(encashment.toFixed(2), '2367.12');
  assert.strictEqual(formatCurrency(encashment), 'AED 2,367.12');
});

// =========================================================================
// GPSSA & ADPF PENSION SETTINGS TESTS (REQUIREMENT 3)
// =========================================================================

test('Pension: 11% new scheme (registered on/after 2 Oct 2023)', () => {
  const result = calculatePensionContribution({
    basic: 10000,
    registrationDate: '2023-10-02',
  });
  assert.strictEqual(result.isLegacy, false);
  assert.strictEqual(result.employeeRate, 11);
  assert.strictEqual(result.contributionSalary.toFixed(2), '10000.00');
  assert.strictEqual(result.employeeShare.toFixed(2), '1100.00'); // 11% of 10,000
});

test('Pension: 5% legacy scheme (registered before 2 Oct 2023)', () => {
  const result = calculatePensionContribution({
    basic: 10000,
    registrationDate: '2023-10-01',
  });
  assert.strictEqual(result.isLegacy, true);
  assert.strictEqual(result.employeeRate, 5);
  assert.strictEqual(result.contributionSalary.toFixed(2), '10000.00');
  assert.strictEqual(result.employeeShare.toFixed(2), '500.00'); // 5% of 10,000
});

test('Pension: below-minimum salary raised to AED 3,000', () => {
  const result = calculatePensionContribution({
    basic: 2200,
    pensionableAllowances: 300, // raw 2,500 < min 3,000
    isLegacy: false,
  });
  assert.strictEqual(result.rawSalary.toFixed(2), '2500.00');
  assert.strictEqual(result.contributionSalary.toFixed(2), '3000.00'); // clamped to min
  assert.strictEqual(result.employeeShare.toFixed(2), '330.00'); // 11% of 3,000
});

test('Pension: above-cap salary limited to AED 70,000', () => {
  const result = calculatePensionContribution({
    basic: 60000,
    pensionableAllowances: 25000, // raw 85,000 > cap 70,000
    isLegacy: false,
  });
  assert.strictEqual(result.rawSalary.toFixed(2), '85000.00');
  assert.strictEqual(result.contributionSalary.toFixed(2), '70000.00'); // clamped to max
  assert.strictEqual(result.employeeShare.toFixed(2), '7700.00'); // 11% of 70,000
});

test('Pension: government share under AED 20,000 (employer 12.5%, gov share 2.5%)', () => {
  const result = calculatePensionContribution({
    basic: 12000,
    isLegacy: false,
  });
  assert.strictEqual(result.contributionSalary.toFixed(2), '12000.00');
  assert.strictEqual(result.totalEmployerRate, 15);
  assert.strictEqual(result.employerCostRate, 12.5);
  assert.strictEqual(result.govShareRate, 2.5);
  assert.strictEqual(result.employerCost.toFixed(2), '1500.00'); // 12.5% of 12,000
  assert.strictEqual(result.govShare.toFixed(2), '300.00'); // 2.5% of 12,000
  assert.strictEqual(result.totalEmployerContribution.toFixed(2), '1800.00'); // 15% of 12,000
});

test('Pension: government share over AED 20,000 (employer 15%, gov share 0%)', () => {
  const result = calculatePensionContribution({
    basic: 25000,
    isLegacy: false,
  });
  assert.strictEqual(result.contributionSalary.toFixed(2), '25000.00');
  assert.strictEqual(result.totalEmployerRate, 15);
  assert.strictEqual(result.employerCostRate, 15);
  assert.strictEqual(result.govShareRate, 0);
  assert.strictEqual(result.employerCost.toFixed(2), '3750.00'); // 15% of 25,000
  assert.strictEqual(result.govShare.toFixed(2), '0.00');
  assert.strictEqual(result.totalEmployerContribution.toFixed(2), '3750.00');
});

test('Rule Engine has exactly 17 statutory salary rules', () => {
  const codes = STATUTORY_UAE_DEFAULT_RULES.map((r) => r.code);
  const expectedCodes = [
    'BASIC', 'HRA', 'TRA', 'OTH', 'GROSS',
    'OT_NORMAL', 'OT_NIGHT', 'OT_REST',
    'ABS', 'LATE', 'SICK_HALF', 'SICK_NONE',
    'LOAN', 'ADV', 'GPSSA_EE', 'GPSSA_ER', 'NET'
  ];
  assert.strictEqual(STATUTORY_UAE_DEFAULT_RULES.length, 17);
  assert.deepStrictEqual(codes, expectedCodes);
});

test('Confirm Decimal rounding is ROUND_HALF_UP for money: 78.125 -> 78.13 and 0.005 -> 0.01', () => {
  assert.strictEqual(roundToCurrency(78.125).toFixed(2), '78.13');
  assert.strictEqual(roundToCurrency('78.125').toFixed(2), '78.13');
  assert.strictEqual(roundToCurrency(0.005).toFixed(2), '0.01');
  assert.strictEqual(roundToCurrency('0.005').toFixed(2), '0.01');
});

test('GPSSA_EE and GPSSA_ER formulas use rate variables without literal numbers', () => {
  const eeRule = STATUTORY_UAE_DEFAULT_RULES.find((r) => r.code === 'GPSSA_EE');
  const erRule = STATUTORY_UAE_DEFAULT_RULES.find((r) => r.code === 'GPSSA_ER');
  assert.strictEqual(eeRule.formula, 'gpssa_salary * gpssa_ee_rate');
  assert.strictEqual(erRule.formula, 'gpssa_salary * gpssa_er_rate');
  assert.ok(!eeRule.formula.includes('0.05'));
  assert.ok(!eeRule.formula.includes('0.11'));
  assert.ok(!erRule.formula.includes('0.15'));
  assert.ok(!erRule.formula.includes('0.125'));
});
