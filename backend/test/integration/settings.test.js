import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../../src/app.js';
import prisma from '../../src/prisma/client.js';
import authService from '../../src/services/authService.js';
import {
  tokenize,
  validateFormula,
  evaluateFormula,
  executeRuleEngine,
  calculateGratuity,
  calculateLeaveEncashment,
  calculatePensionContribution,
  DEMO_PRESETS,
  SECTION_84_WORKED_EXAMPLES,
  STATUTORY_UAE_DEFAULT_RULES,
} from '@nextal/shared';

describe('Phase 3: Settings Engine, Formulas, Effective Dating & Permissions Tests', () => {
  let company;
  let adminToken;
  let hrMgrToken;
  let payrollToken;
  let financeToken;
  let employeeToken;

  const testUserPassword = 'Nextal@2026!';

  before(async () => {
    company = await prisma.$base().companies.findFirst({
      where: { name: 'Gulf Tech Logistics LLC' },
    });
    assert(company, 'Gulf Tech company must exist in seed');

    // Login personas
    const logins = [
      { email: 'admin@gulftech.ae', setToken: (t) => (adminToken = t) },
      { email: 'hr.mgr@gulftech.ae', setToken: (t) => (hrMgrToken = t) },
      { email: 'payroll@gulftech.ae', setToken: (t) => (payrollToken = t) },
      { email: 'finance@gulftech.ae', setToken: (t) => (financeToken = t) },
      { email: 'employee@gulftech.ae', setToken: (t) => (employeeToken = t) },
    ];

    for (const item of logins) {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: item.email, password: testUserPassword });
      assert.equal(res.status, 200, `Login failed for ${item.email}`);
      item.setToken(res.body.token);
    }
  });

  after(async () => {
    await prisma.$disconnect();
  });

  // =========================================================================
  // 1. Safe Salary Formula Parser & Injection Prevention (Rule A)
  // =========================================================================
  describe('1. Salary Formula Safety & Parser Validation (Rule A)', () => {
    it('successfully parses and evaluates valid arithmetic expressions with Decimal precision', () => {
      const res1 = evaluateFormula('contract.basic * paid_days / month_days', {
        contract: { basic: 5000 },
        paid_days: 30,
        month_days: 30,
      });
      assert.equal(res1.toString(), '5000');

      const res2 = evaluateFormula('(basic / 30 / 8) * 1.25 * ot_hours_normal', {
        basic: 5000,
        ot_hours_normal: 3,
      });
      // (5000 / 30 / 8) * 1.25 * 3 = 78.125
      assert.equal(res2.toFixed(3), '78.125');

      const res3 = evaluateFormula('round(min(100, 50.555) + max(10, 20), 2)');
      assert.equal(res3.toString(), '70.56');
    });

    it('rejects malicious injection attempts (process.exit, constructor, __proto__, require)', () => {
      const dangerousExpressions = [
        'process.exit(1)',
        'constructor.constructor("return process")()',
        '__proto__.polluted = true',
        'require("fs").readFileSync("/etc/passwd")',
        'global.process',
        'window.location',
        'eval("5 + 5")',
        'function() { return 1; }',
      ];

      for (const expr of dangerousExpressions) {
        assert.throws(
          () => evaluateFormula(expr),
          (err) => err instanceof Error,
          `Expression '${expr}' should have been rejected as malicious`
        );
      }
    });

    it('validates whitelist and rejects unknown variables', () => {
      const validCheck = validateFormula('contract.basic + contract.hra', {
        currentRuleCode: 'GROSS',
      });
      assert.equal(validCheck.valid, true);

      const invalidCheck = validateFormula('contract.basic + hacker_variable_xyz', {
        currentRuleCode: 'GROSS',
      });
      assert.equal(invalidCheck.valid, false);
      assert.ok(invalidCheck.error.includes("Unknown variable 'hacker_variable_xyz'"));
    });

    it('detects and forbids direct self-reference (circular dependency)', () => {
      const circ = validateFormula('BASIC + 100', {
        currentRuleCode: 'BASIC',
      });
      assert.equal(circ.valid, false);
      assert.ok(circ.error.includes('Circular reference'));
    });

    it('detects and forbids forward references to later rules in sequence', () => {
      const fwd = validateFormula('contract.basic + GROSS', {
        currentRuleCode: 'BASIC',
        earlierRuleCodes: [],
        laterRuleCodes: ['GROSS', 'NET'],
      });
      assert.equal(fwd.valid, false);
      assert.ok(fwd.error.includes('Forward reference error'));
    });
  });

  // =========================================================================
  // 2. Rule Calculation Engine (Ahmed, Sara, Omar Worked Examples) (Rule B)
  // =========================================================================
  describe('2. Rule Engine Accuracy & Worked Examples (Rule B)', () => {
    it('Ahmed example 8: Exactly nets AED 7,044.80 with normal OT, 2 days absence, and loan repayment', () => {
      const result = executeRuleEngine(STATUTORY_UAE_DEFAULT_RULES, DEMO_PRESETS.AHMED);

      assert.equal(result.gross, 8000.0);
      assert.equal(result.net, 7044.80, 'Ahmed net pay must equal exactly 7,044.80 AED');
      assert.equal(result.formattedNet, 'AED 7,044.80');

      const otLine = result.steps.find((s) => s.code === 'OT_NORMAL');
      assert.equal(otLine.amount, 78.13);

      const absLine = result.steps.find((s) => s.code === 'ABS');
      assert.equal(absLine.amount, 533.33);

      const loanLine = result.steps.find((s) => s.code === 'LOAN');
      assert.equal(loanLine.amount, 500.0);
    });

    it('Ahmed example 5: Absence deduction with 365 divisor gives AED 526.03', () => {
      const result = executeRuleEngine(STATUTORY_UAE_DEFAULT_RULES, {
        ...DEMO_PRESETS.AHMED,
        absence_divisor: 'DAYS_365',
      });

      const absLine = result.steps.find((s) => s.code === 'ABS');
      assert.equal(absLine.amount, 526.03, 'Absence with DAYS_365 divisor must equal 526.03 AED');
    });

    it('Sara gratuity (Section 8.4): Exactly AED 12,082.19 (basic 5,000, 3y 6m)', () => {
      const gratuity = calculateGratuity(5000, 3.5);
      assert.equal(gratuity.toFixed(2), '12082.19');
    });

    it('Omar gratuity and leave encashment (Section 8.4): Gratuity AED 32,547.95, Leave Encashment AED 2,367.12', () => {
      const gratuity = calculateGratuity(6000, 7);
      assert.equal(gratuity.toFixed(2), '32547.95');

      const leaveEncashment = calculateLeaveEncashment(6000, 12);
      assert.equal(leaveEncashment.toFixed(2), '2367.12');
    });

    it('Extra preset: UAE National with GPSSA 5% deduction gives AED 9,500.00 net on AED 10,000 gross', () => {
      const result = executeRuleEngine(STATUTORY_UAE_DEFAULT_RULES, DEMO_PRESETS.UAE_NATIONAL_GPSSA_EXTRA);
      assert.equal(result.gross, 10000.0);
      assert.equal(result.net, 9500.0);
      const gpssaLine = result.steps.find((s) => s.code === 'GPSSA_EE');
      assert.equal(gpssaLine.amount, 500.0);
    });

    it('POST /api/v1/settings/salary-rules/test simulator returns step-by-step breakdown', async () => {
      const res = await request(app)
        .post('/api/v1/settings/salary-rules/test')
        .set('Authorization', `Bearer ${payrollToken}`)
        .send({ employee_context: DEMO_PRESETS.AHMED });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.net, 7044.80);
      assert.ok(Array.isArray(res.body.data.steps));
      assert.ok(res.body.data.steps.length >= 13);
    });

    it('changing GPSSA rate in Settings changes the calculation result (Fix a)', async () => {
      // 1. Initial simulation with employer rate 15% (less 2.5% gov share = 12.5% on 10,000 -> 1,250)
      const res1 = await request(app)
        .post('/api/v1/settings/salary-rules/test')
        .set('Authorization', `Bearer ${payrollToken}`)
        .send({ employee_context: DEMO_PRESETS.UAE_NATIONAL_GPSSA_EXTRA });
      assert.equal(res1.status, 200);
      const erStep1 = res1.body.data.steps.find((s) => s.code === 'GPSSA_ER');
      assert.equal(erStep1.amount, 1250.0);
      assert.equal(res1.body.data.gpssa_gov_share, 250.0);

      // 2. Change GPSSA employer rate to 18% in Settings
      const putRes = await request(app)
        .put('/api/v1/settings/company')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ gpssa_employer_rate: 18.00 });
      assert.equal(putRes.status, 200);

      // 3. Re-run simulation: 18% - 2.5% gov share = 15.5% on 10,000 -> 1,550
      const res2 = await request(app)
        .post('/api/v1/settings/salary-rules/test')
        .set('Authorization', `Bearer ${payrollToken}`)
        .send({ employee_context: DEMO_PRESETS.UAE_NATIONAL_GPSSA_EXTRA });
      assert.equal(res2.status, 200);
      const erStep2 = res2.body.data.steps.find((s) => s.code === 'GPSSA_ER');
      assert.equal(erStep2.amount, 1550.0);
      assert.equal(res2.body.data.gpssa_gov_share, 250.0);

      // Restore rate back to 15%
      await request(app)
        .put('/api/v1/settings/company')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ gpssa_employer_rate: 15.00 });
    });
  });

  // =========================================================================
  // 3. Effective Dating & Locked Pay Run Immutability (Rule C)
  // =========================================================================
  describe('3. Effective Dating & Locked Pay Run Protection (Rule C)', () => {
    let lockedPayRun;
    let shiftToTest;

    before(async () => {
      // Find or create locked pay run (e.g. September 2026) for testing Rule C
      lockedPayRun = await prisma.$base().pay_runs.findFirst({
        where: { company_id: company.id, status: 'Locked' },
      });
      if (!lockedPayRun) {
        const visa = await prisma.$base().company_visas.findFirst({
          where: { company_id: company.id },
        });
        lockedPayRun = await prisma.$base().pay_runs.create({
          data: {
            company_id: company.id,
            company_visa_id: visa.id,
            run_type: 'Regular',
            period_month: new Date('2026-09-01'),
            cutoff_date: new Date('2026-09-25'),
            status: 'Locked',
            locked_at: new Date('2026-09-28T10:00:00Z'),
          },
        });
      }
      assert(lockedPayRun, 'September 2026 locked pay run must exist');

      shiftToTest = await prisma.$base().shifts.findFirst({
        where: { company_id: company.id },
      });
      assert(shiftToTest, 'Shift record must exist');
    });

    it('strictly blocks modifying settings with an effective date on or before a locked pay run (HTTP 400)', async () => {
      const lockedDate = '2026-09-15'; // Within September 2026 locked period

      const res = await request(app)
        .put(`/api/v1/settings/shifts/${shiftToTest.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Illegal Mid-September Shift Change',
          effective_from: lockedDate,
        });

      assert.equal(res.status, 400);
      assert.equal(res.body.code, 'PERIOD_LOCKED');
      assert.ok(res.body.message.includes('locked pay run period'));
    });

    it('permits modifying settings with effective date after locked period and creates version snapshot', async () => {
      const futureEffectiveDate = '2026-11-01'; // Next unlocked period

      const res = await request(app)
        .put(`/api/v1/settings/shifts/${shiftToTest.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          grace_minutes: 20,
          effective_from: futureEffectiveDate,
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.grace_minutes, 20);
      assert.ok(res.body.data.version > shiftToTest.version);

      // Verify that version snapshot was recorded in settings_versions
      const versionsRes = await request(app)
        .get(`/api/v1/settings/versions/shift/${shiftToTest.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(versionsRes.status, 200);
      assert.ok(versionsRes.body.data.length > 0);
      assert.equal(versionsRes.body.data[0].entity_type, 'shift');
    });
  });

  // =========================================================================
  // 4. Role Permissions Enforcement (Section 5.3 & Rule D)
  // =========================================================================
  describe('4. Section 5.3 Settings Role Permissions (Rule D)', () => {
    let testRule;

    before(async () => {
      testRule = await prisma.$base().salary_rules.findFirst({
        where: { company_id: company.id, code: 'BASIC' },
      });
      assert(testRule);
    });

    it('Payroll Officer is permitted to edit salary rules', async () => {
      const res = await request(app)
        .put(`/api/v1/settings/salary-rules/${testRule.id}`)
        .set('Authorization', `Bearer ${payrollToken}`)
        .send({ name: 'Standard Basic Pay' });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.name, 'Standard Basic Pay');
    });

    it('Payroll Officer is BLOCKED (HTTP 403) from non-salary settings (e.g. shifts, leaves, company profile)', async () => {
      const profileRes = await request(app)
        .put('/api/v1/settings/company')
        .set('Authorization', `Bearer ${payrollToken}`)
        .send({ name: 'Unauthorized Name Change' });
      assert.equal(profileRes.status, 403);
      assert.equal(profileRes.body.code, 'FORBIDDEN_PAYROLL_RESTRICTION');

      const branchRes = await request(app)
        .post('/api/v1/settings/branches')
        .set('Authorization', `Bearer ${payrollToken}`)
        .send({ name: 'Unauthorized Branch' });
      assert.equal(branchRes.status, 403);
    });

    it('Finance role is permitted to update debit_account and credit_account on salary rules', async () => {
      const res = await request(app)
        .put(`/api/v1/settings/salary-rules/${testRule.id}`)
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          debit_account: '511001',
          credit_account: '211001',
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.debit_account, '511001');
      assert.equal(res.body.data.credit_account, '211001');
    });

    it('Finance role is BLOCKED (HTTP 403) from updating formula or non-account rule attributes', async () => {
      const res = await request(app)
        .put(`/api/v1/settings/salary-rules/${testRule.id}`)
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          formula: 'contract.basic * 2', // Finance attempting formula modification
        });

      assert.equal(res.status, 403);
      assert.equal(res.body.code, 'FORBIDDEN_FINANCE_RESTRICTION');
    });

    it('Employee role is BLOCKED (HTTP 403) from viewing or modifying settings', async () => {
      const viewRes = await request(app)
        .get('/api/v1/settings/overview')
        .set('Authorization', `Bearer ${employeeToken}`);
      assert.equal(viewRes.status, 403);

      const editRes = await request(app)
        .put('/api/v1/settings/company')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ name: 'Hacked Name' });
      assert.equal(editRes.status, 403);
    });
  });

  // =========================================================================
  // 5. Delete-in-Use Protection (Rule E)
  // =========================================================================
  describe('5. Delete-in-Use Protection (Rule E)', () => {
    it('blocks deleting a shift assigned to active employee contracts (HTTP 400)', async () => {
      const inUseShift = await prisma.$base().shifts.findFirst({
        where: { company_id: company.id, contracts: { some: {} } },
      });
      assert(inUseShift, 'Shift with assigned contracts must exist');

      const res = await request(app)
        .delete(`/api/v1/settings/shifts/${inUseShift.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 400);
      assert.equal(res.body.code, 'DELETE_IN_USE_BLOCKED');
      assert.ok(res.body.message.includes('Deactivate'));
    });

    it('blocks deleting a leave type with allocated balances or requests (HTTP 400)', async () => {
      const inUseLeave = await prisma.$base().leave_types.findFirst({
        where: { company_id: company.id, code: 'ANNUAL' },
      });
      assert(inUseLeave);

      const res = await request(app)
        .delete(`/api/v1/settings/leave-types/${inUseLeave.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 400);
      assert.equal(res.body.code, 'DELETE_IN_USE_BLOCKED');
    });

    it('blocks deleting a salary rule that has historical payslip lines (HTTP 400)', async () => {
      const inUseRule = await prisma.$base().salary_rules.findFirst({
        where: { company_id: company.id, code: 'BASIC' },
      });
      assert(inUseRule);

      const res = await request(app)
        .delete(`/api/v1/settings/salary-rules/${inUseRule.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 400);
      assert.equal(res.body.code, 'DELETE_IN_USE_BLOCKED');
    });
  });

  // =========================================================================
  // 6. Audit Trail & Defaults Reset (Rule G)
  // =========================================================================
  describe('6. Audit Logging & Reset to UAE Defaults (Rule G)', () => {
    it('writes audit logs with old_values and new_values on settings update', async () => {
      const oldAlerts = await prisma.$base().companies.findUnique({
        where: { id: company.id },
        select: { default_cutoff_day: true },
      });

      const res = await request(app)
        .put('/api/v1/settings/payroll-alerts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ default_cutoff_day: 26 });

      assert.equal(res.status, 200);

      // Verify audit log row
      const auditRow = await prisma.$base().audit_logs.findFirst({
        where: { company_id: company.id, table_name: 'payroll_settings', action: 'UPDATE' },
        orderBy: { created_at: 'desc' },
      });

      assert.ok(auditRow);
      assert.equal(auditRow.old_values.default_cutoff_day, oldAlerts.default_cutoff_day);
      assert.equal(auditRow.new_values.default_cutoff_day, 26);
    });

    it('defaults-diff returns a preview comparing current settings against UAE statutory defaults', async () => {
      const res = await request(app)
        .get('/api/v1/settings/defaults-diff/salary_rules')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.data.section, 'salary_rules');
      assert.ok(res.body.data.defaults);
    });

    it('reset-defaults successfully restores UAE 2026 public holidays', async () => {
      const res = await request(app)
        .post('/api/v1/settings/reset-defaults/holidays')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.data.success, true);
      assert.ok(res.body.data.count >= 8);
    });
  });
});
