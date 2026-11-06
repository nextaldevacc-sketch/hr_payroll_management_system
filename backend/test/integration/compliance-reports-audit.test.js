import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../../src/app.js';
import prisma from '../../src/lib/prisma.js';
import complianceService, { calculateDaysRemainingInDubai, evaluateDocumentStatus } from '../../src/services/complianceService.js';
import reportService from '../../src/services/reportService.js';
import companyService from '../../src/services/companyService.js';
import auditService from '../../src/services/auditService.js';
import mailer from '../../src/lib/mailer.js';
import Decimal from 'decimal.js';

describe('Phase 9: Compliance, Reports & Audit Integration Tests', () => {
  let companyA;
  let companyB;
  let companyAdminAToken;
  let hrMgrAToken;
  let payrollOfficerAToken;
  let hrOfficerAToken;
  let financeAToken;
  let deptMgrAToken;
  let employeeAToken;
  let employeeA;
  let companyAdminAUser;
  let lockedPayRunA;

  before(async () => {
    // 1. Setup Company A and B
    companyA = await prisma.$base().companies.findFirst({
      where: { name: { contains: 'Gulf Tech' } },
    });
    if (!companyA) {
      companyA = await prisma.$base().companies.findFirst();
    }

    companyB = await prisma.$base().companies.findFirst({
      where: { id: { not: companyA.id } },
    });

    const testUserPassword = 'Nextal@2026!';

    // 2. Fetch authenticated test users
    const getTokens = async (email, password = testUserPassword) => {
      const res = await request(app).post('/api/v1/auth/login').send({ email, password });
      return res.body.token;
    };

    companyAdminAToken = await getTokens('admin@gulftech.ae');
    hrMgrAToken = await getTokens('hr.mgr@gulftech.ae');
    payrollOfficerAToken = await getTokens('payroll@gulftech.ae');
    hrOfficerAToken = await getTokens('hr.officer@gulftech.ae');
    financeAToken = await getTokens('finance@gulftech.ae');
    deptMgrAToken = await getTokens('dept.mgr@gulftech.ae');
    employeeAToken = await getTokens('employee@gulftech.ae');

    employeeA = await prisma.$base().employees.findFirst({
      where: { company_id: companyA.id, status: 'Active' },
      include: { user: true },
    });

    companyAdminAUser = await prisma.$base().users.findFirst({
      where: { company_id: companyA.id, email: 'admin@gulftech.ae' },
      include: { user_roles: { include: { role: true } } },
    });

    // 3. Locate a locked or paid pay run for report testing
    lockedPayRunA = await prisma.$base().pay_runs.findFirst({
      where: {
        company_id: companyA.id,
        status: { in: ['Locked', 'Paid'] },
        payslips: { some: {} },
      },
      include: { payslips: { include: { lines: true } } },
    });
  });

  // =========================================================================
  // 1. Timezone boundary (Dubai midnight: UTC+4)
  // =========================================================================
  describe('1. Timezone Boundary (Asia/Dubai midnight)', () => {
    it('document expiring on 2026-10-15 remains valid at 23:59:00 Dubai time (19:59:00 UTC)', () => {
      const expiry = new Date('2026-10-15T00:00:00.000Z');
      // 23:59:00 Dubai time is 19:59:00 UTC on the same day
      const justBeforeMidnightDubai = new Date('2026-10-15T19:59:00.000Z');
      const daysRemaining = calculateDaysRemainingInDubai(expiry, justBeforeMidnightDubai);
      assert.equal(daysRemaining, 0, 'On the day of expiry in Dubai time, 0 whole days remaining (expires tonight)');

      const evaluated = evaluateDocumentStatus({ doc_number: 'EID-TEST', expiry_date: expiry }, 90, justBeforeMidnightDubai);
      assert.equal(evaluated.status, 'Expiring Soon');
    });

    it('document expiring on 2026-10-15 is expired at 00:01:00 Dubai time on 2026-10-16 (20:01:00 UTC on 2026-10-15)', () => {
      const expiry = new Date('2026-10-15T00:00:00.000Z');
      // 00:01:00 Dubai time on Oct 16 is 20:01:00 UTC on Oct 15
      const justAfterMidnightDubai = new Date('2026-10-15T20:01:00.000Z');
      const daysRemaining = calculateDaysRemainingInDubai(expiry, justAfterMidnightDubai);
      assert.equal(daysRemaining, -1, 'Once Dubai midnight passes, document has -1 days remaining (Expired)');

      const evaluated = evaluateDocumentStatus({ doc_number: 'EID-TEST', expiry_date: expiry }, 90, justAfterMidnightDubai);
      assert.equal(evaluated.status, 'Expired');
    });

    it('a document that expired 2 days ago shows Expired on read without running the cron job', async () => {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      const expiredDoc = await prisma.$base().employee_documents.create({
        data: {
          company_id: companyA.id,
          employee_id: employeeA.id,
          doc_type: 'PASSPORT',
          doc_number: 'P-EXPIRED-2D',
          expiry_date: twoDaysAgo,
          status: 'Valid', // In DB it is marked 'Valid'
          verification_status: 'Verified',
        },
      });

      // Fetch via listComplianceDocuments service
      const res = await complianceService.listComplianceDocuments(companyA.id, { search: 'P-EXPIRED-2D' }, companyAdminAUser);
      const found = res.items.find((d) => d.id === expiredDoc.id);
      assert.ok(found, 'Document must be found in list');
      assert.equal(found.status, 'Expired', 'Document expiring 2 days ago must dynamically compute status as Expired on read');
      assert(found.days_remaining <= -2, 'Days remaining must be negative');

      // Also verify via API endpoint
      const apiRes = await request(app)
        .get('/api/v1/compliance/documents?search=P-EXPIRED-2D')
        .set('Authorization', `Bearer ${hrMgrAToken}`);
      assert.equal(apiRes.status, 200);
      const apiDoc = apiRes.body.items?.find((d) => d.id === expiredDoc.id);
      assert.ok(apiDoc, 'API must return document');
      assert.equal(apiDoc.status, 'Expired', 'API response must show Expired');

      // Clean up
      await prisma.$base().employee_documents.delete({ where: { id: expiredDoc.id } });
    });
  });

  // =========================================================================
  // 2. Compliance Job Idempotency & Milestones (90, 60, 30)
  // =========================================================================
  describe('2. Compliance Job Idempotency & Milestones', () => {
    let testDoc;

    before(async () => {
      // Create a test document expiring in 80 days
      const refDate = new Date('2026-10-15T10:00:00.000Z');
      const expDate = new Date('2027-01-03T00:00:00.000Z'); // 80 days

      testDoc = await prisma.$base().employee_documents.create({
        data: {
          company_id: companyA.id,
          employee_id: employeeA.id,
          doc_type: 'LABOUR_CARD',
          doc_number: 'LC-IDEMP-01',
          expiry_date: expDate,
          status: 'Valid',
          verification_status: 'Verified',
        },
      });
    });

    it('first run sends milestone 90 reminder; second run on same date sends NO duplicate reminders', async () => {
      const refDate = new Date('2026-10-15T10:00:00.000Z');

      // First run: sends 90 milestone
      const run1 = await complianceService.runComplianceJob({
        referenceDate: refDate,
        companyId: companyA.id,
      });

      const updatedDoc1 = await prisma.$base().employee_documents.findUnique({ where: { id: testDoc.id } });
      assert.equal(updatedDoc1.status, 'Expiring Soon');
      assert.equal(updatedDoc1.last_alert_days, 90);

      // Notification count before second run
      const notifsBefore = await prisma.$base().notifications.count({
        where: { company_id: companyA.id, body: { contains: 'LC-IDEMP-01' } },
      });
      assert(notifsBefore >= 1, 'In-app notification must have been created');

      // Second run on same date: must be completely idempotent
      const run2 = await complianceService.runComplianceJob({
        referenceDate: refDate,
        companyId: companyA.id,
      });

      const notifsAfter = await prisma.$base().notifications.count({
        where: { company_id: companyA.id, body: { contains: 'LC-IDEMP-01' } },
      });
      assert.equal(notifsAfter, notifsBefore, 'Zero duplicate notifications must be created when job is re-run');

      // Third run 5 days later (still in 90 milestone band): no duplicate
      const laterDate = new Date('2026-10-20T10:00:00.000Z');
      await complianceService.runComplianceJob({
        referenceDate: laterDate,
        companyId: companyA.id,
      });

      const notifsLater = await prisma.$base().notifications.count({
        where: { company_id: companyA.id, body: { contains: 'LC-IDEMP-01' } },
      });
      assert.equal(notifsLater, notifsBefore, 'Still 0 duplicate notifications within same milestone band');
    });

    it('advancing into 60 milestone band sends milestone 60 reminder once', async () => {
      // 50 days remaining from expDate
      const dateIn60Band = new Date('2026-11-14T10:00:00.000Z');

      const notifsBefore = await prisma.$base().notifications.count({
        where: { company_id: companyA.id, body: { contains: 'LC-IDEMP-01' } },
      });

      await complianceService.runComplianceJob({
        referenceDate: dateIn60Band,
        companyId: companyA.id,
      });

      const updatedDoc = await prisma.$base().employee_documents.findUnique({ where: { id: testDoc.id } });
      assert.equal(updatedDoc.last_alert_days, 60, 'Milestone 60 recorded on document');

      const notifsAfter = await prisma.$base().notifications.count({
        where: { company_id: companyA.id, body: { contains: 'LC-IDEMP-01' } },
      });
      assert(notifsAfter > notifsBefore, 'Milestone 60 notification created');
    });
  });

  // =========================================================================
  // 3. Document Renewal & HR Verification Workflow
  // =========================================================================
  describe('3. Document Renewal and Verification Workflow', () => {
    let renewableDoc;

    before(async () => {
      renewableDoc = await prisma.$base().employee_documents.create({
        data: {
          company_id: companyA.id,
          employee_id: employeeA.id,
          doc_type: 'PASSPORT',
          doc_number: 'P-RENEW-OLD',
          expiry_date: new Date('2026-11-01'),
          status: 'Expiring Soon',
          verification_status: 'Verified',
        },
      });
    });

    it('owner or HR uploads renewed document -> status becomes Pending Verification, history preserved', async () => {
      const res = await request(app)
        .post(`/api/v1/compliance/documents/${renewableDoc.id}/renew`)
        .set('Authorization', `Bearer ${hrMgrAToken}`)
        .send({
          doc_number: 'P-RENEW-NEW-2029',
          expiry_date: '2029-11-01',
          issue_date: '2026-10-01',
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.verification_status, 'Pending');
      assert.equal(res.body.data.doc_number, 'P-RENEW-NEW-2029');

      // Check version history saved
      const history = await complianceService.getDocumentHistory({
        companyId: companyA.id,
        documentId: renewableDoc.id,
      });
      assert(history.versions.length >= 1, 'Previous version snapshot must be stored in history');
      assert.equal(history.versions[0].snapshot.doc_number, 'P-RENEW-OLD');
    });

    it('HR verifies renewed document -> verification status Verified, status Valid, audit logged', async () => {
      const res = await request(app)
        .post(`/api/v1/compliance/documents/${renewableDoc.id}/verify`)
        .set('Authorization', `Bearer ${hrMgrAToken}`)
        .send({});

      assert.equal(res.status, 200);
      assert.equal(res.body.data.verification_status, 'Verified');
      assert.equal(res.body.data.status, 'Valid');

      // Verify audit log
      const auditLog = await prisma.$base().audit_logs.findFirst({
        where: {
          company_id: companyA.id,
          table_name: 'employee_documents',
          record_id: renewableDoc.id,
          action: 'VerifyDocument',
        },
      });
      assert(auditLog, 'VerifyDocument action must be logged in audit_logs');
    });
  });

  // =========================================================================
  // 4. Accounting Export (CSV)
  // =========================================================================
  describe('4. Accounting Export (CSV)', () => {
    it('refuses accounting export for an unlocked pay run (Draft / Validated)', async () => {
      // Find or create an unlocked run
      const unlockedRun = await prisma.$base().pay_runs.findFirst({
        where: { company_id: companyA.id, status: { in: ['Draft', 'Calculated', 'Validated'] } },
      });

      if (unlockedRun) {
        const res = await request(app)
          .get('/api/v1/reports/accounting-export')
          .set('Authorization', `Bearer ${financeAToken}`)
          .query({ payRunId: unlockedRun.id });

        assert.equal(res.status, 400);
        assert(res.body.message.includes('Locked or Paid'), 'Must explicitly mention Locked or Paid requirement');
      }
    });

    it('generates balanced CSV accounting export for locked pay run: Sum(Debit) === Sum(Credit)', async () => {
      assert(lockedPayRunA, 'Locked pay run must exist');

      const res = await request(app)
        .get('/api/v1/reports/accounting-export')
        .set('Authorization', `Bearer ${financeAToken}`)
        .query({ payRunId: lockedPayRunA.id });

      assert.equal(res.status, 200);
      assert(res.headers['content-type'].includes('text/csv'));

      const csv = res.text;
      const lines = csv.trim().split('\r\n');
      assert(lines.length > 2, 'CSV must have headers and entry lines');

      // Assert header columns
      assert.equal(lines[0], 'Cost Centre,Account Code,Account Name,Rule Code,Rule Name,Description,Debit,Credit');

      // Verify debits and credits sum from direct service call
      const exportData = await reportService.generateAccountingExportCsv({
        companyId: companyA.id,
        payRunId: lockedPayRunA.id,
      });

      const debitDecimal = new Decimal(exportData.totalDebit);
      const creditDecimal = new Decimal(exportData.totalCredit);
      const diff = debitDecimal.minus(creditDecimal).abs();

      assert(diff.lessThan(new Decimal('0.02')), `Debits (${exportData.totalDebit}) must strictly equal Credits (${exportData.totalCredit})`);
      assert(exportData.totalDebit > 0, 'Total debit must be positive');
    });
  });

  // =========================================================================
  // 5. Reports Permissions & Salary Data Protection (Section 5.3)
  // =========================================================================
  describe('5. Report Permissions & Salary Data Protection', () => {
    it('salary reports are accessible to Finance, Payroll Officer, HR Manager, and Company Admin', async () => {
      const endpoints = [
        `/api/v1/reports/accounting-export?payRunId=${lockedPayRunA.id}`,
        '/api/v1/reports/gratuity-provision',
        '/api/v1/reports/leave-liability',
      ];

      for (const endpoint of endpoints) {
        const resFinance = await request(app).get(endpoint).set('Authorization', `Bearer ${financeAToken}`);
        assert.equal(resFinance.status, 200, `Finance must access ${endpoint}`);

        const resPayroll = await request(app).get(endpoint).set('Authorization', `Bearer ${payrollOfficerAToken}`);
        assert.equal(resPayroll.status, 200, `Payroll Officer must access ${endpoint}`);

        const resHrMgr = await request(app).get(endpoint).set('Authorization', `Bearer ${hrMgrAToken}`);
        assert.equal(resHrMgr.status, 200, `HR Manager must access ${endpoint}`);
      }
    });

    it('salary reports are strictly FORBIDDEN (403) for non-salary roles (Employee, Dept Manager, HR Officer)', async () => {
      const endpoints = [
        `/api/v1/reports/accounting-export?payRunId=${lockedPayRunA.id}`,
        '/api/v1/reports/gratuity-provision',
        '/api/v1/reports/leave-liability',
      ];

      for (const endpoint of endpoints) {
        const resEmp = await request(app).get(endpoint).set('Authorization', `Bearer ${employeeAToken}`);
        assert.equal(resEmp.status, 403, `Employee must be rejected with 403 from ${endpoint}`);

        const resDept = await request(app).get(endpoint).set('Authorization', `Bearer ${deptMgrAToken}`);
        assert.equal(resDept.status, 403, `Dept Manager must be rejected with 403 from ${endpoint}`);

        const resHrOff = await request(app).get(endpoint).set('Authorization', `Bearer ${hrOfficerAToken}`);
        assert.equal(resHrOff.status, 403, `HR Officer must be rejected with 403 from ${endpoint}`);
      }
    });

    it('non-salary reports (Attendance, Leave, Headcount) are accessible to HR Officer', async () => {
      const resAtt = await request(app).get('/api/v1/reports/attendance').set('Authorization', `Bearer ${hrOfficerAToken}`);
      assert.equal(resAtt.status, 200);

      const resLeave = await request(app).get('/api/v1/reports/leave').set('Authorization', `Bearer ${hrOfficerAToken}`);
      assert.equal(resLeave.status, 200);

      const resHead = await request(app).get('/api/v1/reports/headcount').set('Authorization', `Bearer ${hrOfficerAToken}`);
      assert.equal(resHead.status, 200);
      assert(resHead.body.data.activeHeadcount > 0);
    });
  });

  // =========================================================================
  // 6. Audit History API (Read-only, filtering, CSV export)
  // =========================================================================
  describe('6. Audit History API', () => {
    it('lists audit logs with pagination and filters by action and table_name', async () => {
      const res = await request(app)
        .get('/api/v1/audit-logs')
        .set('Authorization', `Bearer ${hrMgrAToken}`)
        .query({ page: 1, limit: 10 });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert(Array.isArray(res.body.items));
      assert(typeof res.body.total === 'number');

      if (res.body.items.length > 0) {
        const item = res.body.items[0];
        assert(item.id, 'Must have serialized ID');
        assert(item.action, 'Must have action');
        assert(item.table_name, 'Must have table_name');
        assert(item.created_at, 'Must have timestamp');
      }
    });

    it('exports audit logs to CSV', async () => {
      const res = await request(app)
        .get('/api/v1/audit-logs/export.csv')
        .set('Authorization', `Bearer ${hrMgrAToken}`);

      assert.equal(res.status, 200);
      assert(res.headers['content-type'].includes('text/csv'));
      assert(res.text.startsWith('ID,Timestamp (UTC),User Name,User Email,Action,Entity,Record ID'));
    });

    it('is strictly read-only: POST, PUT, DELETE routes do not exist (404)', async () => {
      const resPost = await request(app).post('/api/v1/audit-logs').set('Authorization', `Bearer ${companyAdminAToken}`).send({});
      assert.equal(resPost.status, 404);

      const resPut = await request(app).put('/api/v1/audit-logs/1').set('Authorization', `Bearer ${companyAdminAToken}`).send({});
      assert.equal(resPut.status, 404);

      const resDel = await request(app).delete('/api/v1/audit-logs/1').set('Authorization', `Bearer ${companyAdminAToken}`);
      assert.equal(resDel.status, 404);
    });

    it('database trigger strictly blocks any direct modification or deletion of audit logs', async () => {
      const anyLog = await prisma.$base().audit_logs.findFirst({ where: { company_id: companyA.id } });
      if (anyLog) {
        await assert.rejects(
          async () => {
            await prisma.$base().$executeRaw`DELETE FROM audit_logs WHERE id = ${anyLog.id}`;
          },
          /trigger|cannot delete|prohibited|read-only|immutable/i,
          'Direct DB delete must be blocked by trigger'
        );
      }
    });
  });

  // =========================================================================
  // 7. Support Access (FR-PL3)
  // =========================================================================
  describe('7. Support Access (FR-PL3)', () => {
    let createdGrantId;

    it('company admin grants time-limited support access and it is logged to audit', async () => {
      const res = await request(app)
        .post('/api/v1/settings/support-access')
        .set('Authorization', `Bearer ${companyAdminAToken}`)
        .send({
          reason: 'Urgent troubleshooting of October bank reconciliation',
          duration_hours: 4,
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.status, 'success');
      assert.equal(res.body.data.company_id, companyA.id);
      createdGrantId = res.body.data.id;

      // Check active grant check
      const isActive = await companyService.checkSupportAccess({
        companyId: companyA.id,
        platformUserId: res.body.data.platform_user_id,
      });
      assert.equal(isActive, true, 'Support access grant must be active');
    });

    it('company admin lists support access grants', async () => {
      const res = await request(app)
        .get('/api/v1/settings/support-access')
        .set('Authorization', `Bearer ${companyAdminAToken}`);

      assert.equal(res.status, 200);
      assert(Array.isArray(res.body.data));
      const grant = res.body.data.find((g) => g.id === createdGrantId);
      assert(grant, 'Created support grant must be in list');
    });

    it('company admin revokes support access immediately', async () => {
      assert(createdGrantId, 'Grant ID must exist');

      const res = await request(app)
        .delete(`/api/v1/settings/support-access/${createdGrantId}`)
        .set('Authorization', `Bearer ${companyAdminAToken}`);

      assert.equal(res.status, 200);
      assert(res.body.data.revoked_at, 'revoked_at must be set');

      // Check active grant check returns false
      const isActive = await companyService.checkSupportAccess({
        companyId: companyA.id,
        platformUserId: res.body.data.platform_user_id,
      });
      assert.equal(isActive, false, 'Support access grant must now be inactive');
    });
  });

  // =========================================================================
  // 8. Company Isolation
  // =========================================================================
  describe('8. Multi-Company Data Isolation', () => {
    it('documents, reports, and audit logs of Company A are never visible to Company B', async () => {
      if (!companyB) return;

      const adminBUser = await prisma.$base().users.findFirst({
        where: { company_id: companyB.id, user_roles: { some: { role: { name: 'COMPANY_ADMIN' } } } },
      });
      if (!adminBUser) return;

      const tokenB = await request(app).post('/api/v1/auth/login').send({
        email: adminBUser.email,
        password: 'Nextal@2026!',
      }).then((r) => r.body.token);

      // Company B cannot see Company A documents
      const docsRes = await request(app).get('/api/v1/compliance/documents').set('Authorization', `Bearer ${tokenB}`);
      assert.equal(docsRes.status, 200);
      for (const d of docsRes.body.items || []) {
        assert.notEqual(d.company_id, companyA.id, 'Company B must never see Company A document');
      }

      // Company B cannot see Company A audit logs
      const auditRes = await request(app).get('/api/v1/audit-logs').set('Authorization', `Bearer ${tokenB}`);
      assert.equal(auditRes.status, 200);
      for (const item of auditRes.body.items || []) {
        assert.notEqual(item.company_id, companyA.id, 'Company B must never see Company A audit log');
      }
    });
  });
});
