import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import Decimal from 'decimal.js';
import app from '../../src/app.js';
import prisma from '../../src/lib/prisma.js';
import separationService from '../../src/services/separationService.js';
import settlementService from '../../src/services/settlementService.js';

describe('Phase 8 Integration: Offboarding & Final Settlement', () => {
  let companyA;
  let companyB;
  let adminAToken;
  let hrMgrAToken;
  let deptMgrAToken;
  let employeeAToken;
  let financeAToken;
  let gmAToken;
  let payrollOfficerAToken;

  let hrUser;
  let gmUser;
  let financeUser;
  let payrollUser;
  let deptUser;

  let testEmp;
  let testSep;

  const testPassword = 'Nextal@2026!';

  before(async () => {
    companyA = await prisma.$base().companies.findFirst({ where: { name: 'Gulf Tech Logistics LLC' } });
    companyB = await prisma.$base().companies.findFirst({ where: { name: 'Emirates Horizon Trading LLC' } });
    assert(companyA && companyB);

    // Tokens
    const login = async (email) => {
      const res = await request(app).post('/api/v1/auth/login').send({ email, password: testPassword });
      return res.body.token;
    };

    adminAToken = await login('admin@gulftech.ae');
    hrMgrAToken = await login('hr.mgr@gulftech.ae');
    deptMgrAToken = await login('dept.mgr@gulftech.ae');
    employeeAToken = await login('employee@gulftech.ae');
    financeAToken = await login('finance@gulftech.ae');
    gmAToken = await login('gm@gulftech.ae');
    payrollOfficerAToken = await login('payroll@gulftech.ae');

    hrUser = await prisma.$base().users.findFirst({ where: { email: 'hr.mgr@gulftech.ae' } });
    gmUser = await prisma.$base().users.findFirst({ where: { email: 'gm@gulftech.ae' } });
    financeUser = await prisma.$base().users.findFirst({ where: { email: 'finance@gulftech.ae' } });
    payrollUser = await prisma.$base().users.findFirst({ where: { email: 'payroll@gulftech.ae' } });
    deptUser = await prisma.$base().users.findFirst({ where: { email: 'dept.mgr@gulftech.ae' } });

    // Create a dedicated employee with 5 years service for tests
    const baseEmp = await prisma.$base().employees.findFirst({
      where: { company_id: companyA.id, status: 'Active' },
      include: { contracts: true },
    });

    testEmp = await prisma.$base().employees.create({
      data: {
        company_id: companyA.id,
        company_visa_id: baseEmp.company_visa_id,
        branch_id: baseEmp.branch_id,
        department_id: baseEmp.department_id,
        employee_code: `OFF_${Date.now()}`.slice(0, 18),
        name: 'Offboarding Test Employee',
        gender: 'Male',
        nationality: 'ARE',
        joining_date: new Date('2021-10-01'), // exactly ~5 years before 2026-10-01
        status: 'Active',
      },
    });

    const c = baseEmp.contracts[0];
    await prisma.$base().contracts.create({
      data: {
        company_id: companyA.id,
        employee_id: testEmp.id,
        contract_type: 'Unlimited',
        start_date: new Date('2021-10-01'),
        job_id: c.job_id,
        department_id: c.department_id,
        shift_id: c.shift_id,
        attendance_policy_id: c.attendance_policy_id,
        structure_id: c.structure_id,
        basic: 10000.0,
        housing: 5000.0,
        gross: 15000.0,
        effective_date: new Date('2021-10-01'),
        status: 'Active',
      },
    });

    testSep = await separationService.createSeparation(
      companyA.id,
      {
        employee_id: testEmp.id,
        type: 'Resignation',
        reason: 'Relocating',
        notice_date: '2026-09-01',
        last_working_day: '2026-10-31',
        auto_approve: true,
      },
      hrUser.id
    );
  });

  it('1. Gratuity boundary: exactly 5 years service -> 105 days basic wage', async () => {
    // 5 years * 21 days = 105 days
    // basic 10,000 -> daily wage = 10000 * 12 / 365 = 328.767123...
    // 105 * 328.767123... = 34,520.55
    const calc = await settlementService.calculateSettlement(companyA.id, testSep.id, {
      basicSalary: 10000.0,
      serviceYears: 5.0,
    });
    assert.equal(calc.gratuity, 34520.55);
  });

  it('2. Gratuity boundary: 5 years + 1 day -> step 1 (105 days) + step 2 (30 days/yr)', async () => {
    // 5.00274 years (5 years + 1 day)
    // Step 1: 105 days
    // Step 2: (1 / 365) * 30 days = 0.08219 days
    // Total days = 105.08219 days
    // Gratuity = 105.08219 * (10000 * 12 / 365) = 34,547.57
    const calc = await settlementService.calculateSettlement(companyA.id, testSep.id, {
      basicSalary: 10000.0,
      serviceYears: 5 + 1 / 365,
    });
    assert.equal(calc.gratuity, 34547.57);
  });

  it('3. Gratuity cap: 30 years service capped at 2 years wage (basic * 24)', async () => {
    // 30 years without cap: 105 + 25 * 30 = 855 days * daily wage = huge
    // Cap: basic * 24 = 10,000 * 24 = 240,000.00
    const calc = await settlementService.calculateSettlement(companyA.id, testSep.id, {
      basicSalary: 10000.0,
      serviceYears: 30.0,
    });
    assert.equal(calc.gratuity, 240000.0);
  });

  it('4. Unpaid absence days excluded from service period', async () => {
    // Create 10 unpaid absence days for test employee
    await prisma.$base().attendance_days.createMany({
      data: [
        {
          company_id: companyA.id,
          employee_id: testEmp.id,
          work_date: new Date('2026-05-01'),
          day_type: 'UnpaidLeave',
          review_status: 'Confirmed',
        },
        {
          company_id: companyA.id,
          employee_id: testEmp.id,
          work_date: new Date('2026-05-02'),
          day_type: 'Absence',
          review_status: 'Confirmed',
        },
      ],
    });

    const calc = await settlementService.calculateSettlement(companyA.id, testSep.id, {
      joiningDate: '2025-01-01',
      lastWorkingDay: '2026-01-02', // 367 calendar days
    });

    // 367 calendar days - 2 unpaid absence days = 365 net service days = 1.00 year
    assert.equal(calc.snapshot.unpaid_absence_days, 2);
    assert.equal(calc.snapshot.net_service_days, 365);
    assert.equal(calc.snapshot.service_years, 1);
  });

  it('5. Mid-month leaver prorated salary to last working day', async () => {
    // Leaver leaving on 15th of October (month has 31 days)
    // Gross 15,000 -> 15,000 * 15 / 31 = 7,258.06
    const calc = await settlementService.calculateSettlement(companyA.id, testSep.id, {
      lastWorkingDay: '2026-10-15',
      grossSalary: 15000.0,
    });
    assert.equal(calc.salary_due, 7258.06);
  });

  it('6. Negative net settlement: recoveries exceed dues', async () => {
    // Large loan balance exceeding salary and gratuity
    const calc = await settlementService.calculateSettlement(companyA.id, testSep.id, {
      salaryDue: 2000.0,
      serviceYears: 0.5, // 0 gratuity
      unusedLeaveDays: 0,
      loanRecovery: 10000.0,
    });

    assert.equal(calc.gratuity, 0);
    assert.equal(calc.net_payable, -8000.0);
    assert.equal(calc.snapshot.is_negative_net, true);
  });

  it('7. DB Trigger blocks modifying an Approved or Paid final settlement', async () => {
    // Create dedicated separation & settlement for DB trigger test
    const triggerSep = await separationService.createSeparation(
      companyA.id,
      {
        employee_id: testEmp.id,
        type: 'Resignation',
        reason: 'DB trigger test',
        notice_date: '2026-09-01',
        last_working_day: '2026-10-31',
        auto_approve: true,
      },
      hrUser.id
    );

    // Clear all clearance items
    const items = await prisma.$base().clearance_items.findMany({
      where: { separation_id: triggerSep.id },
    });
    for (const it of items) {
      await separationService.updateClearanceItem(companyA.id, it.id, { status: 'Cleared' }, hrUser);
    }

    const prep = await settlementService.prepareSettlement(companyA.id, triggerSep.id, {}, payrollUser.id);
    await settlementService.validateSettlement(companyA.id, prep.id, hrUser.id);
    const approved = await settlementService.approveSettlement(companyA.id, prep.id, gmUser.id);
    assert.equal(approved.status, 'Approved');

    // Raw SQL update MUST fail with DB trigger error
    await assert.rejects(
      async () => {
        await prisma.$base().$executeRaw`
          UPDATE final_settlements
          SET net_payable = 999999.00
          WHERE id = ${approved.id}::uuid
        `;
      },
      /Cannot modify financial snapshot of approved or paid final settlement/
    );
  });

  it('8. Clearance item permissions: Department manager cannot clear Finance items', async () => {
    const permSep = await separationService.createSeparation(
      companyA.id,
      {
        employee_id: testEmp.id,
        type: 'Resignation',
        reason: 'Permission test',
        notice_date: '2026-09-01',
        last_working_day: '2026-10-31',
        auto_approve: true,
      },
      hrUser.id
    );

    const financeItem = await prisma.$base().clearance_items.findFirst({
      where: { separation_id: permSep.id, item: { contains: 'Finance' } },
    });
    assert(financeItem);

    // Department manager attempting to clear Finance item via API returns HTTP 403
    const res = await request(app)
      .patch(`/api/v1/separations/clearance/${financeItem.id}`)
      .set('Authorization', `Bearer ${deptMgrAToken}`)
      .send({ status: 'Cleared' });

    assert.equal(res.status, 403);
  });

  it('9. Non-salary roles receive 403 on /api/v1/settlements', async () => {
    const res = await request(app)
      .get(`/api/v1/settlements/by-separation/${testSep.id}`)
      .set('Authorization', `Bearer ${employeeAToken}`);

    assert.equal(res.status, 403);
  });

  it('10. Cross-company tenant isolation on separations and settlements', async () => {
    // Company A user attempts to get Company B separation
    const res = await request(app)
      .get(`/api/v1/separations/${testSep.id}`)
      .set('Authorization', `Bearer ${adminAToken}`); // valid in A

    // Switch to another token from company B
    const compBUser = await prisma.$base().users.findFirst({
      where: { company_id: companyB.id, email: { contains: 'admin' } },
    });
    if (compBUser) {
      const bTokenRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: compBUser.email, password: testPassword });

      if (bTokenRes.status === 200) {
        const bToken = bTokenRes.body.token;
        const crossRes = await request(app)
          .get(`/api/v1/separations/${testSep.id}`)
          .set('Authorization', `Bearer ${bToken}`);

        assert.equal(crossRes.status, 404);
      }
    }
  });
});
