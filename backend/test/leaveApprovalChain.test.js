import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import Decimal from 'decimal.js';
import app from '../src/app.js';
import prisma from '../src/lib/prisma.js';
import leaveService from '../src/services/leaveService.js';

describe('Spec 7.4 & T15 Leave Approval Chain & Single Balance Deduction', () => {
  let company;
  let annualType;
  let sickType;
  let deptMgrUser;
  let hrOfficerUser;
  let gmUser;
  let employeeUser;
  let deptMgrToken;
  let hrOfficerToken;
  let gmToken;
  let employeeToken;
  let adminToken;
  let adminUser;
  let testEmployee;
  let annualAlloc;

  const testPassword = 'Nextal@2026!';

  before(async () => {
    company = await prisma.$base().companies.findFirst({
      where: { name: 'Gulf Tech Logistics LLC' },
    });
    assert(company, 'Company 1 must exist');

    // Personas
    const logins = [
      { email: 'dept.mgr@gulftech.ae', set: (t, u) => { deptMgrToken = t; deptMgrUser = u; } },
      { email: 'hr.officer@gulftech.ae', set: (t, u) => { hrOfficerToken = t; hrOfficerUser = u; } },
      { email: 'gm@gulftech.ae', set: (t, u) => { gmToken = t; gmUser = u; } },
      { email: 'admin@gulftech.ae', set: (t, u) => { adminToken = t; adminUser = u; } },
      { email: 'employee@gulftech.ae', set: (t, u) => { employeeToken = t; employeeUser = u; } },
    ];

    for (const item of logins) {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: item.email, password: testPassword });
      assert.equal(res.status, 200, `Login failed for ${item.email}`);
      item.set(res.body.token, res.body.user);
    }

    testEmployee = await prisma.$base().employees.findFirst({
      where: { company_id: company.id, employee_code: 'EMP-DXB-043' },
      include: { contracts: { include: { department: true } } },
    });
    assert(testEmployee, 'Employee must exist');

    annualType = await prisma.$base().leave_types.findFirst({
      where: { company_id: company.id, code: 'ANNUAL' },
    });
    sickType = await prisma.$base().leave_types.findFirst({
      where: { company_id: company.id, code: { startsWith: 'SICK' } },
    });
    assert(annualType, 'Annual leave type must exist');

    annualAlloc = await prisma.$base().leave_allocations.findFirst({
      where: { company_id: company.id, employee_id: testEmployee.id, leave_type_id: annualType.id },
    });
    assert(annualAlloc, 'Annual leave allocation must exist');

    // Ensure Wed 2026-10-21 statutory public holiday exists
    const hol21 = await prisma.$base().public_holidays.findFirst({
      where: { company_id: company.id, holiday_date: new Date('2026-10-21') },
    });
    if (!hol21) {
      await prisma.$base().public_holidays.create({
        data: {
          company_id: company.id,
          holiday_date: new Date('2026-10-21'),
          name: 'UAE Statutory Public Holiday',
          name_ar: 'عطلة رسمية اتحادية',
          year: 2026,
        },
      });
    }
  });

  it('1. Employee applies 4-day annual leave (Mon–Fri with Wed holiday) -> status Pending at Step 1 (Dept Manager)', async () => {
    // Mon Nov 16 to Fri Nov 20, 2026 (5 calendar days, no holiday in this week) OR Oct 19 to Oct 23 with Wed holiday
    // Let's use Mon 2026-10-19 to Fri 2026-10-23 (Wed 2026-10-21 is public holiday -> exactly 4 working days)
    const res = await request(app)
      .post('/api/v1/leave/requests')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        employee_id: testEmployee.id,
        leave_type_id: annualType.id,
        date_from: '2026-10-19',
        date_to: '2026-10-23',
        reason: 'Unit Test: Annual Vacation',
      });

    assert.equal(res.status, 201, `Failed: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.status, 'success');
    assert.equal(Number(res.body.data.deductible_days), 4.0);

    const leaveId = res.body.data.leave_request.id;

    // Verify approval request was created at Step 1 (DEPT_MANAGER)
    const appReq = await prisma.$base().approval_requests.findFirst({
      where: { record_id: leaveId, request_type: 'LEAVE' },
    });
    assert(appReq, 'Approval request must be linked');
    assert.equal(appReq.current_step, 1);
    assert.equal(appReq.status, 'Pending');

    // Balance remains unchanged before approvals
    const allocBefore = await prisma.$base().leave_allocations.findUnique({
      where: { id: annualAlloc.id },
    });
    const daysTakenBefore = Number(allocBefore.days_taken);

    // 2. GM tries to approve before Step 2 HR -> 403 NOT_CURRENT_APPROVER
    const gmEarlyRes = await request(app)
      .post(`/api/v1/leave/requests/${leaveId}/action`)
      .set('Authorization', `Bearer ${gmToken}`)
      .send({ action: 'Approve' });

    assert.equal(gmEarlyRes.status, 403);
    assert.equal(gmEarlyRes.body.code, 'NOT_CURRENT_APPROVER');

    // 3. Employee tries to approve own request -> 403 (FORBIDDEN or SELF_APPROVAL_FORBIDDEN or NOT_CURRENT_APPROVER)
    const empApproveRes = await request(app)
      .post(`/api/v1/leave/requests/${leaveId}/action`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ action: 'Approve' });

    assert.equal(empApproveRes.status, 403);

    // 4. Dept Manager approves Step 1 -> status remains Pending, advances to Step 2, balance UNCHANGED
    const deptApproveRes = await request(app)
      .post(`/api/v1/leave/requests/${leaveId}/action`)
      .set('Authorization', `Bearer ${deptMgrToken}`)
      .send({ action: 'Approve' });

    assert.equal(deptApproveRes.status, 200, `Dept Manager approve failed: ${JSON.stringify(deptApproveRes.body)}`);

    const appReqAfterStep1 = await prisma.$base().approval_requests.findUnique({
      where: { id: appReq.id },
    });
    assert.equal(appReqAfterStep1.current_step, 2, 'Must advance to Step 2');
    assert.equal(appReqAfterStep1.status, 'Pending', 'Must stay Pending until final step');

    const allocAfterStep1 = await prisma.$base().leave_allocations.findUnique({
      where: { id: annualAlloc.id },
    });
    assert.equal(Number(allocAfterStep1.days_taken), daysTakenBefore, 'Balance must NOT be deducted at Step 1');

    // 5. HR Officer approves Step 2 (type not flagged) -> status Approved, balance deducted by 4.0 ONCE
    const hrApproveRes = await request(app)
      .post(`/api/v1/leave/requests/${leaveId}/action`)
      .set('Authorization', `Bearer ${hrOfficerToken}`)
      .send({ action: 'Approve' });

    assert.equal(hrApproveRes.status, 200, `HR Officer approve failed: ${JSON.stringify(hrApproveRes.body)}`);

    const appReqAfterFinal = await prisma.$base().approval_requests.findUnique({
      where: { id: appReq.id },
    });
    assert.equal(appReqAfterFinal.status, 'Approved', 'Approval request must be Approved');

    const leaveAfterFinal = await prisma.$base().leave_requests.findUnique({
      where: { id: leaveId },
    });
    assert.equal(leaveAfterFinal.status, 'Approved', 'Leave request must be Approved');

    const allocAfterFinal = await prisma.$base().leave_allocations.findUnique({
      where: { id: annualAlloc.id },
    });
    assert.equal(
      Number(allocAfterFinal.days_taken),
      daysTakenBefore + 4.0,
      'Balance must be deducted by exactly 4.0 days'
    );

    // Verify attendance_days marked: exactly 4 days (Mon, Tue, Thu, Fri), skipping Wed public holiday
    const attDays = await prisma.$base().attendance_days.findMany({
      where: { leave_request_id: leaveId },
    });
    assert.equal(attDays.length, 4, 'Must mark exactly 4 attendance days (skipping Wed holiday)');

    // 6. Duplicate Approve call on already Approved request -> 409 ALREADY_COMPLETED, balance untouched
    const dupRes = await request(app)
      .post(`/api/v1/leave/requests/${leaveId}/action`)
      .set('Authorization', `Bearer ${hrOfficerToken}`)
      .send({ action: 'Approve' });

    assert.equal(dupRes.status, 409);
    assert.equal(dupRes.body.code, 'ALREADY_COMPLETED');

    const allocAfterDup = await prisma.$base().leave_allocations.findUnique({
      where: { id: annualAlloc.id },
    });
    assert.equal(
      Number(allocAfterDup.days_taken),
      daysTakenBefore + 4.0,
      'Duplicate approve must NOT deduct balance again'
    );

    // 7. Employee cancels the approved leave -> balance restored by +4.0 exactly, attendance cleared
    const cancelRes = await request(app)
      .post(`/api/v1/leave/requests/${leaveId}/action`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ action: 'Cancel' });

    assert.equal(cancelRes.status, 200);
    assert.equal(cancelRes.body.data.status, 'Cancelled');

    const allocAfterCancel = await prisma.$base().leave_allocations.findUnique({
      where: { id: annualAlloc.id },
    });
    assert.equal(
      Number(allocAfterCancel.days_taken),
      daysTakenBefore,
      'Cancelled leave must restore exactly +4.0 days to balance'
    );

    const attDaysAfterCancel = await prisma.$base().attendance_days.findMany({
      where: { leave_request_id: leaveId },
    });
    assert.equal(attDaysAfterCancel.length, 0, 'Attendance days must be cleared');
  });

  it('2. Flagged leave type requires GM (Step 3) after HR approval', async () => {
    // Clear any overlapping request for test idempotency
    await prisma.$base().leave_requests.deleteMany({
      where: { employee_id: testEmployee.id, date_from: new Date('2026-11-09') },
    });

    // Flagged leave type: update a leave type to needs_gm = true
    const flaggedType = await prisma.$base().leave_types.create({
      data: {
        company_id: company.id,
        name: 'Hajj Pilgrimage Leave',
        name_ar: 'إجازة الحج',
        code: `HAJJ_${Date.now()}`,
        is_paid: false,
        needs_gm: true,
      },
    });

    const res = await request(app)
      .post('/api/v1/leave/requests')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        employee_id: testEmployee.id,
        leave_type_id: flaggedType.id,
        date_from: '2026-11-09',
        date_to: '2026-11-13',
        reason: 'Hajj leave test',
      });

    assert.equal(res.status, 201);
    const leaveId = res.body.data.leave_request.id;

    // Step 1: Dept Manager approves -> Step 2
    await request(app)
      .post(`/api/v1/leave/requests/${leaveId}/action`)
      .set('Authorization', `Bearer ${deptMgrToken}`)
      .send({ action: 'Approve' });

    // Step 2: HR Officer approves -> Since needs_gm is true, advances to Step 3 (GM) and stays Pending
    const hrRes = await request(app)
      .post(`/api/v1/leave/requests/${leaveId}/action`)
      .set('Authorization', `Bearer ${hrOfficerToken}`)
      .send({ action: 'Approve' });

    assert.equal(hrRes.status, 200);

    const appReq = await prisma.$base().approval_requests.findFirst({
      where: { record_id: leaveId, request_type: 'LEAVE' },
    });
    assert.equal(appReq.current_step, 3, 'Must advance to Step 3 for flagged leave');
    assert.equal(appReq.status, 'Pending');

    // Step 3: GM approves -> Approved
    const gmRes = await request(app)
      .post(`/api/v1/leave/requests/${leaveId}/action`)
      .set('Authorization', `Bearer ${gmToken}`)
      .send({ action: 'Approve' });

    assert.equal(gmRes.status, 200);

    const finalReq = await prisma.$base().approval_requests.findUnique({
      where: { id: appReq.id },
    });
    assert.equal(finalReq.status, 'Approved');
  });

  it('3. Refuse at Step 1 -> status Refused, balance untouched', async () => {
    const res = await request(app)
      .post('/api/v1/leave/requests')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        employee_id: testEmployee.id,
        leave_type_id: annualType.id,
        date_from: '2026-11-23',
        date_to: '2026-11-24',
        reason: 'Refusal test',
      });

    assert.equal(res.status, 201);
    const leaveId = res.body.data.leave_request.id;

    const allocBefore = await prisma.$base().leave_allocations.findUnique({
      where: { id: annualAlloc.id },
    });

    const refuseRes = await request(app)
      .post(`/api/v1/leave/requests/${leaveId}/action`)
      .set('Authorization', `Bearer ${deptMgrToken}`)
      .send({ action: 'Refuse', comment: 'Department operational constraints' });

    assert.equal(refuseRes.status, 200);

    const leave = await prisma.$base().leave_requests.findUnique({ where: { id: leaveId } });
    assert.equal(leave.status, 'Refused');

    const allocAfter = await prisma.$base().leave_allocations.findUnique({
      where: { id: annualAlloc.id },
    });
    assert.equal(Number(allocAfter.days_taken), Number(allocBefore.days_taken), 'Balance untouched on refuse');
  });

  it('4. Refuse with missing or short comment (<10 chars) returns 400 REASON_REQUIRED', async () => {
    const res = await request(app)
      .post('/api/v1/leave/requests')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        employee_id: testEmployee.id,
        leave_type_id: annualType.id,
        date_from: '2026-11-26',
        date_to: '2026-11-27',
        reason: 'Reason validation test',
      });

    assert.equal(res.status, 201);
    const leaveId = res.body.data.leave_request.id;

    // A. Missing comment
    const resNoComment = await request(app)
      .post(`/api/v1/leave/requests/${leaveId}/action`)
      .set('Authorization', `Bearer ${deptMgrToken}`)
      .send({ action: 'Refuse' });

    assert.equal(resNoComment.status, 400);
    assert.equal(resNoComment.body.code, 'REASON_REQUIRED');

    // B. Short comment (<10 chars)
    const resShortComment = await request(app)
      .post(`/api/v1/leave/requests/${leaveId}/action`)
      .set('Authorization', `Bearer ${deptMgrToken}`)
      .send({ action: 'Refuse', comment: 'Too short' });

    assert.equal(resShortComment.status, 400);
    assert.equal(resShortComment.body.code, 'REASON_REQUIRED');

    // C. Action 'Reject' with short comment
    const resRejectShort = await request(app)
      .post(`/api/v1/leave/requests/${leaveId}/action`)
      .set('Authorization', `Bearer ${deptMgrToken}`)
      .send({ action: 'Reject', comment: 'No' });

    assert.equal(resRejectShort.status, 400);
    assert.equal(resRejectShort.body.code, 'REASON_REQUIRED');

    // Clean up
    await prisma.$base().leave_requests.delete({ where: { id: leaveId } });
  });

  it('5. Direct leaveService.actOnLeave with Refuse/Reject and comment <10 chars throws 400 REASON_REQUIRED', async () => {
    const res = await request(app)
      .post('/api/v1/leave/requests')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        employee_id: testEmployee.id,
        leave_type_id: annualType.id,
        date_from: '2026-12-01',
        date_to: '2026-12-02',
        reason: 'Direct service rejection test',
      });

    assert.equal(res.status, 201);
    const leaveId = res.body.data.leave_request.id;

    try {
      await leaveService.actOnLeave({
        companyId: company.id,
        id: leaveId,
        action: 'Refuse',
        comment: 'short',
        userId: deptMgrUser.id,
      });
      assert.fail('Should have thrown 400 REASON_REQUIRED');
    } catch (err) {
      assert.equal(err.status, 400, `Expected status 400 but got: ${err.status} (${err.message})`);
      assert.equal(err.code, 'REASON_REQUIRED');
    }

    // Clean up
    await prisma.$base().leave_requests.delete({ where: { id: leaveId } });
  });

  it('6. Approve without comment does not fabricate "Administrative approval of leave request"', async () => {
    const res = await request(app)
      .post('/api/v1/leave/requests')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        employee_id: testEmployee.id,
        leave_type_id: annualType.id,
        date_from: '2026-12-08',
        date_to: '2026-12-09',
        reason: 'No fabricated approval string test',
      });

    assert.equal(res.status, 201);
    const leaveId = res.body.data.leave_request.id;

    const approveRes = await request(app)
      .post(`/api/v1/leave/requests/${leaveId}/action`)
      .set('Authorization', `Bearer ${deptMgrToken}`)
      .send({ action: 'Approve' });

    assert.equal(approveRes.status, 200);

    const appReq = await prisma.$base().approval_requests.findFirst({
      where: { record_id: leaveId, request_type: 'LEAVE' },
    });
    assert.ok(appReq, 'Approval request must exist');

    const actionRecord = await prisma.$base().approval_actions.findFirst({
      where: {
        approval_request_id: appReq.id,
        acted_by: deptMgrUser.id,
      },
      orderBy: { acted_at: 'desc' },
    });

    assert.ok(actionRecord, 'Action record must exist');
    assert.notEqual(
      actionRecord.comment,
      'Administrative approval of leave request',
      'Must NOT fabricate Administrative approval comment'
    );
  });

  it('7. Company Admin without explicit override fails with 403 ADMIN_OVERRIDE_REQUIRED on LEAVE', async () => {
    const res = await request(app)
      .post('/api/v1/leave/requests')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        employee_id: testEmployee.id,
        leave_type_id: annualType.id,
        date_from: '2026-07-01',
        date_to: '2026-07-02',
        reason: 'Admin override required test',
      });

    assert.equal(res.status, 201);
    const leaveId = res.body.data.leave_request.id;

    // Admin attempts to approve without override: true -> 403 ADMIN_OVERRIDE_REQUIRED
    const resNoOverride = await request(app)
      .post(`/api/v1/leave/requests/${leaveId}/action`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'Approve' });

    assert.equal(resNoOverride.status, 403);
    assert.equal(resNoOverride.body.code, 'ADMIN_OVERRIDE_REQUIRED');

    // Clean up
    await prisma.$base().leave_requests.delete({ where: { id: leaveId } });
  });

  it('8. Company Admin with override: true but short reason (<10 chars) fails with 400 REASON_REQUIRED on LEAVE', async () => {
    const res = await request(app)
      .post('/api/v1/leave/requests')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        employee_id: testEmployee.id,
        leave_type_id: annualType.id,
        date_from: '2026-07-06',
        date_to: '2026-07-07',
        reason: 'Admin short reason test',
      });

    assert.equal(res.status, 201);
    const leaveId = res.body.data.leave_request.id;

    const resShortReason = await request(app)
      .post(`/api/v1/leave/requests/${leaveId}/action`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'Approve', override: true, comment: 'Short' });

    assert.equal(resShortReason.status, 400);
    assert.equal(resShortReason.body.code, 'REASON_REQUIRED');

    // Clean up
    await prisma.$base().leave_requests.delete({ where: { id: leaveId } });
  });

  it('9. Company Admin with explicit override=true and reason >=10 chars succeeds, logs OVERRIDE and audit log', async () => {
    const res = await request(app)
      .post('/api/v1/leave/requests')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        employee_id: testEmployee.id,
        leave_type_id: annualType.id,
        date_from: '2026-07-13',
        date_to: '2026-07-14',
        reason: 'Admin valid override test',
      });

    assert.equal(res.status, 201);
    const leaveId = res.body.data.leave_request.id;

    const overrideReason = 'Executive administrative override due to line manager emergency leave';
    const resOverride = await request(app)
      .post(`/api/v1/leave/requests/${leaveId}/action`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'Approve', override: true, comment: overrideReason });

    assert.equal(resOverride.status, 200);

    const appReq = await prisma.$base().approval_requests.findFirst({
      where: { record_id: leaveId, request_type: 'LEAVE' },
    });
    assert.equal(appReq.status, 'Approved');

    // Verify approval_actions record
    const actionRecord = await prisma.$base().approval_actions.findFirst({
      where: {
        approval_request_id: appReq.id,
        acted_by: adminUser.id,
      },
      orderBy: { acted_at: 'desc' },
    });
    assert.ok(actionRecord);
    assert.equal(actionRecord.action, 'OVERRIDE');
    assert.ok(actionRecord.comment.includes('[override=true]'));

    // Verify audit_logs record
    const auditRecord = await prisma.$base().audit_logs.findFirst({
      where: {
        record_id: appReq.id,
        user_id: adminUser.id,
        action: 'APPROVAL_OVERRIDE',
      },
      orderBy: { created_at: 'desc' },
    });
    assert.ok(auditRecord, 'Must record APPROVAL_OVERRIDE in audit_logs');
  });
});
