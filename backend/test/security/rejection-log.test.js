import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../../src/app.js';
import prisma from '../../src/lib/prisma.js';
import { AuthService } from '../../src/services/authService.js';
import approvalService from '../../src/services/approvalService.js';
import rejectionService from '../../src/services/rejectionService.js';

const authService = new AuthService();
const testPassword = 'Nextal@2026!';

test('STEP 8 Security: Rejection Log Feature & Shared Engine', async (t) => {
  let company;
  let otherCompany;
  let branch;
  let visa;
  let department;
  let employee;

  // Roles & Users
  let hrManagerUser, hrManagerToken;
  let hrOfficerUser, hrOfficerToken;
  let gmUser, gmToken;
  let adminUser, adminToken;
  let deptManagerUser, deptManagerToken;
  let payrollUser, payrollToken;
  let financeUser, financeToken;
  let employeeUser, employeeToken;
  let hrOfficerV2User, hrOfficerV2Token;
  let otherCompanyUser, otherCompanyToken;

  let visa01, visa02;
  let employeeV2;
  let approvalFlow;
  let approvalRequest;
  let createdRejectionId;
  let createdRejectionV2Id;

  await t.test('setup companies, employees, roles, and test users', async () => {
    company = await prisma.$base().companies.findFirst({
      where: { name: { contains: 'Gulf Tech' } },
    });
    if (!company) {
      company = await prisma.$base().companies.findFirst();
    }
    assert.ok(company, 'Company must exist');

    otherCompany = await prisma.$base().companies.findFirst({
      where: { id: { not: company.id } },
    });
    if (!otherCompany) {
      otherCompany = await prisma.$base().companies.create({
        data: {
          name: `Isolated Tenant ${Date.now()}`,
          legal_name: `Isolated Tenant ${Date.now()} LLC`,
          registration_number: `REG-${Date.now()}`,
          country: 'ARE',
          status: 'Active',
        },
      });
    }

    branch = await prisma.$base().branches.findFirst({ where: { company_id: company.id } });
    const allVisas = await prisma.$base().company_visas.findMany({
      where: { company_id: company.id },
      orderBy: { created_at: 'asc' },
    });
    visa01 = allVisas[0];
    visa = visa01;
    if (allVisas.length > 1) {
      visa02 = allVisas[1];
    } else {
      visa02 = await prisma.$base().company_visas.create({
        data: {
          company_id: company.id,
          name: `Secondary Visa ${Date.now()}`,
          mol_establishment_id: `MOL-${Date.now()}`.slice(0, 20),
        },
      });
    }
    department = await prisma.$base().departments.findFirst({ where: { company_id: company.id } });

    const timestamp = Date.now();

    // Roles
    const hrmRole = await prisma.$base().roles.findFirst({ where: { code: 'HR_MANAGER' } });
    const hroRole = await prisma.$base().roles.findFirst({ where: { code: 'HR_OFFICER' } });
    const gmRole = await prisma.$base().roles.findFirst({ where: { code: 'GM' } });
    const caRole = await prisma.$base().roles.findFirst({ where: { code: 'COMPANY_ADMIN' } });
    const dmRole = await prisma.$base().roles.findFirst({ where: { code: 'DEPT_MANAGER' } });
    const poRole = await prisma.$base().roles.findFirst({ where: { code: 'PAYROLL_OFFICER' } });
    const finRole = await prisma.$base().roles.findFirst({ where: { code: 'FINANCE' } });
    const empRole = await prisma.$base().roles.findFirst({ where: { code: 'EMPLOYEE' } });
    assert.ok(hrmRole && hroRole && gmRole && caRole && dmRole && poRole && finRole && empRole, 'All 8 roles must exist');

    // Users: Allowed Company-wide Log Roles
    hrManagerUser = await prisma.$base().users.create({
      data: {
        company_id: company.id,
        email: `sec.hrm.rej.${timestamp}@example.com`,
        password_hash: await authService.hashPassword(testPassword),
        status: 'Active',
      },
    });
    await prisma.$base().user_roles.create({
      data: { company_id: company.id, user_id: hrManagerUser.id, role_id: hrmRole.id, scope_type: 'Company' },
    });

    hrOfficerUser = await prisma.$base().users.create({
      data: {
        company_id: company.id,
        email: `sec.hro.rej.${timestamp}@example.com`,
        password_hash: await authService.hashPassword(testPassword),
        status: 'Active',
      },
    });
    await prisma.$base().user_roles.create({
      data: { company_id: company.id, user_id: hrOfficerUser.id, role_id: hroRole.id, scope_type: 'Company' },
    });

    gmUser = await prisma.$base().users.create({
      data: {
        company_id: company.id,
        email: `sec.gm.rej.${timestamp}@example.com`,
        password_hash: await authService.hashPassword(testPassword),
        status: 'Active',
      },
    });
    await prisma.$base().user_roles.create({
      data: { company_id: company.id, user_id: gmUser.id, role_id: gmRole.id, scope_type: 'Company' },
    });

    adminUser = await prisma.$base().users.create({
      data: {
        company_id: company.id,
        email: `sec.admin.rej.${timestamp}@example.com`,
        password_hash: await authService.hashPassword(testPassword),
        status: 'Active',
      },
    });
    await prisma.$base().user_roles.create({
      data: { company_id: company.id, user_id: adminUser.id, role_id: caRole.id, scope_type: 'Company' },
    });

    // Users: Restricted Roles (DEPT_MANAGER, PAYROLL_OFFICER, FINANCE, EMPLOYEE)
    deptManagerUser = await prisma.$base().users.create({
      data: {
        company_id: company.id,
        email: `sec.dm.rej.${timestamp}@example.com`,
        password_hash: await authService.hashPassword(testPassword),
        status: 'Active',
      },
    });
    await prisma.$base().user_roles.create({
      data: { company_id: company.id, user_id: deptManagerUser.id, role_id: dmRole.id, scope_type: 'Company' },
    });

    payrollUser = await prisma.$base().users.create({
      data: {
        company_id: company.id,
        email: `sec.po.rej.${timestamp}@example.com`,
        password_hash: await authService.hashPassword(testPassword),
        status: 'Active',
      },
    });
    await prisma.$base().user_roles.create({
      data: { company_id: company.id, user_id: payrollUser.id, role_id: poRole.id, scope_type: 'Company' },
    });

    financeUser = await prisma.$base().users.create({
      data: {
        company_id: company.id,
        email: `sec.fin.rej.${timestamp}@example.com`,
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
        email: `sec.emp.rej.${timestamp}@example.com`,
        password_hash: await authService.hashPassword(testPassword),
        status: 'Active',
      },
    });
    await prisma.$base().user_roles.create({
      data: { company_id: company.id, user_id: employeeUser.id, role_id: empRole.id, scope_type: 'Company' },
    });

    // Scoped HR_OFFICER: Visa 02 only
    hrOfficerV2User = await prisma.$base().users.create({
      data: {
        company_id: company.id,
        email: `sec.hro.v2.rej.${timestamp}@example.com`,
        password_hash: await authService.hashPassword(testPassword),
        status: 'Active',
      },
    });
    await prisma.$base().user_roles.create({
      data: {
        company_id: company.id,
        user_id: hrOfficerV2User.id,
        role_id: hroRole.id,
        scope_type: 'CompanyVisa',
        scope_id: visa02.id,
      },
    });

    // Cross-tenant user
    otherCompanyUser = await prisma.$base().users.create({
      data: {
        company_id: otherCompany.id,
        email: `sec.other.rej.${timestamp}@example.com`,
        password_hash: await authService.hashPassword(testPassword),
        status: 'Active',
      },
    });
    await prisma.$base().user_roles.create({
      data: { company_id: otherCompany.id, user_id: otherCompanyUser.id, role_id: caRole.id, scope_type: 'Company' },
    });

    // Employee 1 (Visa 01)
    employee = await prisma.$base().employees.create({
      data: {
        company_id: company.id,
        branch_id: branch.id,
        company_visa_id: visa01.id,
        name: `Rejection Test Employee ${timestamp}`,
        employee_code: `ER${timestamp}`.slice(0, 20),
        gender: 'Female',
        nationality: 'ARE',
        joining_date: new Date('2023-01-01'),
        status: 'Active',
      },
    });

    // Employee 2 (Visa 02)
    employeeV2 = await prisma.$base().employees.create({
      data: {
        company_id: company.id,
        branch_id: branch.id,
        company_visa_id: visa02.id,
        name: `Rejection Test Employee Visa 2 ${timestamp}`,
        employee_code: `EV2${timestamp}`.slice(0, 20),
        gender: 'Male',
        nationality: 'ARE',
        joining_date: new Date('2023-01-01'),
        status: 'Active',
      },
    });

    // Approval flow for custom test
    approvalFlow = await prisma.$base().approval_flows.create({
      data: {
        company_id: company.id,
        name: `Flow Test ${timestamp}`,
        request_type: `TEST_FLOW_${timestamp}`.slice(0, 30),
        priority: 1,
        is_active: true,
      },
    });
    await prisma.$base().approval_flow_steps.create({
      data: {
        company_id: company.id,
        flow_id: approvalFlow.id,
        step_no: 1,
        role_id: hrmRole.id,
        approver_rule: 'SpecificRole',
      },
    });

    // Approval request
    approvalRequest = await prisma.$base().approval_requests.create({
      data: {
        company_id: company.id,
        flow_id: approvalFlow.id,
        request_type: approvalFlow.request_type,
        record_id: employee.id,
        requested_by: hrOfficerUser.id,
        status: 'Pending',
        current_step: 1,
        payload: {
          title: `Raise Request AED 15,000 for ${employee.name}`,
          salary_amount: 15000,
        },
      },
    });

    // Auth logins
    const hrmLogin = await authService.login({ email: hrManagerUser.email, password: testPassword });
    hrManagerToken = hrmLogin.token;

    const hroLogin = await authService.login({ email: hrOfficerUser.email, password: testPassword });
    hrOfficerToken = hroLogin.token;

    const gmLogin = await authService.login({ email: gmUser.email, password: testPassword });
    gmToken = gmLogin.token;

    const adminLogin = await authService.login({ email: adminUser.email, password: testPassword });
    adminToken = adminLogin.token;

    const dmLogin = await authService.login({ email: deptManagerUser.email, password: testPassword });
    deptManagerToken = dmLogin.token;

    const poLogin = await authService.login({ email: payrollUser.email, password: testPassword });
    payrollToken = poLogin.token;

    const finLogin = await authService.login({ email: financeUser.email, password: testPassword });
    financeToken = finLogin.token;

    const empLogin = await authService.login({ email: employeeUser.email, password: testPassword });
    employeeToken = empLogin.token;

    const hroV2Login = await authService.login({ email: hrOfficerV2User.email, password: testPassword });
    hrOfficerV2Token = hroV2Login.token;

    const otherLogin = await authService.login({ email: otherCompanyUser.email, password: testPassword });
    otherCompanyToken = otherLogin.token;

    // Create a rejection record explicitly under Visa 02
    const rejV2 = await rejectionService.recordRejection({
      company_id: company.id,
      request_type: 'EMPLOYEE',
      record_id: employeeV2.id,
      record_title: `Onboarding Profile for ${employeeV2.name}`,
      requester_id: hrOfficerV2User.id,
      rejected_by_id: hrManagerUser.id,
      reason: 'Passport copy must be re-scanned in color and full resolution.',
    });
    createdRejectionV2Id = rejV2.id;
  });

  await t.test('1. Rejecting request with reason < 10 chars is rejected with 400 REASON_REQUIRED', async () => {
    const res = await request(app)
      .post(`/api/v1/approvals/${approvalRequest.id}/action`)
      .set('Authorization', `Bearer ${hrManagerToken}`)
      .send({
        action: 'Reject',
        reason: 'Too short', // 9 characters
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'REASON_REQUIRED');
  });

  await t.test('2. Direct approvalService.recordRejection with reason < 10 chars throws REASON_REQUIRED', async () => {
    await assert.rejects(
      async () => {
        await approvalService.recordRejection({
          companyId: company.id,
          requestType: 'TEST',
          recordId: employee.id,
          rejectedById: hrManagerUser.id,
          reason: 'Too small',
        });
      },
      { code: 'REASON_REQUIRED', status: 400 }
    );
  });

  await t.test('3. Valid rejection (>= 10 chars) logs to approval_rejections table', async () => {
    const validReason = 'The proposed salary adjustment exceeds the departmental budget limit for this quarter.';

    const res = await request(app)
      .post(`/api/v1/approvals/${approvalRequest.id}/action`)
      .set('Authorization', `Bearer ${hrManagerToken}`)
      .send({
        action: 'Reject',
        reason: validReason,
      });

    assert.equal(res.status, 200);

    // Verify row in approval_rejections table
    const rejections = await prisma.$base().approval_rejections.findMany({
      where: { approval_request_id: approvalRequest.id },
    });

    assert.equal(rejections.length, 1);
    const rej = rejections[0];
    createdRejectionId = rej.id;

    assert.equal(rej.company_id, company.id);
    assert.equal(rej.request_type, approvalFlow.request_type);
    assert.equal(rej.record_id, employee.id);
    assert.equal(rej.rejected_by_id, hrManagerUser.id);
    assert.equal(rej.requester_id, hrOfficerUser.id);
    assert.equal(rej.reason, validReason);
    assert.equal(rej.rejection_type, 'REJECT');
  });

  await t.test('4. Immutability trigger prevents UPDATE or DELETE on approval_rejections', async () => {
    assert.ok(createdRejectionId, 'Rejection record must exist');

    // Attempt UPDATE via raw SQL
    await assert.rejects(
      async () => {
        await prisma.$base().$executeRawUnsafe(
          `UPDATE approval_rejections SET reason = 'Tampered reason that is long enough' WHERE id = '${createdRejectionId}'::uuid`
        );
      },
      (err) => {
        return /append-only audit table: UPDATE and DELETE are prohibited/i.test(err.message);
      }
    );

    // Attempt DELETE via raw SQL
    await assert.rejects(
      async () => {
        await prisma.$base().$executeRawUnsafe(
          `DELETE FROM approval_rejections WHERE id = '${createdRejectionId}'::uuid`
        );
      },
      (err) => {
        return /append-only audit table: UPDATE and DELETE are prohibited/i.test(err.message);
      }
    );
  });

  await t.test('5. GET /api/v1/approvals/rejections lists audit records with Dubai dates', async () => {
    const res = await request(app)
      .get('/api/v1/approvals/rejections')
      .set('Authorization', `Bearer ${hrManagerToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'success');
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 1);

    const found = res.body.data.find((r) => r.id === createdRejectionId);
    assert.ok(found, 'Created rejection must appear in list');
    assert.ok(found.rejection_date_dubai, 'Must contain rejection_date_dubai formatted string');
  });

  await t.test('6. GET /api/v1/approvals/rejections/:id returns full detail record', async () => {
    const res = await request(app)
      .get(`/api/v1/approvals/rejections/${createdRejectionId}`)
      .set('Authorization', `Bearer ${hrManagerToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'success');
    assert.equal(res.body.data.id, createdRejectionId);
    assert.equal(res.body.data.company_id, company.id);
    assert.ok(res.body.data.rejected_by);
    assert.equal(res.body.data.rejected_by.email, hrManagerUser.email);
  });

  await t.test('7. Sensitive salary masking: HR_OFFICER sees AED ***; HR_MANAGER sees AED 15,000', async () => {
    // Non-salary role: HR_OFFICER
    const resHro = await request(app)
      .get(`/api/v1/approvals/rejections/${createdRejectionId}`)
      .set('Authorization', `Bearer ${hrOfficerToken}`);

    assert.equal(resHro.status, 200);
    assert.match(resHro.body.data.record_title, /AED \*\*\*/, 'Salary figures must be masked for non-salary roles');
    assert.doesNotMatch(resHro.body.data.record_title, /15,000/, 'Raw salary numbers must NOT be exposed to HR_OFFICER');

    // Salary role: HR_MANAGER
    const resHrm = await request(app)
      .get(`/api/v1/approvals/rejections/${createdRejectionId}`)
      .set('Authorization', `Bearer ${hrManagerToken}`);

    assert.equal(resHrm.status, 200);
    assert.match(resHrm.body.data.record_title, /AED 15,000/, 'HR_MANAGER must see unmasked salary figures');
  });

  await t.test('8. Multi-tenant isolation: Other company user cannot see this rejection', async () => {
    // List check
    const resList = await request(app)
      .get('/api/v1/approvals/rejections')
      .set('Authorization', `Bearer ${otherCompanyToken}`);

    assert.equal(resList.status, 200);
    const leaked = resList.body.data.find((r) => r.id === createdRejectionId);
    assert.equal(leaked, undefined, 'Rejection must not leak across tenants in list');

    // Single item check
    const resSingle = await request(app)
      .get(`/api/v1/approvals/rejections/${createdRejectionId}`)
      .set('Authorization', `Bearer ${otherCompanyToken}`);

    assert.equal(resSingle.status, 404, 'Direct access by other tenant must return 404');
  });

  await t.test('9. GET /api/v1/approvals/rejections/export/csv generates valid CSV export', async () => {
    const res = await request(app)
      .get('/api/v1/approvals/rejections/export/csv')
      .set('Authorization', `Bearer ${hrManagerToken}`);

    assert.equal(res.status, 200);
    assert.match(res.headers['content-type'], /text\/csv/);
    assert.match(res.text, /Rejection ID,Date \(Asia\/Dubai\),Request Type/);
    assert.match(res.text, new RegExp(createdRejectionId));
  });

  await t.test('10. Restricted roles (DEPT_MANAGER, PAYROLL_OFFICER, FINANCE, EMPLOYEE) receive 403 on all company endpoints', async () => {
    const restrictedTokens = [
      { role: 'DEPT_MANAGER', token: deptManagerToken },
      { role: 'PAYROLL_OFFICER', token: payrollToken },
      { role: 'FINANCE', token: financeToken },
      { role: 'EMPLOYEE', token: employeeToken },
    ];

    for (const { role, token } of restrictedTokens) {
      // 1. List
      const resList = await request(app)
        .get('/api/v1/approvals/rejections')
        .set('Authorization', `Bearer ${token}`);
      assert.equal(resList.status, 403, `${role} must receive 403 on GET /approvals/rejections`);

      // 2. Detail
      const resDetail = await request(app)
        .get(`/api/v1/approvals/rejections/${createdRejectionId}`)
        .set('Authorization', `Bearer ${token}`);
      assert.equal(resDetail.status, 403, `${role} must receive 403 on GET /approvals/rejections/:id`);

      // 3. Export CSV
      const resCsv = await request(app)
        .get('/api/v1/approvals/rejections/export/csv')
        .set('Authorization', `Bearer ${token}`);
      assert.equal(resCsv.status, 403, `${role} must receive 403 on GET /approvals/rejections/export/csv`);
    }
  });

  await t.test('11. Allowed roles (HR_OFFICER, HR_MANAGER, GM, COMPANY_ADMIN) receive 200 on all company endpoints', async () => {
    const allowedTokens = [
      { role: 'HR_OFFICER', token: hrOfficerToken },
      { role: 'HR_MANAGER', token: hrManagerToken },
      { role: 'GM', token: gmToken },
      { role: 'COMPANY_ADMIN', token: adminToken },
    ];

    for (const { role, token } of allowedTokens) {
      // 1. List
      const resList = await request(app)
        .get('/api/v1/approvals/rejections')
        .set('Authorization', `Bearer ${token}`);
      assert.equal(resList.status, 200, `${role} must receive 200 on GET /approvals/rejections`);

      // 2. Detail
      const resDetail = await request(app)
        .get(`/api/v1/approvals/rejections/${createdRejectionId}`)
        .set('Authorization', `Bearer ${token}`);
      assert.equal(resDetail.status, 200, `${role} must receive 200 on GET /approvals/rejections/:id`);

      // 3. Export CSV
      const resCsv = await request(app)
        .get('/api/v1/approvals/rejections/export/csv')
        .set('Authorization', `Bearer ${token}`);
      assert.equal(resCsv.status, 200, `${role} must receive 200 on GET /approvals/rejections/export/csv`);
    }
  });

  await t.test('12. HR_OFFICER_V2 (visa-02 scoped) does not see visa-01 rejections, sees visa-02 rejection', async () => {
    // List check
    const resList = await request(app)
      .get('/api/v1/approvals/rejections')
      .set('Authorization', `Bearer ${hrOfficerV2Token}`);

    assert.equal(resList.status, 200);
    const hasVisa01Rejection = resList.body.data.some((r) => r.id === createdRejectionId);
    assert.equal(hasVisa01Rejection, false, 'Visa 02 scoped HR officer must NOT see Visa 01 rejection in list');

    const hasVisa02Rejection = resList.body.data.some((r) => r.id === createdRejectionV2Id);
    assert.equal(hasVisa02Rejection, true, 'Visa 02 scoped HR officer must see Visa 02 rejection in list');

    // Detail check: Visa 01 rejection must return 404 (never reveal record existence)
    const resDetailV1 = await request(app)
      .get(`/api/v1/approvals/rejections/${createdRejectionId}`)
      .set('Authorization', `Bearer ${hrOfficerV2Token}`);
    assert.equal(resDetailV1.status, 404, 'Direct access to out-of-scope rejection must return 404');

    // Detail check: Visa 02 rejection returns 200
    const resDetailV2 = await request(app)
      .get(`/api/v1/approvals/rejections/${createdRejectionV2Id}`)
      .set('Authorization', `Bearer ${hrOfficerV2Token}`);
    assert.equal(resDetailV2.status, 200, 'Direct access to in-scope rejection must return 200');
  });

  await t.test('13. Rejections CSV export is audited in audit_logs table', async () => {
    const beforeCount = await prisma.$base().audit_logs.count({
      where: {
        company_id: company.id,
        table_name: 'approval_rejections',
        action: 'EXPORT_CSV',
      },
    });

    const res = await request(app)
      .get('/api/v1/approvals/rejections/export/csv')
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(res.status, 200);

    const afterCount = await prisma.$base().audit_logs.count({
      where: {
        company_id: company.id,
        table_name: 'approval_rejections',
        action: 'EXPORT_CSV',
      },
    });

    assert.equal(afterCount, beforeCount + 1, 'CSV export must append an entry in audit_logs');
  });

  await t.test('14. GET /api/v1/me/rejections returns caller personal rejected requests for any role', async () => {
    // 1. Requester (hrOfficerUser requested approvalRequest which was rejected)
    const resRequester = await request(app)
      .get('/api/v1/me/rejections')
      .set('Authorization', `Bearer ${hrOfficerToken}`);
    assert.equal(resRequester.status, 200);
    assert.equal(resRequester.body.status, 'success');
    const myRej = resRequester.body.data.find((r) => r.id === createdRejectionId);
    assert.ok(myRej, 'Requester must see their own rejected request in /me/rejections');

    // 2. User with no rejections (deptManagerUser) receives 200 with empty list
    const resDm = await request(app)
      .get('/api/v1/me/rejections')
      .set('Authorization', `Bearer ${deptManagerToken}`);
    assert.equal(resDm.status, 200);
    assert.equal(resDm.body.status, 'success');
    const leakedRej = resDm.body.data.find((r) => r.id === createdRejectionId || r.id === createdRejectionV2Id);
    assert.equal(leakedRej, undefined, 'User must not see other people rejections in /me/rejections');
  });
});
