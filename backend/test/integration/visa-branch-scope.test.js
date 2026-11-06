import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../../src/app.js';
import prisma from '../../src/lib/prisma.js';

const db = prisma.$base();

describe('Visa & Branch Scope Enforcement & Settings Rules (Sections A & B)', { timeout: 60000 }, () => {
  let adminToken;
  let hrDifcToken;
  let hrMgrToken;
  let payrollToken;
  let branchUserToken;
  let company;
  let visa01;
  let visa02;
  let branchDxb;
  let branchDifc;
  let ahmedEmp;
  let omarEmp;
  let lockedRun;

  async function loginAs(email, password = 'Nextal@2026!') {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password });
    assert.equal(res.status, 200, `Login for ${email} should succeed`);
    return res.body.token || res.body.data?.token;
  }

  before(async () => {
    company = await db.companies.findFirst({
      where: { name: 'Gulf Tech Logistics LLC' },
    });
    assert(company, 'Gulf Tech company must exist in seed');

    // Retrieve visas
    const visas = await db.company_visas.findMany({
      where: { company_id: company.id },
      orderBy: { created_at: 'asc' },
    });
    visa01 = visas.find((v) => v.mol_establishment_id === 'MOHRE-784-0129') || visas[0];
    visa02 = visas.find((v) => v.mol_establishment_id === 'DIFC-892-4410') || visas[1];
    assert(visa01 && visa02, 'Both seeded visas must exist');

    // Retrieve branches
    branchDxb = await db.branches.findFirst({
      where: { company_id: company.id, name: { contains: 'Dubai' } },
    });
    branchDifc = await db.branches.findFirst({
      where: { company_id: company.id, name: { contains: 'DIFC' } },
    });
    assert(branchDxb && branchDifc, 'Both branches must exist');

    // Retrieve key employees
    ahmedEmp = await db.employees.findFirst({
      where: { employee_code: 'EMP-DXB-043' },
    });
    omarEmp = await db.employees.findFirst({
      where: { employee_code: 'EMP-DXB-042' },
    });
    assert(ahmedEmp, 'Ahmed (EMP-DXB-043) must exist');
    assert(omarEmp, 'Omar (EMP-DXB-042) must exist');

    // Persona logins
    adminToken = await loginAs('admin@gulftech.ae');
    hrMgrToken = await loginAs('hr.mgr@gulftech.ae');
    payrollToken = await loginAs('payroll@gulftech.ae');

    // hr.difc user setup
    const hrDifcUser = await db.users.findFirst({ where: { email: 'hr.difc@gulftech.ae' } });
    assert(hrDifcUser, 'hr.difc user must exist in seed');

    // Ensure hr.difc has both HR_OFFICER and PAYROLL_OFFICER roles scoped to Visa 02
    // so both employee scope and payroll runs scope can be tested under hr.difc
    const payrollRole = await db.roles.findFirst({ where: { code: 'PAYROLL_OFFICER' } });
    const existingPayrollRole = await db.user_roles.findFirst({
      where: { user_id: hrDifcUser.id, role_id: payrollRole.id },
    });
    if (!existingPayrollRole) {
      await db.user_roles.create({
        data: {
          company_id: company.id,
          user_id: hrDifcUser.id,
          role_id: payrollRole.id,
          scope_type: 'CompanyVisa',
          scope_id: visa02.id,
        },
      });
    }
    hrDifcToken = await loginAs('hr.difc@gulftech.ae');

    // Create a Branch-scoped user for branch testing if not exists
    const hrOfficerRole = await db.roles.findFirst({ where: { code: 'HR_OFFICER' } });
    let branchUser = await db.users.findFirst({ where: { email: 'hr.branch.dxb@gulftech.ae' } });
    if (!branchUser) {
      branchUser = await db.users.create({
        data: {
          company_id: company.id,
          email: 'hr.branch.dxb@gulftech.ae',
          status: 'Active',
          password_hash: (await db.users.findFirst({ where: { email: 'admin@gulftech.ae' } })).password_hash,
        },
      });
    }
    const existingBranchRole = await db.user_roles.findFirst({
      where: { user_id: branchUser.id, role_id: hrOfficerRole.id },
    });
    if (!existingBranchRole) {
      await db.user_roles.create({
        data: {
          company_id: company.id,
          user_id: branchUser.id,
          role_id: hrOfficerRole.id,
          scope_type: 'Branch',
          scope_id: branchDxb.id,
        },
      });
    }
    branchUserToken = await loginAs('hr.branch.dxb@gulftech.ae');

    // Retrieve a locked pay run
    lockedRun = await db.pay_runs.findFirst({
      where: { company_id: company.id, status: 'Paid', company_visa_id: visa01.id },
    });
  });

  describe('Section A: Scope Enforcement (A.6)', () => {
    it('A.6.1: hr.difc lists only Visa 02 employees', async () => {
      const res = await request(app)
        .get('/api/v1/employees?limit=100')
        .set('Authorization', `Bearer ${hrDifcToken}`);
      assert.equal(res.status, 200);
      assert.ok(res.body.data.length > 0, 'Should return Visa 02 employees');
      for (const emp of res.body.data) {
        assert.equal(emp.company_visa_id, visa02.id, `Employee ${emp.employee_code} must belong to Visa 02`);
      }
    });

    it('A.6.2: hr.difc requesting out-of-scope employee (Ahmed, Visa 01) returns 404 (not 403)', async () => {
      const res = await request(app)
        .get(`/api/v1/employees/${ahmedEmp.id}`)
        .set('Authorization', `Bearer ${hrDifcToken}`);
      assert.equal(res.status, 404, 'Must return 404 NOT_FOUND so record existence is not leaked');
    });

    it('A.6.3: hr.difc lists only Visa 02 pay runs', async () => {
      const res = await request(app)
        .get('/api/v1/payroll/runs')
        .set('Authorization', `Bearer ${hrDifcToken}`);
      assert.equal(res.status, 200);
      assert.ok(res.body.data.length > 0, 'Should return Visa 02 pay runs');
      for (const run of res.body.data) {
        assert.equal(run.company_visa_id, visa02.id, `Pay run ${run.id} must belong to Visa 02`);
      }
    });

    it('A.6.4: hr.difc requesting out-of-scope visa via top-bar filter returns 400 INVALID_VISA', async () => {
      const res = await request(app)
        .get(`/api/v1/employees?company_visa_id=${visa01.id}`)
        .set('Authorization', `Bearer ${hrDifcToken}`);
      assert.equal(res.status, 400);
      assert.equal(res.body.code, 'INVALID_VISA');
    });

    it('A.6.5: Branch-scoped user sees only employees of that branch', async () => {
      const res = await request(app)
        .get('/api/v1/employees?limit=100')
        .set('Authorization', `Bearer ${branchUserToken}`);
      assert.equal(res.status, 200);
      assert.ok(res.body.data.length > 0, 'Should return branch employees');
      for (const emp of res.body.data) {
        assert.equal(emp.branch_id, branchDxb.id, `Employee ${emp.employee_code} must belong to branch ${branchDxb.name}`);
      }
    });
  });

  describe('Section B: Visa / Branch Settings Rules (B.1–B.8)', () => {
    it('B.1 (V5): changing branch company_visa_id when branch has employees returns 400 BRANCH_HAS_EMPLOYEES', async () => {
      const res = await request(app)
        .put(`/api/v1/settings/branches/${branchDxb.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: branchDxb.name,
          company_visa_id: visa02.id, // Attempt to switch visa
        });
      assert.equal(res.status, 400);
      assert.equal(res.body.code, 'BRANCH_HAS_EMPLOYEES');
    });

    it('B.2 (V6): deleting branch with branch-specific public holidays returns 400 BRANCH_HAS_HOLIDAYS', async () => {
      // Create empty branch
      const emptyBranch = await db.branches.create({
        data: {
          company_id: company.id,
          company_visa_id: visa01.id,
          name: 'Temporary Test Branch',
          name_ar: 'فرع تجريبي مؤقت',
          emirate: 'Dubai',
        },
      });

      // Add a holiday for this branch
      const holiday = await db.public_holidays.create({
        data: {
          company_id: company.id,
          branch_id: emptyBranch.id,
          name: 'Branch Test Holiday',
          name_ar: 'عطلة تجريبية للفرع',
          holiday_date: new Date('2026-12-25'),
          year: 2026,
        },
      });

      // Attempt delete
      const res = await request(app)
        .delete(`/api/v1/settings/branches/${emptyBranch.id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      assert.equal(res.status, 400);
      assert.equal(res.body.code, 'BRANCH_HAS_HOLIDAYS');

      // Cleanup
      await db.public_holidays.delete({ where: { id: holiday.id } });
      await db.branches.delete({ where: { id: emptyBranch.id } });
    });

    it('B.3 (V1): creating visa with duplicate MOHRE ID returns 400 with field mol_establishment_id', async () => {
      const res = await request(app)
        .post('/api/v1/settings/visas')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Duplicate Visa Test',
          name_ar: 'تأشيرة مكررة',
          mol_establishment_id: 'MOHRE-784-0129', // Existing MOHRE ID
          bank_routing_code: 'ENBD00001',
          emirate: 'Dubai',
        });
      assert.equal(res.status, 400);
      assert.equal(res.body.field, 'mol_establishment_id');
    });

    it('B.3 (V1): creating visa with routing code !== 9 characters returns 400 with field bank_routing_code', async () => {
      const res = await request(app)
        .post('/api/v1/settings/visas')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Invalid Routing Visa',
          name_ar: 'تأشيرة توجيه غير صالح',
          mol_establishment_id: 'MOHRE-NEW-9999',
          bank_routing_code: 'SHORT1', // 6 chars instead of 9
          emirate: 'Dubai',
        });
      assert.equal(res.status, 400);
      assert.equal(res.body.field, 'bank_routing_code');
    });

    it('B.4 (V2): lock pay run, edit visa routing code, regenerate SIF -> still the old code', async () => {
      assert(lockedRun, 'Locked pay run must exist');

      // 1. Verify locked pay run has snapshot
      const originalRouting = lockedRun.bank_routing_code;
      assert.ok(originalRouting, 'Locked run must have snapshotted routing code');

      // 2. Generate initial SIF
      const sifRes1 = await request(app)
        .get(`/api/v1/payroll/runs/${lockedRun.id}/sif`)
        .set('Authorization', `Bearer ${hrMgrToken}`);
      assert.equal(sifRes1.status, 200);

      // 3. Edit live visa routing code to a completely different routing code
      const newRouting = 'FAB999999';
      await db.company_visas.update({
        where: { id: lockedRun.company_visa_id },
        data: { bank_routing_code: newRouting },
      });

      try {
        // 4. Regenerate SIF for the locked run
        const sifRes2 = await request(app)
          .get(`/api/v1/payroll/runs/${lockedRun.id}/sif`)
          .set('Authorization', `Bearer ${hrMgrToken}`);
        assert.equal(sifRes2.status, 200);

        // 5. The regenerated SIF must STILL use the locked snapshot, NOT the new routing code
        const expectedOldDigits = originalRouting.replace(/\D/g, '').padEnd(9, '0').slice(0, 9);
        const expectedNewDigits = newRouting.replace(/\D/g, '').padEnd(9, '0').slice(0, 9);

        assert.ok(
          sifRes2.text.includes(expectedOldDigits),
          `SIF must still contain old locked routing digits ${expectedOldDigits}`
        );
        assert.ok(
          !sifRes2.text.includes(expectedNewDigits),
          `SIF must NOT contain newly changed routing digits ${expectedNewDigits}`
        );
      } finally {
        // Restore original routing code
        await db.company_visas.update({
          where: { id: lockedRun.company_visa_id },
          data: { bank_routing_code: originalRouting },
        });
      }
    });

    it('B.5 (V9): updating company_visa_id of an employee with pay history returns 400 VISA_TRANSFER_NOT_SUPPORTED', async () => {
      // Ahmed has pay history in September run
      const res = await request(app)
        .put(`/api/v1/employees/${ahmedEmp.id}`)
        .set('Authorization', `Bearer ${hrMgrToken}`)
        .send({
          company_visa_id: visa02.id, // Attempt to transfer visa
        });
      assert.equal(res.status, 400);
      assert.equal(res.body.code, 'VISA_TRANSFER_NOT_SUPPORTED');
    });

    it('B.7 (V10): branch-specific public holiday is applied only to employees of that branch in leave calculation', async () => {
      // Create a DIFC branch-only holiday on 2026-11-16 (Monday)
      const testDate = new Date('2026-11-16T00:00:00.000Z');
      const difcHoliday = await db.public_holidays.create({
        data: {
          company_id: company.id,
          branch_id: branchDifc.id,
          name: 'DIFC Special Day',
          name_ar: 'يوم مركز دبي المالي الخاص',
          holiday_date: testDate,
          year: 2026,
        },
      });

      try {
        // DIFC employee leaveService calculation
        const difcEmp = await db.employees.findFirst({
          where: { branch_id: branchDifc.id },
        });
        const dxbEmp = await db.employees.findFirst({
          where: { branch_id: branchDxb.id },
        });

        // Test working days calculation for both employees over 2026-11-16 to 2026-11-16
        const leaveServiceModule = await import('../../src/services/leaveService.js');
        const leaveService = leaveServiceModule.default;
        const difcDays = await leaveService.calculateWorkingDays(company.id, '2026-11-16', '2026-11-16', difcEmp.id);
        const dxbDays = await leaveService.calculateWorkingDays(company.id, '2026-11-16', '2026-11-16', dxbEmp.id);

        // Monday is working day under standard shift; for DIFC employee it is a public holiday -> 0 days consumed
        assert.equal(difcDays, 0, 'DIFC employee should have 0 working days due to branch holiday');
        assert.equal(dxbDays, 1, 'Dubai HQ employee should have 1 working day (holiday does not apply)');
      } finally {
        await db.public_holidays.delete({ where: { id: difcHoliday.id } });
      }
    });

    it('B.8 (V11): duplicate Regular pay run for same visa and month is rejected with 409 PAY_RUN_EXISTS', async () => {
      // Try to create another Regular run for Visa 01 in October 2026 (already seeded)
      const res = await request(app)
        .post('/api/v1/payroll/runs')
        .set('Authorization', `Bearer ${payrollToken}`)
        .send({
          company_visa_id: visa01.id,
          period_month: '2026-10-01',
          run_type: 'Regular',
        });
      assert.equal(res.status, 409);
      assert.equal(res.body.code, 'PAY_RUN_EXISTS');
    });
  });
});
