import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../../src/app.js';
import prisma from '../../src/lib/prisma.js';
import { AuthService } from '../../src/services/authService.js';

const authService = new AuthService();
const testPassword = 'Nextal@2026!';

test('H4 Security: Sensitive-Field Reveal Access Control and Auditing', async (t) => {
  let company;
  let visa;
  let branch;
  let department;
  let employee1;
  let employee2;
  let hrOfficerUser;
  let hrOfficerToken;
  let deptManagerUser;
  let deptManagerToken;
  let hrManagerUser;
  let hrManagerToken;
  let uniqueIban;

  await t.test('setup test company, departments, employees, and scoped users', async () => {
    company = await prisma.$base().companies.findFirst({
      where: { name: { contains: 'Gulf Tech' } },
    });
    if (!company) {
      company = await prisma.$base().companies.findFirst();
    }
    assert.ok(company, 'Company must exist');

    visa = await prisma.$base().company_visas.findFirst({ where: { company_id: company.id } });
    branch = await prisma.$base().branches.findFirst({ where: { company_id: company.id } });
    const job = await prisma.$base().jobs.findFirst({ where: { company_id: company.id } });
    const shift = await prisma.$base().shifts.findFirst({ where: { company_id: company.id } });
    const policy = await prisma.$base().attendance_policies.findFirst({ where: { company_id: company.id } });
    const structure = await prisma.$base().salary_structures.findFirst({ where: { company_id: company.id } });
    assert.ok(visa && branch && job && shift && policy && structure, 'Company defaults must exist');

    const timestamp = Date.now();

    // 1. Create a Department
    department = await prisma.$base().departments.create({
      data: {
        company_id: company.id,
        name: `Engineering Test ${timestamp}`,
      },
    });

    const otherDept = await prisma.$base().departments.create({
      data: {
        company_id: company.id,
        name: `Marketing Test ${timestamp}`,
      },
    });

    // 2. Roles
    const hrOfficerRole = await prisma.$base().roles.findFirst({ where: { code: 'HR_OFFICER' } });
    const hrManagerRole = await prisma.$base().roles.findFirst({ where: { code: 'HR_MANAGER' } });
    const deptManagerRole = await prisma.$base().roles.findFirst({ where: { code: 'DEPT_MANAGER' } });
    assert.ok(hrOfficerRole && hrManagerRole && deptManagerRole, 'Roles must exist');

    // 3. Create Users
    hrOfficerUser = await prisma.$base().users.create({
      data: {
        company_id: company.id,
        email: `sec.hro.${timestamp}@example.com`,
        password_hash: await authService.hashPassword(testPassword),
        status: 'Active',
      },
    });
    await prisma.$base().user_roles.create({
      data: {
        company_id: company.id,
        user_id: hrOfficerUser.id,
        role_id: hrOfficerRole.id,
        scope_type: 'Company',
      },
    });

    hrManagerUser = await prisma.$base().users.create({
      data: {
        company_id: company.id,
        email: `sec.hrm.${timestamp}@example.com`,
        password_hash: await authService.hashPassword(testPassword),
        status: 'Active',
      },
    });
    await prisma.$base().user_roles.create({
      data: {
        company_id: company.id,
        user_id: hrManagerUser.id,
        role_id: hrManagerRole.id,
        scope_type: 'Company',
      },
    });

    deptManagerUser = await prisma.$base().users.create({
      data: {
        company_id: company.id,
        email: `sec.dm.${timestamp}@example.com`,
        password_hash: await authService.hashPassword(testPassword),
        status: 'Active',
      },
    });
    await prisma.$base().user_roles.create({
      data: {
        company_id: company.id,
        user_id: deptManagerUser.id,
        role_id: deptManagerRole.id,
        scope_type: 'Department',
        scope_id: department.id,
      },
    });

    // 4. Create Employee 1 (in department, direct report to department manager)
    employee1 = await prisma.$base().employees.create({
      data: {
        company_id: company.id,
        employee_code: `E-H4-1-${timestamp}`,
        name: `Scoped Employee 1 ${timestamp}`,
        residency_type: 'Resident',
        nationality: 'ARE',
        gender: 'Male',
        company_visa_id: visa.id,
        branch_id: branch.id,
        joining_date: new Date(),
        status: 'Active',
      },
    });

    // Contract for Employee 1 with basic_salary
    await prisma.$base().contracts.create({
      data: {
        company_id: company.id,
        employee_id: employee1.id,
        department_id: department.id,
        job_id: job.id,
        shift_id: shift.id,
        attendance_policy_id: policy.id,
        structure_id: structure.id,
        version_no: 1,
        effective_date: new Date('2026-01-01'),
        start_date: new Date('2026-01-01'),
        basic: 15000,
        housing: 5000,
        transport: 2000,
        gross: 22000,
        status: 'Approved',
      },
    });

    uniqueIban = 'AE' + String(timestamp).padStart(21, '0').slice(-21);

    // Bank account for Employee 1
    await prisma.$base().bank_accounts.create({
      data: {
        company_id: company.id,
        employee_id: employee1.id,
        bank_name: 'ENBD',
        iban: uniqueIban,
        routing_code: '033',
        is_primary: true,
      },
    });

    // Identity documents for Employee 1
    await prisma.$base().employee_documents.create({
      data: {
        company_id: company.id,
        employee_id: employee1.id,
        doc_type: 'EMIRATES_ID',
        doc_number: '784-1990-1234567-1',
        status: 'Valid',
      },
    });

    await prisma.$base().employee_documents.create({
      data: {
        company_id: company.id,
        employee_id: employee1.id,
        doc_type: 'PASSPORT',
        doc_number: 'A12345678',
        status: 'Valid',
      },
    });

    // 5. Create Employee 2 (in otherDept, outside DEPT_MANAGER's scope)
    employee2 = await prisma.$base().employees.create({
      data: {
        company_id: company.id,
        employee_code: `E-H4-2-${timestamp}`,
        name: `Out of Scope Employee 2 ${timestamp}`,
        residency_type: 'Resident',
        nationality: 'ARE',
        gender: 'Female',
        company_visa_id: visa.id,
        branch_id: branch.id,
        joining_date: new Date(),
        status: 'Active',
      },
    });

    await prisma.$base().contracts.create({
      data: {
        company_id: company.id,
        employee_id: employee2.id,
        department_id: otherDept.id,
        job_id: job.id,
        shift_id: shift.id,
        attendance_policy_id: policy.id,
        structure_id: structure.id,
        version_no: 1,
        effective_date: new Date('2026-01-01'),
        start_date: new Date('2026-01-01'),
        basic: 22000,
        gross: 30000,
        status: 'Approved',
      },
    });

    await prisma.$base().employee_documents.create({
      data: {
        company_id: company.id,
        employee_id: employee2.id,
        doc_type: 'EMIRATES_ID',
        doc_number: '784-1992-7654321-2',
        status: 'Valid',
      },
    });

    // 6. Logins
    const hroLogin = await authService.login({ email: hrOfficerUser.email, password: testPassword });
    hrOfficerToken = hroLogin.token;

    const dmLogin = await authService.login({ email: deptManagerUser.email, password: testPassword });
    deptManagerToken = dmLogin.token;

    const hrmLogin = await authService.login({ email: hrManagerUser.email, password: testPassword });
    hrManagerToken = hrmLogin.token;
  });

  await t.test('1. HR_OFFICER cannot reveal basic_salary (403 FORBIDDEN_SALARY_ACCESS)', async () => {
    const res = await request(app)
      .post(`/api/v1/employees/${employee1.id}/reveal-sensitive`)
      .set('Authorization', `Bearer ${hrOfficerToken}`)
      .set('x-company-id', company.id)
      .send({ field: 'basic_salary' });

    assert.equal(res.status, 403, 'HR_OFFICER must be forbidden from revealing salary');
  });

  await t.test('2. DEPT_MANAGER cannot reveal salary of their own direct report (403 FORBIDDEN_SALARY_ACCESS)', async () => {
    const res = await request(app)
      .post(`/api/v1/employees/${employee1.id}/reveal-sensitive`)
      .set('Authorization', `Bearer ${deptManagerToken}`)
      .set('x-company-id', company.id)
      .send({ field: 'basic_salary' });

    assert.equal(res.status, 403, 'DEPT_MANAGER must be forbidden from revealing salary even for direct reports');
  });

  await t.test('3. HR_MANAGER can reveal basic_salary and an audit row is written', async () => {
    const res = await request(app)
      .post(`/api/v1/employees/${employee1.id}/reveal-sensitive`)
      .set('Authorization', `Bearer ${hrManagerToken}`)
      .set('x-company-id', company.id)
      .send({ field: 'basic_salary' });

    assert.equal(res.status, 200, 'HR_MANAGER must be allowed to reveal basic_salary');
    assert.equal(res.body.status, 'success');
    assert.equal(res.body.field, 'basic_salary');
    assert.equal(res.body.value, 15000);

    // Verify audit log row
    const auditRow = await prisma.$base().audit_logs.findFirst({
      where: {
        company_id: company.id,
        user_id: hrManagerUser.id,
        record_id: employee1.id,
        action: 'REVEAL_FIELD',
      },
      orderBy: { created_at: 'desc' },
    });
    assert.ok(auditRow, 'Audit log row must be written for reveal_field');
    assert.equal(auditRow.table_name, 'contracts');
    assert.equal(auditRow.new_values?.field, 'basic_salary');
    assert.equal(auditRow.new_values?.user_id, hrManagerUser.id);
  });

  await t.test('4. HR_MANAGER can reveal identification fields (emirates_id, passport_number, iban)', async () => {
    // emirates_id
    const resEid = await request(app)
      .post(`/api/v1/employees/${employee1.id}/reveal-sensitive`)
      .set('Authorization', `Bearer ${hrManagerToken}`)
      .set('x-company-id', company.id)
      .send({ field: 'emirates_id' });
    assert.equal(resEid.status, 200);
    assert.equal(resEid.body.value, '784-1990-1234567-1');

    // passport_number
    const resPass = await request(app)
      .post(`/api/v1/employees/${employee1.id}/reveal-sensitive`)
      .set('Authorization', `Bearer ${hrManagerToken}`)
      .set('x-company-id', company.id)
      .send({ field: 'passport_number' });
    assert.equal(resPass.status, 200);
    assert.equal(resPass.body.value, 'A12345678');

    // iban
    const resIban = await request(app)
      .post(`/api/v1/employees/${employee1.id}/reveal-sensitive`)
      .set('Authorization', `Bearer ${hrManagerToken}`)
      .set('x-company-id', company.id)
      .send({ field: 'iban' });
    assert.equal(resIban.status, 200);
    assert.equal(resIban.body.value, uniqueIban);
  });

  await t.test('5. Any role trying to reveal password_hash or an unknown field gets 400', async () => {
    // password_hash
    const resPwd = await request(app)
      .post(`/api/v1/employees/${employee1.id}/reveal-sensitive`)
      .set('Authorization', `Bearer ${hrManagerToken}`)
      .set('x-company-id', company.id)
      .send({ field: 'password_hash' });
    assert.equal(resPwd.status, 400, 'Attempting to reveal password_hash must fail with 400');

    // unknown field
    const resUnknown = await request(app)
      .post(`/api/v1/employees/${employee1.id}/reveal-sensitive`)
      .set('Authorization', `Bearer ${hrManagerToken}`)
      .set('x-company-id', company.id)
      .send({ field: 'national_insurance_number' });
    assert.equal(resUnknown.status, 400, 'Attempting to reveal unknown field must fail with 400');
  });

  await t.test('6. Out-of-scope employee reveal gets 404', async () => {
    // deptManagerUser has scope restricted to department. employee2 is in otherDept.
    const res = await request(app)
      .post(`/api/v1/employees/${employee2.id}/reveal-sensitive`)
      .set('Authorization', `Bearer ${deptManagerToken}`)
      .set('x-company-id', company.id)
      .send({ field: 'emirates_id' });

    assert.equal(res.status, 404, 'Out-of-scope employee reveal must return 404 NOT_FOUND');
  });
});
