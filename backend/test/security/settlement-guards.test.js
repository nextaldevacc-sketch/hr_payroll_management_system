import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../../src/app.js';
import prisma from '../../src/lib/prisma.js';
import { AuthService } from '../../src/services/authService.js';
import { SeparationService } from '../../src/services/separationService.js';

const authService = new AuthService();
const testPassword = 'Nextal@2026!';

test('M2 Security: Settlements and Separations Route Guards & Segregation of Duties', async (t) => {
  let company;
  let visa;
  let branch;
  let job;
  let shift;
  let policy;
  let structure;
  let employee;
  let separation;
  let settlementId;

  // Users & Tokens
  let payrollOfficerUser, payrollOfficerToken;
  let hrManagerUser, hrManagerToken;
  let gmUser, gmToken;
  let financeUser, financeToken;
  let employeeUser, employeeToken;

  const separationService = new SeparationService();

  await t.test('setup company, employees, roles, and authenticated users', async () => {
    company = await prisma.$base().companies.findFirst({
      where: { name: { contains: 'Gulf Tech' } },
    });
    if (!company) {
      company = await prisma.$base().companies.findFirst();
    }
    assert.ok(company, 'Company must exist');

    visa = await prisma.$base().company_visas.findFirst({ where: { company_id: company.id } });
    branch = await prisma.$base().branches.findFirst({ where: { company_id: company.id } });
    job = await prisma.$base().jobs.findFirst({ where: { company_id: company.id } });
    shift = await prisma.$base().shifts.findFirst({ where: { company_id: company.id } });
    policy = await prisma.$base().attendance_policies.findFirst({ where: { company_id: company.id } });
    structure = await prisma.$base().salary_structures.findFirst({ where: { company_id: company.id } });
    const department = await prisma.$base().departments.findFirst({ where: { company_id: company.id } });
    assert.ok(visa && branch && job && shift && policy && structure && department, 'Company setup defaults must exist');

    const timestamp = Date.now();

    // Roles
    const poRole = await prisma.$base().roles.findFirst({ where: { code: 'PAYROLL_OFFICER' } });
    const hrmRole = await prisma.$base().roles.findFirst({ where: { code: 'HR_MANAGER' } });
    const gmRole = await prisma.$base().roles.findFirst({ where: { code: 'GM' } });
    const finRole = await prisma.$base().roles.findFirst({ where: { code: 'FINANCE' } });
    const empRole = await prisma.$base().roles.findFirst({ where: { code: 'EMPLOYEE' } });
    assert.ok(poRole && hrmRole && gmRole && finRole && empRole, 'All 5 roles must exist');

    // Create users
    payrollOfficerUser = await prisma.$base().users.create({
      data: {
        company_id: company.id,
        email: `po.guard.${timestamp}@example.com`,
        password_hash: await authService.hashPassword(testPassword),
        status: 'Active',
      },
    });
    await prisma.$base().user_roles.create({
      data: { company_id: company.id, user_id: payrollOfficerUser.id, role_id: poRole.id, scope_type: 'Company' },
    });

    hrManagerUser = await prisma.$base().users.create({
      data: {
        company_id: company.id,
        email: `hrm.guard.${timestamp}@example.com`,
        password_hash: await authService.hashPassword(testPassword),
        status: 'Active',
      },
    });
    await prisma.$base().user_roles.create({
      data: { company_id: company.id, user_id: hrManagerUser.id, role_id: hrmRole.id, scope_type: 'Company' },
    });

    gmUser = await prisma.$base().users.create({
      data: {
        company_id: company.id,
        email: `gm.guard.${timestamp}@example.com`,
        password_hash: await authService.hashPassword(testPassword),
        status: 'Active',
      },
    });
    await prisma.$base().user_roles.create({
      data: { company_id: company.id, user_id: gmUser.id, role_id: gmRole.id, scope_type: 'Company' },
    });

    financeUser = await prisma.$base().users.create({
      data: {
        company_id: company.id,
        email: `fin.guard.${timestamp}@example.com`,
        password_hash: await authService.hashPassword(testPassword),
        status: 'Active',
      },
    });
    await prisma.$base().user_roles.create({
      data: { company_id: company.id, user_id: financeUser.id, role_id: finRole.id, scope_type: 'Company' },
    });

    employeeUser = await prisma.$base().users.create({
      data: {
        company_id: company.id,
        email: `emp.guard.${timestamp}@example.com`,
        password_hash: await authService.hashPassword(testPassword),
        status: 'Active',
      },
    });
    await prisma.$base().user_roles.create({
      data: { company_id: company.id, user_id: employeeUser.id, role_id: empRole.id, scope_type: 'Company' },
    });

    // Create employee & contract
    employee = await prisma.$base().employees.create({
      data: {
        company_id: company.id,
        branch_id: branch.id,
        company_visa_id: visa.id,
        name: 'Exit Employee',
        employee_code: `EX${timestamp}`.slice(0, 20),
        gender: 'Male',
        nationality: 'ARE',
        joining_date: new Date('2022-01-01'),
        status: 'Active',
      },
    });

    await prisma.$base().contracts.create({
      data: {
        company_id: company.id,
        employee_id: employee.id,
        job_id: job.id,
        department_id: department.id,
        shift_id: shift.id,
        attendance_policy_id: policy.id,
        structure_id: structure.id,
        contract_type: 'Unlimited',
        basic: 10000,
        gross: 15000,
        status: 'Active',
        start_date: new Date('2022-01-01'),
        effective_date: new Date('2022-01-01'),
      },
    });

    // Create Separation
    separation = await separationService.createSeparation(
      company.id,
      {
        employee_id: employee.id,
        type: 'Resignation',
        reason: 'Career growth',
        notice_date: '2026-05-01',
        last_working_day: '2026-06-01',
        auto_approve: true,
      },
      hrManagerUser.id
    );

    // Clear clearance items so settlement validation succeeds
    await prisma.$base().clearance_items.updateMany({
      where: { separation_id: separation.id },
      data: { status: 'Cleared' },
    });

    // Login each user to get tokens
    const poLogin = await authService.login({ email: payrollOfficerUser.email, password: testPassword });
    payrollOfficerToken = poLogin.token;

    const hrmLogin = await authService.login({ email: hrManagerUser.email, password: testPassword });
    hrManagerToken = hrmLogin.token;

    const gmLogin = await authService.login({ email: gmUser.email, password: testPassword });
    gmToken = gmLogin.token;

    const finLogin = await authService.login({ email: financeUser.email, password: testPassword });
    financeToken = finLogin.token;

    const empLogin = await authService.login({ email: employeeUser.email, password: testPassword });
    employeeToken = empLogin.token;
  });

  await t.test('1. Payroll Officer prepares settlement', async () => {
    const res = await request(app)
      .post(`/api/v1/settlements/prepare/${separation.id}`)
      .set('Authorization', `Bearer ${payrollOfficerToken}`)
      .send({});

    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'success');
    assert.equal(res.body.data.status, 'Prepared');
    settlementId = res.body.data.id;
    assert.ok(settlementId, 'Settlement ID should be returned');
  });

  await t.test('2. Preparer cannot validate their own settlement (403 SEGREGATION_OF_DUTIES)', async () => {
    const res = await request(app)
      .post(`/api/v1/settlements/${settlementId}/validate`)
      .set('Authorization', `Bearer ${payrollOfficerToken}`)
      .send({});

    assert.equal(res.status, 403);
  });

  await t.test('3. HR Manager validates settlement successfully', async () => {
    const res = await request(app)
      .post(`/api/v1/settlements/${settlementId}/validate`)
      .set('Authorization', `Bearer ${hrManagerToken}`)
      .send({});

    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'success');
    assert.equal(res.body.data.status, 'Validated');
  });

  await t.test('4. Preparer or Validator cannot approve settlement (403 SEGREGATION_OF_DUTIES)', async () => {
    // Preparer
    const res1 = await request(app)
      .post(`/api/v1/settlements/${settlementId}/approve`)
      .set('Authorization', `Bearer ${payrollOfficerToken}`)
      .send({});
    assert.equal(res1.status, 403);

    // Validator
    const res2 = await request(app)
      .post(`/api/v1/settlements/${settlementId}/approve`)
      .set('Authorization', `Bearer ${hrManagerToken}`)
      .send({});
    assert.equal(res2.status, 403);
  });

  await t.test('5. GM approves settlement successfully', async () => {
    const res = await request(app)
      .post(`/api/v1/settlements/${settlementId}/approve`)
      .set('Authorization', `Bearer ${gmToken}`)
      .send({});

    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'success');
    assert.equal(res.body.data.status, 'Approved');
  });

  await t.test('6. Preparer, Validator, or Approver cannot mark settlement as paid (403)', async () => {
    // Preparer
    const res1 = await request(app)
      .post(`/api/v1/settlements/${settlementId}/pay`)
      .set('Authorization', `Bearer ${payrollOfficerToken}`)
      .send({});
    assert.equal(res1.status, 403);

    // Approver (GM)
    const res2 = await request(app)
      .post(`/api/v1/settlements/${settlementId}/pay`)
      .set('Authorization', `Bearer ${gmToken}`)
      .send({});
    assert.equal(res2.status, 403);
  });

  await t.test('7. Distinct Finance user marks settlement as paid successfully', async () => {
    const res = await request(app)
      .post(`/api/v1/settlements/${settlementId}/pay`)
      .set('Authorization', `Bearer ${financeToken}`)
      .send({});

    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'success');
    assert.equal(res.body.data.status, 'Paid');
  });

  await t.test('8. Unauthorized role (EMPLOYEE) gets 403 on settlements and separations routes', async () => {
    // Settlements
    const resCalc = await request(app)
      .post(`/api/v1/settlements/calculate/${separation.id}`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({});
    assert.equal(resCalc.status, 403);

    const resPrep = await request(app)
      .post(`/api/v1/settlements/prepare/${separation.id}`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({});
    assert.equal(resPrep.status, 403);

    // Separations
    const resSepGet = await request(app)
      .get('/api/v1/separations')
      .set('Authorization', `Bearer ${employeeToken}`);
    assert.equal(resSepGet.status, 403);

    const resSepPost = await request(app)
      .post('/api/v1/separations')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        employee_id: employee.id,
        notice_date: '2026-06-01',
        last_working_day: '2026-07-01',
      });
    assert.equal(resSepPost.status, 403);
  });
});
