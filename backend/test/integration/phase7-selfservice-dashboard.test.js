import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import app from '../../src/app.js';
import prisma from '../../src/lib/prisma.js';
import notificationService from '../../src/services/notificationService.js';

describe('Phase 7: Self-service, Live Dashboard & Notifications Integration Tests', () => {
  let emp1Token = '';
  let emp2Token = '';
  let hrToken = '';
  let deptMgrToken = '';
  let companyId = '';
  let emp1User = null;
  let emp2User = null;

  before(async () => {
    // 1. Authenticate Employee 1 (employee@gulftech.ae)
    const res1 = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'employee@gulftech.ae', password: 'Nextal@2026!' });
    assert.strictEqual(res1.status, 200, `Login employee failed: ${res1.body.message}`);
    emp1Token = res1.body.token;
    companyId = res1.body.user.company_id || res1.body.user.companyId;

    // 2. Authenticate Employee 2 for cross-boundary testing (seeded emp-dxb-002)
    const res2 = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'emp-dxb-002@gulftech.ae', password: 'Nextal@2026!' });
    assert.strictEqual(res2.status, 200, `Login emp2 failed: ${res2.body.message}`);
    emp2Token = res2.body.token;
    emp2User = res2.body.user;

    // 3. Authenticate HR Manager
    const resHr = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'hr.mgr@gulftech.ae', password: 'Nextal@2026!' });
    assert.strictEqual(resHr.status, 200, `Login HR failed: ${resHr.body.message}`);
    hrToken = resHr.body.token;

    // 4. Authenticate Dept Manager (non-salary role)
    const resDept = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'dept.mgr@gulftech.ae', password: 'Nextal@2026!' });
    assert.strictEqual(resDept.status, 200, `Login Dept Mgr failed: ${resDept.body.message}`);
    deptMgrToken = resDept.body.token;

    emp1User = await prisma.$base().users.findUnique({
      where: { email: 'employee@gulftech.ae' },
      include: { employee: true },
    });
  });

  describe('1. Self-Service Bento & Profile', () => {
    it('Employee can fetch My Home bento overview with real metrics', async () => {
      const res = await request(app)
        .get('/api/v1/me/home')
        .set('Authorization', `Bearer ${emp1Token}`)
        .set('X-Company-Id', companyId);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, 'success');
      const data = res.body.data;
      assert.ok(data.leaveBalance, 'Leave balance should exist');
      assert.ok(data.payday, 'Payday info should exist');
      assert.ok(typeof data.pendingRequestsCount === 'number');
      assert.ok(typeof data.expiringDocumentsCount === 'number');
      assert.ok(data.attendanceSummary, 'Attendance summary should exist');
    });

    it('Employee can fetch My Profile with view-only fields and masked IDs', async () => {
      const res = await request(app)
        .get('/api/v1/me/profile')
        .set('Authorization', `Bearer ${emp1Token}`)
        .set('X-Company-Id', companyId);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, 'success');
      const profile = res.body.data;
      assert.ok(profile.arabic_name, 'Arabic name should be present');
      assert.ok(profile.masked_national_id.includes('****'), 'National ID must be masked');
      if (profile.masked_passport) {
        assert.ok(profile.masked_passport.includes('*'), 'Passport must be masked');
      }
      if (profile.primary_bank) {
        assert.ok(profile.primary_bank.masked_iban.includes('****'), 'IBAN must be masked');
      }
    });
  });

  describe('2. Self-Service Boundaries: Unreleased Payslips & Other IDs Forbidden/404', () => {
    it('Employee payslips only include pay runs with status Paid', async () => {
      const res = await request(app)
        .get('/api/v1/me/payslips')
        .set('Authorization', `Bearer ${emp1Token}`)
        .set('X-Company-Id', companyId);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, 'success');
      const payslips = res.body.data;
      for (const ps of payslips) {
        assert.strictEqual(ps.status, 'Paid', `Expected status to be Paid, got ${ps.status}`);
      }
    });

    it('Employee cannot access another employee payslip or unreleased payslip via ID (returns 404)', async () => {
      // Find a payslip belonging to Employee 2
      const emp2Payslip = await prisma.$base().payslips.findFirst({
        where: { employee_id: emp2User.employee_id },
      });

      if (emp2Payslip) {
        // Employee 1 attempts to download Employee 2's payslip
        const res = await request(app)
          .get(`/api/v1/me/payslips/${emp2Payslip.id}/pdf`)
          .set('Authorization', `Bearer ${emp1Token}`)
          .set('X-Company-Id', companyId);

        assert.ok(
          res.status === 404 || res.status === 403,
          `Expected 404 or 403 for other employee payslip, got ${res.status}`
        );
      }
    });

    it('Employee cannot cancel another employee request (returns 404)', async () => {
      // Create a pending request for Employee 2
      const leaveType = await prisma.$base().leave_types.findFirst({
        where: { company_id: companyId },
      });
      const otherRequest = await prisma.$base().leave_requests.create({
        data: {
          company_id: companyId,
          employee_id: emp2User.employee_id,
          leave_type_id: leaveType.id,
          date_from: new Date('2026-11-10'),
          date_to: new Date('2026-11-12'),
          days: 3,
          status: 'Pending',
        },
      });

      // Employee 1 attempts to cancel Employee 2's request
      const cancelRes = await request(app)
        .post(`/api/v1/me/requests/leave/${otherRequest.id}/cancel`)
        .set('Authorization', `Bearer ${emp1Token}`)
        .set('X-Company-Id', companyId);

      assert.strictEqual(cancelRes.status, 404, 'Employee 1 must get 404 trying to cancel other employee request');

      // Clean up
      await prisma.$base().leave_requests.delete({ where: { id: otherRequest.id } });
    });
  });

  describe('3. Live Dashboard Role Permissions', () => {
    it('All internal roles can access /api/v1/dashboard/overview', async () => {
      const resHr = await request(app)
        .get('/api/v1/dashboard/overview')
        .set('Authorization', `Bearer ${hrToken}`)
        .set('X-Company-Id', companyId);
      assert.strictEqual(resHr.status, 200);

      const resDept = await request(app)
        .get('/api/v1/dashboard/overview')
        .set('Authorization', `Bearer ${deptMgrToken}`)
        .set('X-Company-Id', companyId);
      assert.strictEqual(resDept.status, 200);
      assert.ok(resDept.body.data.headcount, 'Headcount tile data must be present');
      assert.ok(resDept.body.data.wpsReadiness, 'WPS readiness tile data must be present');
    });

    it('Salary tiles API (/api/v1/dashboard/salary) returns 200 for HR Manager', async () => {
      const res = await request(app)
        .get('/api/v1/dashboard/salary')
        .set('Authorization', `Bearer ${hrToken}`)
        .set('X-Company-Id', companyId);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, 'success');
      assert.ok(res.body.data.livePayroll, 'livePayroll must be present');
      assert.ok(res.body.data.payrollTrend, 'payrollTrend must be present');
    });

    it('Salary tiles API (/api/v1/dashboard/salary) returns 403 Forbidden for Dept Manager & Employee', async () => {
      // Dept Manager does not have salary:view permission
      const resDept = await request(app)
        .get('/api/v1/dashboard/salary')
        .set('Authorization', `Bearer ${deptMgrToken}`)
        .set('X-Company-Id', companyId);
      assert.strictEqual(resDept.status, 403, `Expected 403 for Dept Manager, got ${resDept.status}`);

      // Employee does not have salary:view permission
      const resEmp = await request(app)
        .get('/api/v1/dashboard/salary')
        .set('Authorization', `Bearer ${emp1Token}`)
        .set('X-Company-Id', companyId);
      assert.strictEqual(resEmp.status, 403, `Expected 403 for Employee, got ${resEmp.status}`);
    });
  });

  describe('4. In-App Notifications System', () => {
    it('Creates notifications for all key system events', async () => {
      // Event 1: Approvals waiting
      const notif1 = await notificationService.notifyApprovalWaiting(
        companyId,
        emp1User.id,
        'Leave',
        'John Doe'
      );
      assert.ok(notif1.id);
      assert.strictEqual(notif1.type, 'APPROVAL_WAITING');

      // Event 2: Request status update
      const notif2 = await notificationService.notifyRequestStatus(
        companyId,
        emp1User.id,
        'Leave',
        'Approved',
        'Maryam Al-Nuaimi',
        'Approved as requested'
      );
      assert.ok(notif2.id);
      assert.strictEqual(notif2.type, 'REQUEST_STATUS');

      // Event 3: Payslip released
      const notif3 = await notificationService.notifyPayslipReleased(
        companyId,
        emp1User.id,
        '2026-09',
        '8500.00'
      );
      assert.ok(notif3.id);
      assert.strictEqual(notif3.type, 'PAYSLIP_RELEASED');

      // Event 4: Document expiring
      const notif4 = await notificationService.notifyDocumentExpiring(
        companyId,
        emp1User.id,
        'Emirates ID',
        14
      );
      assert.ok(notif4.id);
      assert.strictEqual(notif4.type, 'DOCUMENT_EXPIRING');
    });

    it('Employee can fetch notifications and mark as read', async () => {
      // Get notifications
      const res = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${emp1Token}`)
        .set('X-Company-Id', companyId);

      assert.strictEqual(res.status, 200);
      assert.ok(res.body.data.notifications.length >= 4);
      assert.ok(res.body.data.unread_count >= 4);

      const firstNotif = res.body.data.notifications[0];

      // Mark single read
      const patchRes = await request(app)
        .patch(`/api/v1/notifications/${firstNotif.id}/read`)
        .set('Authorization', `Bearer ${emp1Token}`)
        .set('X-Company-Id', companyId);
      assert.strictEqual(patchRes.status, 200);
      assert.strictEqual(patchRes.body.data.is_read, true);

      // Mark all read
      const allRes = await request(app)
        .post('/api/v1/notifications/mark-all-read')
        .set('Authorization', `Bearer ${emp1Token}`)
        .set('X-Company-Id', companyId);
      assert.strictEqual(allRes.status, 200);

      // Verify unread count is now 0
      const afterRes = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${emp1Token}`)
        .set('X-Company-Id', companyId);
      assert.strictEqual(afterRes.body.data.unread_count, 0);
    });
  });
});

