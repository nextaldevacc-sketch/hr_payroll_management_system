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
  let otherCompanyUser, otherCompanyToken;

  let approvalFlow;
  let approvalRequest;
  let createdRejectionId;

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
    visa = await prisma.$base().company_visas.findFirst({ where: { company_id: company.id } });
    department = await prisma.$base().departments.findFirst({ where: { company_id: company.id } });

    const timestamp = Date.now();

    // Roles
    const hrmRole = await prisma.$base().roles.findFirst({ where: { code: 'HR_MANAGER' } });
    const hroRole = await prisma.$base().roles.findFirst({ where: { code: 'HR_OFFICER' } });
    const gmRole = await prisma.$base().roles.findFirst({ where: { code: 'GM' } });
    const caRole = await prisma.$base().roles.findFirst({ where: { code: 'COMPANY_ADMIN' } });
    assert.ok(hrmRole && hroRole && gmRole && caRole, 'Roles must exist');

    // Users
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

    // Employee
    employee = await prisma.$base().employees.create({
      data: {
        company_id: company.id,
        branch_id: branch.id,
        company_visa_id: visa.id,
        name: `Rejection Test Employee ${timestamp}`,
        employee_code: `ER${timestamp}`.slice(0, 20),
        gender: 'Female',
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

    const otherLogin = await authService.login({ email: otherCompanyUser.email, password: testPassword });
    otherCompanyToken = otherLogin.token;
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
});
