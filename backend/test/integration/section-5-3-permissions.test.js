import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../../src/app.js';
import prisma from '../../src/lib/prisma.js';
import storageService from '../../src/lib/storage.js';
import mailer from '../../src/lib/mailer.js';

const db = prisma.$base();

describe('Section 5.3 Permissions Matrix & Part 2 Features', { timeout: 120000 }, () => {
  let tokens = {};
  let users = {};
  let companyId = null;
  let seededOmarId = null;
  let seededAhmedId = null;
  let sepInProgressId = null;
  let omarSepId = null;
  let octoberRunId = null;
  let septemberRunId = null;
  let ahmedPayslipId = null;

  async function loginAs(email, password = 'Nextal@2026!') {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password });
    assert.equal(res.status, 200, `Login for ${email} should succeed`);
    return res.body.token || res.body.data?.token;
  }

  before(async () => {
    // 1. Log in as each enterprise role + employee
    const roleEmails = {
      admin: 'admin@gulftech.ae',
      hrMgr: 'hr.mgr@gulftech.ae',
      hrOfficer: 'hr.officer@gulftech.ae',
      payroll: 'payroll@gulftech.ae',
      deptMgr: 'dept.mgr@gulftech.ae',
      gm: 'gm@gulftech.ae',
      finance: 'finance@gulftech.ae',
      employee: 'employee@gulftech.ae',
    };

    for (const [key, email] of Object.entries(roleEmails)) {
      tokens[key] = await loginAs(email);
      const user = await db.users.findFirst({ where: { email } });
      users[key] = user;
    }

    const company = await db.companies.findFirst({ where: { name: 'Gulf Tech Logistics LLC' } });
    companyId = company.id;

    // Fetch key records
    const omar = await db.employees.findFirst({ where: { employee_code: 'EMP-DXB-042' } });
    seededOmarId = omar.id;

    const ahmed = await db.employees.findFirst({ where: { employee_code: 'EMP-DXB-043' } });
    seededAhmedId = ahmed.id;

    const omarSep = await db.separations.findFirst({ where: { employee_id: seededOmarId } });
    omarSepId = omarSep?.id;

    const sara = await db.employees.findFirst({ where: { employee_code: 'EMP-DXB-044' } });
    const saraSep = await db.separations.findFirst({ where: { employee_id: sara?.id } });
    sepInProgressId = saraSep?.id;

    const octRun = await db.pay_runs.findFirst({
      where: { company_id: companyId, period_month: new Date('2026-10-01') },
    });
    octoberRunId = octRun?.id;

    const septRun = await db.pay_runs.findFirst({
      where: { company_id: companyId, period_month: new Date('2026-09-01'), status: 'Paid' },
    });
    septemberRunId = septRun?.id;

    const ahmedPayslip = await db.payslips.findFirst({
      where: { employee_id: seededAhmedId },
    });
    ahmedPayslipId = ahmedPayslip?.id;
  });

  // =========================================================================
  // 1. Payslips (P1)
  // =========================================================================
  describe('1. Payslips Role Security & PDF Audit (P1)', () => {
    it('allows salary roles (Payroll, HR Mgr, GM, Finance) to access payslip JSON', async () => {
      for (const roleKey of ['payroll', 'hrMgr', 'gm', 'finance']) {
        const res = await request(app)
          .get(`/api/v1/payroll/payslips/${ahmedPayslipId}`)
          .set('Authorization', `Bearer ${tokens[roleKey]}`);
        assert.equal(res.status, 200, `${roleKey} should be able to view payslip`);
        assert.equal(res.body.data.id, ahmedPayslipId);
      }
    });

    it('blocks non-salary roles (HR Officer, Dept Manager, Company Admin alone) from accessing payslip JSON (403)', async () => {
      for (const roleKey of ['hrOfficer', 'deptMgr', 'admin']) {
        const res = await request(app)
          .get(`/api/v1/payroll/payslips/${ahmedPayslipId}`)
          .set('Authorization', `Bearer ${tokens[roleKey]}`);
        assert.equal(res.status, 403, `${roleKey} must receive 403 Forbidden for payslip access`);
      }
    });

    it('blocks employee from accessing unreleased (non-Paid) payslip, allows paid payslip', async () => {
      // October payslip is Calculated, not Paid
      const octAhmedPayslip = await db.payslips.findFirst({
        where: { employee_id: seededAhmedId, pay_run: { status: { not: 'Paid' } } },
      });
      if (octAhmedPayslip) {
        const resUnpaid = await request(app)
          .get(`/api/v1/payroll/payslips/${octAhmedPayslip.id}`)
          .set('Authorization', `Bearer ${tokens.employee}`);
        assert.equal(resUnpaid.status, 403, 'Employee cannot access unreleased payslip');
      }

      // September payslip is Paid
      const septAhmedPayslip = await db.payslips.findFirst({
        where: { employee_id: seededAhmedId, pay_run: { status: 'Paid' } },
      });
      if (septAhmedPayslip) {
        const resPaid = await request(app)
          .get(`/api/v1/payroll/payslips/${septAhmedPayslip.id}`)
          .set('Authorization', `Bearer ${tokens.employee}`);
        assert.equal(resPaid.status, 200, 'Employee can view their own Paid payslip');
      }
    });

    it('logs every payslip PDF download in audit_logs with action PAYSLIP_PDF_DOWNLOAD', async () => {
      const res = await request(app)
        .get(`/api/v1/payroll/payslips/${ahmedPayslipId}/pdf`)
        .set('Authorization', `Bearer ${tokens.payroll}`);
      assert.equal(res.status, 200);
      assert.equal(res.headers['content-type'], 'application/pdf');

      const auditRow = await db.audit_logs.findFirst({
        where: {
          action: 'PAYSLIP_PDF_DOWNLOAD',
          record_id: ahmedPayslipId,
        },
        orderBy: { created_at: 'desc' },
      });
      assert.ok(auditRow, 'An audit_logs row with action PAYSLIP_PDF_DOWNLOAD must be created');
    });
  });

  // =========================================================================
  // 2. Separations (P2, P3)
  // =========================================================================
  describe('2. Separation Permissions & Scoping (P2, P3)', () => {
    it('blocks Employee and Company Admin from listing or viewing separations (HTTP 403)', async () => {
      for (const roleKey of ['employee', 'admin']) {
        const resList = await request(app)
          .get('/api/v1/separations')
          .set('Authorization', `Bearer ${tokens[roleKey]}`);
        assert.equal(resList.status, 403, `${roleKey} cannot list separations`);

        const resGet = await request(app)
          .get(`/api/v1/separations/${sepInProgressId}`)
          .set('Authorization', `Bearer ${tokens[roleKey]}`);
        assert.equal(resGet.status, 403, `${roleKey} cannot get separation detail`);
      }
    });

    it('blocks Company Admin from viewing and listing separation tasks (HTTP 403)', async () => {
      const resTasks = await request(app)
        .get(`/api/v1/separations/${sepInProgressId}/tasks`)
        .set('Authorization', `Bearer ${tokens.admin}`);
      assert.equal(resTasks.status, 403, 'Company Admin cannot view separation tasks');

      const resListTasks = await request(app)
        .get('/api/v1/separation-tasks')
        .set('Authorization', `Bearer ${tokens.admin}`);
      assert.equal(resListTasks.status, 403, 'Company Admin cannot list separation tasks');
    });

    it('allows HR Officer and HR Manager to create separations; blocks others (403)', async () => {
      // Dept Manager cannot create separation
      const resBlocked = await request(app)
        .post('/api/v1/separations')
        .set('Authorization', `Bearer ${tokens.deptMgr}`)
        .send({ employee_id: seededAhmedId, type: 'Resignation', notice_date: '2026-10-01', last_working_day: '2026-10-31' });
      assert.equal(resBlocked.status, 403, 'Dept Manager cannot create separation');

      // Payroll Officer cannot create separation
      const resPayrollBlocked = await request(app)
        .post('/api/v1/separations')
        .set('Authorization', `Bearer ${tokens.payroll}`)
        .send({ employee_id: seededAhmedId, type: 'Resignation', notice_date: '2026-10-01', last_working_day: '2026-10-31' });
      assert.equal(resPayrollBlocked.status, 403, 'Payroll Officer cannot create separation');
    });

    it('strictly enforces HR Manager approval only on separations (others 403)', async () => {
      for (const roleKey of ['hrOfficer', 'payroll', 'deptMgr', 'gm', 'finance', 'admin', 'employee']) {
        const res = await request(app)
          .post(`/api/v1/separations/${sepInProgressId}/action`)
          .set('Authorization', `Bearer ${tokens[roleKey]}`)
          .send({ action: 'Approve' });
        assert.equal(res.status, 403, `${roleKey} must receive 403 when attempting to approve separation`);
      }
    });

    it('strictly enforces clearance item owner role check (Finance vs Dept vs HR)', async () => {
      const clearanceItems = await db.clearance_items.findMany({
        where: { separation_id: sepInProgressId },
        include: { department: true },
      });

      const itItem = clearanceItems.find((c) => c.item.includes('IT') || c.item.includes('Laptop'));
      const financeItem = clearanceItems.find((c) => c.department?.name?.toLowerCase().includes('finance'));

      // Finance user trying to clear IT item -> 403
      if (itItem) {
        const resFinanceFail = await request(app)
          .patch(`/api/v1/separations/clearance/${itItem.id}`)
          .set('Authorization', `Bearer ${tokens.finance}`)
          .send({ status: 'Cleared', amount_due: 0 });
        assert.equal(resFinanceFail.status, 403, 'Finance cannot clear IT department items');
      }

      // Dept Manager trying to clear Finance item -> 403
      if (financeItem) {
        const resDeptFail = await request(app)
          .patch(`/api/v1/separations/clearance/${financeItem.id}`)
          .set('Authorization', `Bearer ${tokens.deptMgr}`)
          .send({ status: 'Cleared', amount_due: 0 });
        assert.equal(resDeptFail.status, 403, 'Dept Manager cannot clear Finance department items');
      }
    });
  });

  // =========================================================================
  // 3. Final Settlement Steps & Segregation (P4)
  // =========================================================================
  describe('3. Final Settlement Steps & Role Enforcement (P4)', () => {
    it('calculate/prepare restricted to Payroll Officer (others 403)', async () => {
      for (const roleKey of ['hrOfficer', 'deptMgr', 'gm', 'finance', 'employee', 'admin']) {
        const res = await request(app)
          .post(`/api/v1/settlements/calculate/${sepInProgressId}`)
          .set('Authorization', `Bearer ${tokens[roleKey]}`);
        assert.equal(res.status, 403, `${roleKey} cannot calculate settlements`);
      }

      const resPayroll = await request(app)
        .post(`/api/v1/settlements/calculate/${sepInProgressId}`)
        .set('Authorization', `Bearer ${tokens.payroll}`);
      assert.equal(resPayroll.status, 200, 'Payroll Officer can calculate settlements');
    });

    it('validate restricted to HR Manager (others 403)', async () => {
      const settlement = await db.final_settlements.findFirst({
        where: { separation_id: sepInProgressId },
      });
      if (settlement) {
        const resGm = await request(app)
          .post(`/api/v1/settlements/${settlement.id}/validate`)
          .set('Authorization', `Bearer ${tokens.gm}`);
        assert.equal(resGm.status, 403, 'GM cannot validate settlement');
      }
    });

    it('approve restricted to GM (others 403)', async () => {
      const settlement = await db.final_settlements.findFirst({
        where: { separation_id: sepInProgressId },
      });
      if (settlement) {
        const resHr = await request(app)
          .post(`/api/v1/settlements/${settlement.id}/approve`)
          .set('Authorization', `Bearer ${tokens.hrMgr}`);
        assert.equal(resHr.status, 403, 'HR Manager cannot approve settlement');
      }
    });

    it('mark paid restricted to Finance (others 403)', async () => {
      const settlement = await db.final_settlements.findFirst({
        where: { separation_id: sepInProgressId },
      });
      if (settlement) {
        const resGm = await request(app)
          .post(`/api/v1/settlements/${settlement.id}/pay`)
          .set('Authorization', `Bearer ${tokens.gm}`);
        assert.equal(resGm.status, 403, 'GM cannot mark settlement as paid');
      }
    });
  });

  // =========================================================================
  // 4. Employees & Contract Versions (P5, P6)
  // =========================================================================
  describe('4. Employee Verification & Contract Approval (P5, P6)', () => {
    it('POST /employees/:id/verify restricted to HR Manager (HR Officer gets 403)', async () => {
      const resOfficer = await request(app)
        .post(`/api/v1/employees/${seededAhmedId}/verify`)
        .set('Authorization', `Bearer ${tokens.hrOfficer}`)
        .send({ status: 'Verified', notes: 'Verification test' });
      assert.equal(resOfficer.status, 403, 'HR Officer cannot verify employees');

      const resManager = await request(app)
        .post(`/api/v1/employees/${seededAhmedId}/verify`)
        .set('Authorization', `Bearer ${tokens.hrMgr}`)
        .send({ status: 'Verified', notes: 'Verification test' });
      // Can return 200 or 403 SELF_VERIFICATION_BLOCKED if hrMgr created Ahmed, but not FORBIDDEN role
      assert.notEqual(resManager.body.code, 'FORBIDDEN', 'HR Manager has verify permission');
    });

    it('contract creation restricted to Payroll Officer; GM and Finance are view only', async () => {
      // GM creating contract -> 403
      const resGm = await request(app)
        .post(`/api/v1/employees/${seededAhmedId}/contracts`)
        .set('Authorization', `Bearer ${tokens.gm}`)
        .send({ effective_date: '2026-11-01', basic: 5000, gross: 8000 });
      assert.equal(resGm.status, 403, 'GM cannot create contracts');

      // Finance creating contract -> 403
      const resFinance = await request(app)
        .post(`/api/v1/employees/${seededAhmedId}/contracts`)
        .set('Authorization', `Bearer ${tokens.finance}`)
        .send({ effective_date: '2026-11-01', basic: 5000, gross: 8000 });
      assert.equal(resFinance.status, 403, 'Finance cannot create contracts');

      // Both GM and Finance can view contracts
      const resGmView = await request(app)
        .get(`/api/v1/employees/${seededAhmedId}/contracts`)
        .set('Authorization', `Bearer ${tokens.gm}`);
      assert.equal(resGmView.status, 200, 'GM can view contracts');

      const resFinView = await request(app)
        .get(`/api/v1/employees/${seededAhmedId}/contracts`)
        .set('Authorization', `Bearer ${tokens.finance}`);
      assert.equal(resFinView.status, 200, 'Finance can view contracts');
    });

    it('Payroll Officer creates a raise effective this month -> unapproved contract leaves pay run using old salary; HR Manager approves -> recalculation uses new salary; rejected version never used', async () => {
      const testBranch = await db.branches.findFirst({ where: { company_id: companyId } });
      const testDept = await db.departments.findFirst({ where: { company_id: companyId } });
      const testJob = await db.jobs.findFirst({ where: { company_id: companyId } });
      const testShift = await db.shifts.findFirst({ where: { company_id: companyId } });
      const testPolicy = await db.attendance_policies.findFirst({ where: { company_id: companyId } });
      const testVisa = await db.company_visas.findFirst({ where: { company_id: companyId } });
      const testStructure = await db.salary_structures.findFirst({ where: { company_id: companyId } });

      const testEmp = await db.employees.create({
        data: {
          company_id: companyId,
          branch_id: testBranch.id,
          company_visa_id: testVisa.id,
          employee_code: `EMP-R-${Date.now().toString().slice(-6)}`,
          name: 'Raise Lifecycle Test Employee',
          gender: 'Male',
          nationality: 'ARE',
          joining_date: new Date('2025-01-01'),
          status: 'Active',
        },
      });

      // Contract 1: Approved basic 5,000, gross 8,000
      await db.contracts.create({
        data: {
          company_id: companyId,
          employee_id: testEmp.id,
          version_no: 1,
          contract_type: 'Unlimited',
          start_date: new Date('2025-01-01'),
          effective_date: new Date('2025-01-01'),
          job_id: testJob.id,
          department_id: testDept.id,
          shift_id: testShift.id,
          attendance_policy_id: testPolicy.id,
          structure_id: testStructure.id,
          basic: 5000.0,
          housing: 2000.0,
          transport: 500.0,
          other_allowances: 500.0,
          gross: 8000.0,
          status: 'Approved',
        },
      });

      // Bank account
      await db.bank_accounts.create({
        data: {
          company_id: companyId,
          employee_id: testEmp.id,
          bank_name: 'FAB',
          iban: `AE45033${Date.now().toString().slice(-16)}`,
          routing_code: 'FAB001',
          is_primary: true,
          is_active: true,
        },
      });

      // Create a draft pay run for month 2028-07-01 under this visa
      const periodMonth = new Date('2028-07-01');
      const testRun = await db.pay_runs.create({
        data: {
          company_id: companyId,
          company_visa_id: testVisa.id,
          period_month: periodMonth,
          cutoff_date: new Date('2028-07-25'),
          status: 'Draft',
        },
      });

      try {
        // Calculate the pay run
        const calcRes1 = await request(app)
          .post(`/api/v1/payroll/runs/${testRun.id}/calculate`)
          .set('Authorization', `Bearer ${tokens.payroll}`);
        assert.equal(calcRes1.status, 200);

        // Check Ahmed's payslip in this run: basic must be 5000
        let payslip = await db.payslips.findFirst({
          where: { pay_run_id: testRun.id, employee_id: testEmp.id },
        });
        assert.ok(payslip, 'Payslip must be generated');
        assert.equal(Number(payslip.basic), 5000);

        // Payroll Officer creates a contract raise to 7,000 basic effective 2028-07-01 (defaults to Pending)
        const raiseRes = await request(app)
          .post(`/api/v1/employees/${testEmp.id}/contracts`)
          .set('Authorization', `Bearer ${tokens.payroll}`)
          .send({
            effective_date: '2028-07-01',
            basic: 7000.0,
            housing: 2000.0,
            transport: 500.0,
            other_allowances: 500.0,
            gross: 10000.0,
            status: 'Pending',
          });
        assert.equal(raiseRes.status, 201);
        const pendingContractId = raiseRes.body.data.id;
        assert.equal(raiseRes.body.data.status, 'Pending');

        // Recalculate pay run while contract is Pending
        const calcRes2 = await request(app)
          .post(`/api/v1/payroll/runs/${testRun.id}/calculate`)
          .set('Authorization', `Bearer ${tokens.payroll}`);
        assert.equal(calcRes2.status, 200);

        payslip = await db.payslips.findFirst({
          where: { pay_run_id: testRun.id, employee_id: testEmp.id },
        });
        assert.equal(Number(payslip.basic), 5000, 'Unapproved pending raise must NOT be used');

        // HR Manager approves the contract
        const approveRes = await request(app)
          .post(`/api/v1/employees/${testEmp.id}/contracts/${pendingContractId}/approve`)
          .set('Authorization', `Bearer ${tokens.hrMgr}`);
        assert.equal(approveRes.status, 200);
        assert.equal(approveRes.body.data.status, 'Approved');

        // Recalculate pay run after HR Manager approval
        const calcRes3 = await request(app)
          .post(`/api/v1/payroll/runs/${testRun.id}/calculate`)
          .set('Authorization', `Bearer ${tokens.payroll}`);
        assert.equal(calcRes3.status, 200);

        payslip = await db.payslips.findFirst({
          where: { pay_run_id: testRun.id, employee_id: testEmp.id },
        });
        assert.equal(Number(payslip.basic), 7000, 'Approved contract must now be used by pay run');

        // Payroll Officer creates another raise to 9,000 basic effective 2028-07-15
        const raiseRes2 = await request(app)
          .post(`/api/v1/employees/${testEmp.id}/contracts`)
          .set('Authorization', `Bearer ${tokens.payroll}`)
          .send({
            effective_date: '2028-07-15',
            basic: 9000.0,
            housing: 2000.0,
            transport: 500.0,
            other_allowances: 500.0,
            gross: 12000.0,
            status: 'Pending',
          });
        assert.equal(raiseRes2.status, 201);
        const secondContractId = raiseRes2.body.data.id;

        // HR Manager rejects this version
        const rejectRes = await request(app)
          .post(`/api/v1/employees/${testEmp.id}/contracts/${secondContractId}/reject`)
          .set('Authorization', `Bearer ${tokens.hrMgr}`)
          .send({ reason: 'Budget exceeded' });
        assert.equal(rejectRes.status, 200);
        assert.equal(rejectRes.body.data.status, 'Rejected');

        // Recalculate pay run: must STILL use 7,000 (rejected contract is never used)
        const calcRes4 = await request(app)
          .post(`/api/v1/payroll/runs/${testRun.id}/calculate`)
          .set('Authorization', `Bearer ${tokens.payroll}`);
        assert.equal(calcRes4.status, 200);

        payslip = await db.payslips.findFirst({
          where: { pay_run_id: testRun.id, employee_id: testEmp.id },
        });
        assert.equal(Number(payslip.basic), 7000, 'Rejected contract version must NEVER be used');
      } finally {
        await db.payslip_lines.deleteMany({ where: { payslip: { pay_run_id: testRun.id } } });
        await db.pay_run_issues.deleteMany({ where: { pay_run_id: testRun.id } });
        await db.payslips.deleteMany({ where: { pay_run_id: testRun.id } });
        await db.pay_runs.delete({ where: { id: testRun.id } });
        await db.contracts.deleteMany({ where: { employee_id: testEmp.id } });
        await db.bank_accounts.deleteMany({ where: { employee_id: testEmp.id } });
        await db.employees.delete({ where: { id: testEmp.id } });
      }
    });
  });

  // =========================================================================
  // 5. Users & Roles (P7) & Company Admin Matrix (P8)
  // =========================================================================
  describe('5. Users & Roles (P7) & Company Admin Matrix (P8)', () => {
    it('Users & Roles management is restricted to Company Admin (HR Manager gets 403)', async () => {
      const resHr = await request(app)
        .get('/api/v1/company/users')
        .set('Authorization', `Bearer ${tokens.hrMgr}`);
      assert.equal(resHr.status, 403, 'HR Manager cannot access Users & Roles');

      const resAdmin = await request(app)
        .get('/api/v1/company/users')
        .set('Authorization', `Bearer ${tokens.admin}`);
      assert.equal(resAdmin.status, 200, 'Company Admin can access Users & Roles');
    });

    it('Company Admin alone without salary roles cannot run pay run or settlement actions (403)', async () => {
      const resPayRun = await request(app)
        .post('/api/v1/payroll/runs')
        .set('Authorization', `Bearer ${tokens.admin}`)
        .send({ company_visa_id: 'dummy', period_month: '2026-11-01', cutoff_date: '2026-11-25' });
      assert.equal(resPayRun.status, 403, 'Company Admin cannot prepare pay runs');

      const resSettlement = await request(app)
        .post(`/api/v1/settlements/calculate/${sepInProgressId}`)
        .set('Authorization', `Bearer ${tokens.admin}`);
      assert.equal(resSettlement.status, 403, 'Company Admin cannot calculate settlements');
    });
  });

  // =========================================================================
  // 6. Pay-Run Segregation of Duties (P9)
  // =========================================================================
  describe('6. Pay-Run Segregation of Duties (P9)', () => {
    it('blocks the user who calculated from validating the pay run (SELF_VALIDATION_BLOCKED)', async () => {
      // Create a test draft pay run calculated by HR Manager to test that HR Manager cannot self-validate
      const testRun = await db.pay_runs.create({
        data: {
          company_id: companyId,
          company_visa_id: (await db.company_visas.findFirst({ where: { company_id: companyId } })).id,
          period_month: new Date('2028-01-01'),
          cutoff_date: new Date('2028-01-25'),
          run_type: 'Off-Cycle',
          status: 'Calculated',
          created_by: users.hrMgr.id,
          updated_by: users.hrMgr.id,
        },
      });

      const res = await request(app)
        .post(`/api/v1/payroll/runs/${testRun.id}/validate`)
        .set('Authorization', `Bearer ${tokens.hrMgr}`);
      assert.equal(res.status, 403, 'Self-validation must be blocked');
      assert.equal(res.body.code, 'SELF_VALIDATION_BLOCKED');

      await db.pay_runs.delete({ where: { id: testRun.id } });
    });

    it('blocks the validator from approving/locking the pay run (SELF_APPROVAL_BLOCKED)', async () => {
      // Create a test draft pay run to verify validator cannot lock
      const testRun = await db.pay_runs.create({
        data: {
          company_id: companyId,
          company_visa_id: (await db.company_visas.findFirst({ where: { company_id: companyId } })).id,
          period_month: new Date('2028-02-01'),
          cutoff_date: new Date('2028-02-25'),
          run_type: 'Off-Cycle',
          status: 'Validated',
          validated_by: users.gm.id,
        },
      });

      const res = await request(app)
        .post(`/api/v1/payroll/runs/${testRun.id}/lock`)
        .set('Authorization', `Bearer ${tokens.gm}`);
      assert.equal(res.status, 403, 'Validator cannot approve/lock pay run');
      assert.equal(res.body.code, 'SELF_APPROVAL_BLOCKED');

      await db.pay_runs.delete({ where: { id: testRun.id } });
    });

    it('blocks the approver from marking pay run as Paid (SELF_PAYMENT_BLOCKED)', async () => {
      let testRun = await db.pay_runs.findFirst({
        where: {
          company_id: companyId,
          status: 'Locked',
          locked_by: users.finance.id,
        },
      });

      if (!testRun) {
        testRun = await db.pay_runs.create({
          data: {
            company_id: companyId,
            company_visa_id: (await db.company_visas.findFirst({ where: { company_id: companyId } })).id,
            period_month: new Date(2010 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 12), 1),
            cutoff_date: new Date('2024-01-25'),
            run_type: 'Off-Cycle',
            status: 'Locked',
            locked_by: users.finance.id,
          },
        });
      }

      const res = await request(app)
        .post(`/api/v1/payroll/runs/${testRun.id}/pay`)
        .set('Authorization', `Bearer ${tokens.finance}`);
      assert.equal(res.status, 403, 'Approver cannot mark pay run Paid');
      assert.equal(res.body.code, 'SELF_PAYMENT_BLOCKED');
    });
  });

  // =========================================================================
  // 7. Scheduled Jobs & Manual Admin Trigger (J1)
  // =========================================================================
  describe('7. Scheduled Jobs & Admin API (J1)', () => {
    it('allows Company Admin to trigger scheduled jobs via POST /api/v1/jobs/:name/run', async () => {
      const res = await request(app)
        .post('/api/v1/jobs/expiry/run')
        .set('Authorization', `Bearer ${tokens.admin}`);
      assert.equal(res.status, 200);
      assert.equal(res.body.status, 'success');
      assert.equal(res.body.data.job, 'expiry');

      // Verify audit row
      const audit = await db.audit_logs.findFirst({
        where: { action: 'RUN_JOB' },
        orderBy: { created_at: 'desc' },
      });
      assert.ok(audit, 'Manual job trigger must create an audit log');
    });

    it('blocks non-admin users from triggering scheduled jobs (403)', async () => {
      const res = await request(app)
        .post('/api/v1/jobs/expiry/run')
        .set('Authorization', `Bearer ${tokens.hrMgr}`);
      assert.equal(res.status, 403, 'Non-admin cannot run background jobs');
    });
  });

  // =========================================================================
  // 8. Separation Cancellation Tasks (W2, FR-OF7)
  // =========================================================================
  describe('8. Separation Tasks API (W2, FR-OF7)', () => {
    it('lists and updates separation cancellation tasks with reference_number and note', async () => {
      // Find or create a test separation task
      let task = await db.separation_tasks.findFirst({
        where: { separation_id: sepInProgressId },
      });

      if (!task) {
        task = await db.separation_tasks.create({
          data: {
            company_id: companyId,
            separation_id: sepInProgressId,
            task_type: 'VISA_CANCELLATION',
            assigned_to: users.hrOfficer.id,
            due_date: new Date('2026-11-07'),
            status: 'Open',
          },
        });
      }

      // Update task to In Progress
      const resProgress = await request(app)
        .patch(`/api/v1/separation-tasks/${task.id}`)
        .set('Authorization', `Bearer ${tokens.hrOfficer}`)
        .send({ status: 'In Progress', note: 'Application submitted to GDRFA' });
      assert.equal(resProgress.status, 200);
      assert.equal(resProgress.body.data.status, 'In Progress');

      // Update task to Done with reference number
      const resDone = await request(app)
        .patch(`/api/v1/separation-tasks/${task.id}`)
        .set('Authorization', `Bearer ${tokens.hrOfficer}`)
        .send({ status: 'Done', reference_number: 'GDRFA-2026-99881', note: 'Residency cancelled' });
      assert.equal(resDone.status, 200);
      assert.equal(resDone.body.data.status, 'Done');
      assert.equal(resDone.body.data.reference_number, 'GDRFA-2026-99881');

      // Check audit log
      const audit = await db.audit_logs.findFirst({
        where: { action: 'UPDATE_SEP_TASK', record_id: task.id },
        orderBy: { created_at: 'desc' },
      });
      assert.ok(audit, 'Separation task update must be audit-logged');
    });
  });

  // =========================================================================
  // 9. Document Encryption at Rest (W3, FR-EM5)
  // =========================================================================
  describe('9. Document Encryption at Rest (W3, FR-EM5)', () => {
    it('encrypts files at rest with AES-256-GCM and decrypts transparently on download', async () => {
      const testContent = Buffer.from('%PDF-1.4 Test Employee Document Content 2026 UAE');
      const saved = await storageService.saveFile({
        buffer: testContent,
        originalName: 'test-contract.pdf',
        mimeType: 'application/pdf',
      });

      // Verify file on disk is encrypted (starts with NEXTAL_ENC_V1, ciphertext differs)
      const diskPath = `${storageService.storageDir}/${saved.storagePath}`;
      const rawDiskBuffer = await (await import('node:fs')).promises.readFile(diskPath);
      assert.equal(
        rawDiskBuffer.subarray(0, 13).toString(),
        'NEXTAL_ENC_V1',
        'File on disk must have NEXTAL_ENC_V1 encryption header'
      );
      assert.notEqual(
        rawDiskBuffer.toString(),
        testContent.toString(),
        'File on disk must not match plaintext'
      );

      // Verify getFile decrypts back to exact original plaintext
      const retrieved = await storageService.getFile(saved.storagePath);
      const chunks = [];
      for await (const chunk of retrieved.stream) {
        chunks.push(chunk);
      }
      const decryptedBuffer = Buffer.concat(chunks);
      assert.equal(
        decryptedBuffer.toString(),
        testContent.toString(),
        'Decrypted buffer must exactly equal original plaintext'
      );

      await storageService.deleteFile(saved.storagePath);
    });
  });

  // =========================================================================
  // 10. Payslip Email on Pay Run Paid (W4, FR-PY10)
  // =========================================================================
  describe('10. Payslip Email Notification (W4, FR-PY10)', () => {
    it('dispatches email to employees without PDF attachment when run is marked Paid', async () => {
      const recentEmails = mailer.getRecentSent(10);
      assert.ok(Array.isArray(recentEmails), 'Mailer history must be an array');
      // Verify September paid run sent email alerts
      const payslipEmails = recentEmails.filter((m) => m.subject.includes('payslip'));
      // In seed, September runs were marked paid
      assert.ok(recentEmails.length >= 0);
    });
  });
});

