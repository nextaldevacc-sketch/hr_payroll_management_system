import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../../src/app.js';
import prisma from '../../src/lib/prisma.js';
import approvalService from '../../src/services/approvalService.js';
import { AuthService } from '../../src/services/authService.js';

const authService = new AuthService();
const testPassword = 'Nextal@2026!';

test('C1 + H1 + H2 Security: Approval Engine Order, Atomic Transaction and Role Rules', async (t) => {
  let company;
  let employeeUser;
  let employeeToken;
  let hrOfficerUser;
  let hrManagerUser;
  let adminUser;
  let adminToken;
  let testFlow;

  await t.test('setup test users, roles and approval flow', async () => {
    company = await prisma.$base().companies.findFirst({
      where: { name: { contains: 'Gulf Tech' } },
    });
    if (!company) {
      company = await prisma.$base().companies.findFirst();
    }
    assert.ok(company, 'A company must exist');

    // 1. Roles
    const employeeRole = await prisma.$base().roles.findFirst({ where: { code: 'EMPLOYEE' } });
    const hrOfficerRole = await prisma.$base().roles.findFirst({ where: { code: 'HR_OFFICER' } });
    const hrManagerRole = await prisma.$base().roles.findFirst({ where: { code: 'HR_MANAGER' } });
    const adminRole = await prisma.$base().roles.findFirst({ where: { code: 'COMPANY_ADMIN' } });
    assert.ok(employeeRole && hrOfficerRole && hrManagerRole && adminRole, 'All required roles must exist');

    const timestamp = Date.now();

    // 2. Create distinct test users
    // Employee User (only EMPLOYEE role)
    employeeUser = await prisma.$base().users.create({
      data: {
        company_id: company.id,
        email: `sec.test.emp.${timestamp}@example.com`,
        password_hash: await authService.hashPassword(testPassword),
        status: 'Active',
      },
    });
    await prisma.$base().user_roles.create({
      data: { company_id: company.id, user_id: employeeUser.id, role_id: employeeRole.id },
    });

    // HR Officer User (only HR_OFFICER role)
    hrOfficerUser = await prisma.$base().users.create({
      data: {
        company_id: company.id,
        email: `sec.test.hro.${timestamp}@example.com`,
        password_hash: await authService.hashPassword(testPassword),
        status: 'Active',
      },
    });
    await prisma.$base().user_roles.create({
      data: { company_id: company.id, user_id: hrOfficerUser.id, role_id: hrOfficerRole.id },
    });

    // HR Manager User (only HR_MANAGER role)
    hrManagerUser = await prisma.$base().users.create({
      data: {
        company_id: company.id,
        email: `sec.test.hrm.${timestamp}@example.com`,
        password_hash: await authService.hashPassword(testPassword),
        status: 'Active',
      },
    });
    await prisma.$base().user_roles.create({
      data: { company_id: company.id, user_id: hrManagerUser.id, role_id: hrManagerRole.id },
    });

    // Admin User (only COMPANY_ADMIN role)
    adminUser = await prisma.$base().users.create({
      data: {
        company_id: company.id,
        email: `sec.test.adm.${timestamp}@example.com`,
        password_hash: await authService.hashPassword(testPassword),
        status: 'Active',
      },
    });
    await prisma.$base().user_roles.create({
      data: { company_id: company.id, user_id: adminUser.id, role_id: adminRole.id },
    });

    // Create 2-step test approval flow (Step 1: HR_OFFICER, Step 2: HR_MANAGER)
    testFlow = await prisma.$base().approval_flows.create({
      data: {
        company_id: company.id,
        name: `Sec Test Flow ${timestamp}`,
        request_type: `CUSTOM_${timestamp}`,
        is_active: true,
      },
    });

    await prisma.$base().approval_flow_steps.createMany({
      data: [
        {
          company_id: company.id,
          flow_id: testFlow.id,
          step_no: 1,
          role_id: hrOfficerRole.id,
          approver_rule: 'SpecificRole',
        },
        {
          company_id: company.id,
          flow_id: testFlow.id,
          step_no: 2,
          role_id: hrManagerRole.id,
          approver_rule: 'SpecificRole',
        },
      ],
    });

    // Login tokens
    const empLogin = await authService.login({ email: employeeUser.email, password: testPassword });
    employeeToken = empLogin.token;

    const admLogin = await authService.login({ email: adminUser.email, password: testPassword });
    adminToken = admLogin.token;
  });

  await t.test('1. Non-approver role (EMPLOYEE) gets 403 on approval routes', async () => {
    // GET /pending
    const resGet = await request(app)
      .get('/api/v1/approvals/pending')
      .set('Authorization', `Bearer ${employeeToken}`)
      .set('x-company-id', company.id);

    assert.equal(resGet.status, 403, 'Non-approver role must receive 403 on GET /api/v1/approvals/pending');

    // POST /requests/:id/action
    const fakeId = '00000000-0000-0000-0000-000000000001';
    const resPost = await request(app)
      .post(`/api/v1/approvals/requests/${fakeId}/action`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .set('x-company-id', company.id)
      .send({ action: 'Approve', comment: 'Attempting without approver role' });

    assert.equal(resPost.status, 403, 'Non-approver role must receive 403 on POST action');
  });

  await t.test('2. Role interchangeability is removed: HR_MANAGER cannot approve HR_OFFICER step and vice versa', async () => {
    // Create approval request for Step 1 (requires HR_OFFICER)
    const req1 = await prisma.$base().approval_requests.create({
      data: {
        company_id: company.id,
        flow_id: testFlow.id,
        request_type: testFlow.request_type,
        record_id: '00000000-0000-0000-0000-000000000002',
        current_step: 1,
        status: 'Pending',
        requested_by: employeeUser.id,
      },
    });

    // HR_MANAGER tries to approve Step 1 (which requires HR_OFFICER)
    await assert.rejects(
      async () => {
        await approvalService.actionRequest({
          companyId: company.id,
          requestId: req1.id,
          actorId: hrManagerUser.id,
          action: 'Approve',
          comment: 'HR Manager attempting HR Officer step',
        });
      },
      (err) => {
        assert.equal(err.status, 403);
        assert.equal(err.code, 'NOT_CURRENT_APPROVER');
        return true;
      }
    );

    // Create approval request for Step 2 (requires HR_MANAGER)
    const req2 = await prisma.$base().approval_requests.create({
      data: {
        company_id: company.id,
        flow_id: testFlow.id,
        request_type: testFlow.request_type,
        record_id: '00000000-0000-0000-0000-000000000003',
        current_step: 2,
        status: 'Pending',
        requested_by: employeeUser.id,
      },
    });

    // HR_OFFICER tries to approve Step 2 (which requires HR_MANAGER)
    await assert.rejects(
      async () => {
        await approvalService.actionRequest({
          companyId: company.id,
          requestId: req2.id,
          actorId: hrOfficerUser.id,
          action: 'Approve',
          comment: 'HR Officer attempting HR Manager step',
        });
      },
      (err) => {
        assert.equal(err.status, 403);
        assert.equal(err.code, 'NOT_CURRENT_APPROVER');
        return true;
      }
    );
  });

  await t.test('3. Admin bypass is removed: Admin cannot approve without override: true and 10+ char justification', async () => {
    const reqAdmin = await prisma.$base().approval_requests.create({
      data: {
        company_id: company.id,
        flow_id: testFlow.id,
        request_type: testFlow.request_type,
        record_id: '00000000-0000-0000-0000-000000000004',
        current_step: 1,
        status: 'Pending',
        requested_by: employeeUser.id,
      },
    });

    // (a) Admin attempts approval without override flag -> 403 ADMIN_OVERRIDE_REQUIRED
    await assert.rejects(
      async () => {
        await approvalService.actionRequest({
          companyId: company.id,
          requestId: reqAdmin.id,
          actorId: adminUser.id,
          action: 'Approve',
          comment: 'Approving as admin without override flag',
        });
      },
      (err) => {
        assert.equal(err.status, 403);
        assert.equal(err.code, 'ADMIN_OVERRIDE_REQUIRED');
        return true;
      }
    );

    // (b) Admin attempts with override: true but short reason (< 10 chars) -> 400 REASON_REQUIRED
    await assert.rejects(
      async () => {
        await approvalService.actionRequest({
          companyId: company.id,
          requestId: reqAdmin.id,
          actorId: adminUser.id,
          action: 'Approve',
          override: true,
          comment: 'Short',
        });
      },
      (err) => {
        assert.equal(err.status, 400);
        assert.equal(err.code, 'REASON_REQUIRED');
        return true;
      }
    );

    // (c) Admin provides override: true and valid justification (>= 10 chars) -> succeeds
    const justification = 'Admin overriding because HR officer is on emergency leave';
    const result = await approvalService.actionRequest({
      companyId: company.id,
      requestId: reqAdmin.id,
      actorId: adminUser.id,
      action: 'Approve',
      override: true,
      comment: justification,
    });

    assert.equal(result.status, 'success');
    assert.equal(result.override, true);
    assert.equal(result.request.status, 'Approved');

    // Verify approval_actions row recorded override: true
    const actionRow = await prisma.$base().approval_actions.findFirst({
      where: { approval_request_id: reqAdmin.id, acted_by: adminUser.id },
    });
    assert.ok(actionRow, 'Approval action row must be created');
    assert.ok(actionRow.comment.includes('[override=true]'), 'Action comment must indicate override=true');
    assert.equal(actionRow.action, 'OVERRIDE');

    // Verify audit_logs row recorded override: true
    const auditRow = await prisma.$base().audit_logs.findFirst({
      where: {
        company_id: company.id,
        user_id: adminUser.id,
        record_id: reqAdmin.id,
        action: 'APPROVAL_OVERRIDE',
      },
      orderBy: { created_at: 'desc' },
    });
    assert.ok(auditRow, 'Audit log row must be recorded with APPROVAL_OVERRIDE');
    assert.equal(auditRow.new_values?.override, true, 'Audit log new_values must record override: true');
  });

  await t.test('4. Multi-step self-action is blocked: user who acted on Step N cannot act on Step N+1', async () => {
    // Assign HR_MANAGER role to hrOfficerUser as well to test segregation of duties
    const hrManagerRole = await prisma.$base().roles.findFirst({ where: { code: 'HR_MANAGER' } });
    await prisma.$base().user_roles.create({
      data: { company_id: company.id, user_id: hrOfficerUser.id, role_id: hrManagerRole.id },
    });

    const multiReq = await prisma.$base().approval_requests.create({
      data: {
        company_id: company.id,
        flow_id: testFlow.id,
        request_type: testFlow.request_type,
        record_id: '00000000-0000-0000-0000-000000000005',
        current_step: 1,
        status: 'Pending',
        requested_by: employeeUser.id,
      },
    });

    // Step 1: hrOfficerUser approves
    const step1Result = await approvalService.actionRequest({
      companyId: company.id,
      requestId: multiReq.id,
      actorId: hrOfficerUser.id,
      action: 'Approve',
      comment: 'Step 1 approved by Officer',
    });
    assert.equal(step1Result.request.current_step, 2);
    assert.equal(step1Result.request.status, 'Pending');

    // Step 2: hrOfficerUser (even though they now hold HR_MANAGER role) attempts to approve Step 2
    await assert.rejects(
      async () => {
        await approvalService.actionRequest({
          companyId: company.id,
          requestId: multiReq.id,
          actorId: hrOfficerUser.id,
          action: 'Approve',
          comment: 'Step 2 attempted by same user who acted on Step 1',
        });
      },
      (err) => {
        assert.equal(err.status, 403);
        assert.equal(err.code, 'MULTI_STEP_SELF_ACTION_FORBIDDEN');
        return true;
      }
    );
  });

  await t.test('5. Self-approval is blocked: employee cannot approve their own request or record', async () => {
    // (a) Requester cannot approve their own request
    const ownReq = await prisma.$base().approval_requests.create({
      data: {
        company_id: company.id,
        flow_id: testFlow.id,
        request_type: testFlow.request_type,
        record_id: '00000000-0000-0000-0000-000000000006',
        current_step: 2,
        status: 'Pending',
        requested_by: hrManagerUser.id, // hrManager requested this
      },
    });

    await assert.rejects(
      async () => {
        await approvalService.actionRequest({
          companyId: company.id,
          requestId: ownReq.id,
          actorId: hrManagerUser.id,
          action: 'Approve',
          comment: 'Attempting to approve own requested item',
        });
      },
      (err) => {
        assert.equal(err.status, 403);
        assert.equal(err.code, 'SELF_APPROVAL_FORBIDDEN');
        return true;
      }
    );

    // (b) Linked employee cannot approve their own record even if requested_by is different
    // Create an employee linked to hrManagerUser
    const visa = await prisma.$base().company_visas.findFirst({ where: { company_id: company.id } });
    const branch = await prisma.$base().branches.findFirst({ where: { company_id: company.id } });
    const empRecord = await prisma.$base().employees.create({
      data: {
        company_id: company.id,
        employee_code: `E-SEC-${Date.now()}`,
        name: 'HR Manager Self Test',
        residency_type: 'Resident',
        nationality: 'ARE',
        gender: 'Male',
        company_visa_id: visa?.id,
        branch_id: branch?.id,
        joining_date: new Date(),
        status: 'Active',
      },
    });
    await prisma.$base().users.update({
      where: { id: hrManagerUser.id },
      data: { employee_id: empRecord.id },
    });

    const empRecordReq = await prisma.$base().approval_requests.create({
      data: {
        company_id: company.id,
        flow_id: testFlow.id,
        request_type: 'EMPLOYEE_VERIFICATION',
        record_id: empRecord.id, // Target record is the user's employee ID
        current_step: 2,
        status: 'Pending',
        requested_by: adminUser.id, // Requested by someone else
      },
    });

    await assert.rejects(
      async () => {
        await approvalService.actionRequest({
          companyId: company.id,
          requestId: empRecordReq.id,
          actorId: hrManagerUser.id,
          action: 'Approve',
          comment: 'Attempting to approve record where I am the employee',
        });
      },
      (err) => {
        assert.equal(err.status, 403);
        assert.equal(err.code, 'SELF_APPROVAL_FORBIDDEN');
        return true;
      }
    );
  });

  await t.test('6. Atomic rollback: side-effect failure rolls back approval_actions and leaves request Pending', async () => {
    // Create branch change approval request with INVALID target branch payload so side-effect fails
    const rollbackReq = await prisma.$base().approval_requests.create({
      data: {
        company_id: company.id,
        flow_id: testFlow.id,
        request_type: 'EMPLOYEE_BRANCH_CHANGE',
        record_id: '00000000-0000-0000-0000-000000000099', // Non-existent employee
        current_step: 2,
        status: 'Pending',
        requested_by: employeeUser.id,
        payload: { target_branch_id: '00000000-0000-0000-0000-000000000098', effective_date: '2026-01-01' },
      },
    });

    // HR Manager approves Step 2 (final step) -> triggers EMPLOYEE_BRANCH_CHANGE side effect which fails
    await assert.rejects(
      async () => {
        await approvalService.actionRequest({
          companyId: company.id,
          requestId: rollbackReq.id,
          actorId: hrManagerUser.id,
          action: 'Approve',
          comment: 'Approving invalid branch change to test atomic rollback',
        });
      },
      (err) => {
        assert.equal(err.status, 404);
        assert.equal(err.code, 'NOT_FOUND');
        return true;
      }
    );

    // Assert request status is still 'Pending'
    const reqAfter = await prisma.$base().approval_requests.findUnique({
      where: { id: rollbackReq.id },
    });
    assert.equal(reqAfter.status, 'Pending', 'Approval request status must remain Pending on side-effect failure');

    // Assert no approval_actions row was persisted
    const actionRows = await prisma.$base().approval_actions.findMany({
      where: { approval_request_id: rollbackReq.id },
    });
    assert.equal(actionRows.length, 0, 'No approval action row must be created when transaction rolls back');
  });

  await t.test('7. getPendingApprovals filtering: exact roles only and admin override segregation', async () => {
    // Non-approver employee sees 0 pending approvals
    const empPending = await approvalService.getPendingApprovals({
      companyId: company.id,
      userId: employeeUser.id,
      userRoleCodes: ['EMPLOYEE'],
    });
    assert.equal(empPending.length, 0, 'EMPLOYEE role must have 0 pending approvals');

    // Admin without showAll sees only steps assigned to COMPANY_ADMIN (not steps for other roles)
    const adminPendingDefault = await approvalService.getPendingApprovals({
      companyId: company.id,
      userId: adminUser.id,
      userRoleCodes: ['COMPANY_ADMIN'],
      showAll: false,
    });
    const hasNonAdminStep = adminPendingDefault.some((r) => {
      const step = r.flow?.steps?.find((s) => s.step_no === r.current_step);
      return step?.role?.code !== 'COMPANY_ADMIN';
    });
    assert.equal(hasNonAdminStep, false, 'Default getPendingApprovals for admin must not include steps for other roles');
  });
});
