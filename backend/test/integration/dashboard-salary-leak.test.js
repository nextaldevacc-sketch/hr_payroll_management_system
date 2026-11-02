import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../../src/app.js';

describe('FR-X3 Dashboard Salary Leak Prevention (Deep-Scan Test)', { timeout: 60000 }, () => {
  const NON_SALARY_ROLES = [
    { name: 'Company Admin', email: 'admin@gulftech.ae' },
    { name: 'HR Officer', email: 'hr.officer@gulftech.ae' },
    { name: 'Department Manager', email: 'dept.mgr@gulftech.ae' },
    { name: 'Employee (Ahmed)', email: 'employee@gulftech.ae' },
  ];

  const SALARY_ROLES = [
    { name: 'HR Manager', email: 'hr.mgr@gulftech.ae' },
    { name: 'Payroll Officer', email: 'payroll@gulftech.ae' },
    { name: 'General Manager', email: 'gm@gulftech.ae' },
    { name: 'Finance', email: 'finance@gulftech.ae' },
  ];

  const tokens = {};

  async function loginAs(email, password = 'Nextal@2026!') {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password });
    assert.equal(res.status, 200, `Login for ${email} must succeed`);
    return res.body.token;
  }

  before(async () => {
    for (const r of [...NON_SALARY_ROLES, ...SALARY_ROLES]) {
      tokens[r.email] = await loginAs(r.email);
    }
  });

  function deepScanForSalaryLeak(obj, path = '') {
    const violations = [];
    if (!obj || typeof obj !== 'object') return violations;

    const forbiddenKeyPattern = /amount|salary|wage|cost|gross|net|deduction|allowance|gratuity|liabilit/i;

    for (const [key, val] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;

      // 1. Check key names for monetary/salary identifiers
      if (forbiddenKeyPattern.test(key)) {
        violations.push({ path: currentPath, type: 'FORBIDDEN_KEY', key, value: val });
      }

      // 2. Check string values for currency mentions like AED, $, €, £
      if (typeof val === 'string') {
        if (/\bAED\b/i.test(val) || /[\$€£]/.test(val)) {
          violations.push({ path: currentPath, type: 'CURRENCY_TEXT_FOUND', value: val });
        }
      } else if (typeof val === 'object' && val !== null) {
        violations.push(...deepScanForSalaryLeak(val, currentPath));
      }
    }
    return violations;
  }

  for (const role of NON_SALARY_ROLES) {
    it(`GET /dashboard/overview for ${role.name} (${role.email}) contains 0 monetary keys and no AED values`, async () => {
      const token = tokens[role.email];
      const res = await request(app)
        .get('/api/v1/dashboard/overview')
        .set('Authorization', `Bearer ${token}`);

      assert.equal(res.status, 200, `${role.name} must be able to load /dashboard/overview`);
      assert.equal(res.body.status, 'success');

      const violations = deepScanForSalaryLeak(res.body.data);
      if (violations.length > 0) {
        console.error(`Salary leak violations for ${role.name}:`, JSON.stringify(violations, null, 2));
      }
      assert.equal(
        violations.length,
        0,
        `Expected 0 salary leak violations in /dashboard/overview for ${role.name}, found: ${JSON.stringify(violations)}`
      );

      // Verify that non-monetary metrics like headcount, attendance, and overtime hours are present
      assert.ok(res.body.data.headcount, 'Headcount should be present');
      assert.ok(res.body.data.attendanceToday, 'Attendance counts should be present');
      assert.ok(res.body.data.overtimeMonth, 'Overtime hours should be present');
      assert.ok(
        typeof res.body.data.overtimeMonth.totalHours === 'number',
        'Overtime total hours should be a number'
      );
    });

    it(`GET /dashboard/salary for ${role.name} (${role.email}) is strictly blocked with HTTP 403`, async () => {
      const token = tokens[role.email];
      const res = await request(app)
        .get('/api/v1/dashboard/salary')
        .set('Authorization', `Bearer ${token}`);

      assert.equal(res.status, 403, `Non-salary role ${role.name} must receive 403 on /dashboard/salary`);
      assert.equal(res.body.status, 'error');
    });
  }

  for (const role of SALARY_ROLES) {
    it(`GET /dashboard/salary for authorized role ${role.name} (${role.email}) succeeds with HTTP 200`, async () => {
      const token = tokens[role.email];
      const res = await request(app)
        .get('/api/v1/dashboard/salary')
        .set('Authorization', `Bearer ${token}`);

      assert.equal(res.status, 200, `Salary role ${role.name} must receive 200 on /dashboard/salary`);
      assert.equal(res.body.status, 'success');
      assert.ok(res.body.data.livePayroll, 'livePayroll should be returned to salary roles');
    });
  }
});

