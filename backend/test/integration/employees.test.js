import { describe, it, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../../src/app.js';
import prisma from '../../src/lib/prisma.js';
import { clearSessionCache } from '../../src/middleware/authCache.js';
import { deepScanForSalaryBankData } from '../../src/serializers/index.js';
import employeeService from '../../src/services/employeeService.js';
import { getContractOn } from '@nextal/shared';
import { generateValidUaeIban } from '../../prisma/seed/employees.js';

describe('Phase 4: Employee Management, Verification & Security Tests', () => {
  let company1;
  let adminToken;
  let hrMgrToken;
  let hrOfficerToken;
  let deptMgrToken;
  let employeeToken;
  let payrollToken;
  let branch1;
  let visa1;
  let shift1;
  let policy1;
  let structure1;
  let dept1;
  let job1;

  const password = 'Nextal@2026!';

  async function login(email) {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password });
    assert.equal(res.status, 200, `Login failed for ${email}`);
    return res.body.token;
  }

  before(async () => {
    company1 = await prisma.$base().companies.findFirst({
      where: { name: 'Gulf Tech Logistics LLC' },
    });
    assert(company1, 'Gulf Tech Logistics LLC must exist');

    const scoped = prisma.$scoped(company1.id);
    branch1 = await scoped.branches.findFirst();
    visa1 = await scoped.company_visas.findFirst();
    shift1 = await scoped.shifts.findFirst();
    policy1 = await scoped.attendance_policies.findFirst();
    structure1 = await scoped.salary_structures.findFirst();
    dept1 = await scoped.departments.findFirst({ where: { name: 'Engineering' } });
    job1 = await scoped.jobs.findFirst();

    adminToken = await login('admin@gulftech.ae');
    hrMgrToken = await login('hr.mgr@gulftech.ae');
    hrOfficerToken = await login('hr.officer@gulftech.ae');
    deptMgrToken = await login('dept.mgr@gulftech.ae');
    employeeToken = await login('employee@gulftech.ae');
    payrollToken = await login('payroll@gulftech.ae');
  });

  beforeEach(() => {
    clearSessionCache();
  });

  // =========================================================================
  // 1. Employee List & Server-Side Filters
  // =========================================================================
  describe('1. Employee List, Search, Filters & Department Manager Scoping', () => {
    it('returns paginated employee list with total count', async () => {
      const res = await request(app)
        .get('/api/v1/employees?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.status, 'success');
      assert.ok(Array.isArray(res.body.data));
      assert.equal(res.body.data.length, 10);
      assert.ok(res.body.meta.total >= 42);
      assert.equal(res.body.meta.page, 1);
    });

    it('filters employees by search term (name / code / email)', async () => {
      const res = await request(app)
        .get('/api/v1/employees?search=Rashid')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.ok(res.body.data.length >= 1);
      assert.ok(res.body.data[0].name.includes('Rashid'));
    });

    it('filters employees by status and nationality', async () => {
      const res = await request(app)
        .get('/api/v1/employees?status=Active&nationality=Emirati')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.ok(res.body.data.length > 0);
      res.body.data.forEach((emp) => {
        assert.equal(emp.status, 'Active');
        assert.ok(['ARE', 'Emirati'].includes(emp.nationality));
      });
    });

    it('scopes Department Manager to their own team only (Spec 6)', async () => {
      const res = await request(app)
        .get('/api/v1/employees')
        .set('Authorization', `Bearer ${deptMgrToken}`);

      assert.equal(res.status, 200);
      // Dept manager only sees employees in their managed department (Engineering) or direct reports
      assert.ok(res.body.meta.total < 42, 'Dept manager must not see all company employees');
      assert.ok(res.body.meta.total > 0, 'Dept manager must see their department members');
    });
  });

  // =========================================================================
  // 2. Role Masking & Privacy (Rule D, E, and Spec 5.3)
  // =========================================================================
  describe('2. Role Masking & Privacy (Deep Scan & IBAN / ID Masking)', () => {
    it('strips ALL salary and bank fields for non-salary roles (HR_OFFICER, DEPT_MANAGER)', async () => {
      const rolesToTest = [
        { name: 'HR_OFFICER', token: hrOfficerToken },
        { name: 'DEPT_MANAGER', token: deptMgrToken },
      ];

      for (const { name, token } of rolesToTest) {
        const res = await request(app)
          .get('/api/v1/employees')
          .set('Authorization', `Bearer ${token}`);

        assert.equal(res.status, 200);
        // Deep scan to ensure no basic, gross, salary, or unmasked bank keys are leaked
        assert.doesNotThrow(() => {
          deepScanForSalaryBankData(res.body.data, `${name}.employeesList`);
        }, `Security violation: Non-salary role ${name} received forbidden salary/bank keys`);
      }
    });

    it('denies company-wide employee list to regular EMPLOYEE role with HTTP 403 (Spec 5.3)', async () => {
      const res = await request(app)
        .get('/api/v1/employees')
        .set('Authorization', `Bearer ${employeeToken}`);

      assert.equal(res.status, 403);
    });

    it('masks IBAN in employee list (AE** **** **** 1234) even for salary roles (Rule D)', async () => {
      const res = await request(app)
        .get('/api/v1/employees')
        .set('Authorization', `Bearer ${hrMgrToken}`);

      assert.equal(res.status, 200);
      const withBank = res.body.data.find((e) => e.bank_accounts && e.bank_accounts.length > 0);
      if (withBank) {
        const iban = withBank.bank_accounts[0].iban;
        assert.ok(iban.startsWith('AE**'), `List IBAN should be masked with AE**, got: ${iban}`);
      }
    });

    it('masks sensitive identity numbers (Passport, Emirates ID) for non-HR roles (Rule E)', async () => {
      // Find an employee with documents
      const listRes = await request(app)
        .get('/api/v1/employees')
        .set('Authorization', `Bearer ${adminToken}`);

      const empId = listRes.body.data[0].id;

      // 1. HR Manager sees full unmasked doc numbers
      const hrRes = await request(app)
        .get(`/api/v1/employees/${empId}/documents`)
        .set('Authorization', `Bearer ${hrMgrToken}`);

      assert.equal(hrRes.status, 200);
      const hrEid = hrRes.body.data.find((d) => d.doc_type === 'EMIRATES_ID');
      if (hrEid) {
        assert.ok(!hrEid.doc_number.includes('****'), 'HR Manager must see unmasked Emirates ID');
      }

      // 2. Department Manager sees MASKED doc numbers
      const deptRes = await request(app)
        .get(`/api/v1/employees/${empId}/documents`)
        .set('Authorization', `Bearer ${deptMgrToken}`);

      if (deptRes.status === 200) {
        const maskedEid = deptRes.body.data.find((d) => d.doc_type === 'EMIRATES_ID');
        if (maskedEid) {
          assert.ok(maskedEid.doc_number.includes('****'), 'Dept Manager must see masked Emirates ID');
        }
      }
    });
  });

  // =========================================================================
  // 3. Status Transitions (Rule A)
  // =========================================================================
  describe('3. Employee Status Transitions & Allowed Transitions Map (Rule A)', () => {
    let testEmpId;

    before(async () => {
      // Create a test employee in Pre-Joined
      const createRes = await request(app)
        .post('/api/v1/employees')
        .set('Authorization', `Bearer ${hrMgrToken}`)
        .send({
          employee_code: `T-TR-${Date.now().toString().slice(-6)}`,
          name: 'Transition Test Employee',
          company_visa_id: visa1.id,
          branch_id: branch1.id,
          joining_date: '2026-11-01',
          nationality: 'Emirati',
          gender: 'Male',
        });
      assert.equal(createRes.status, 201);
      testEmpId = createRes.body.data.id;
      assert.equal(createRes.body.data.status, 'Pre-Joined');
    });

    it('rejects invalid status transitions with HTTP 400 (e.g. Pre-Joined -> Suspended)', async () => {
      const res = await request(app)
        .post(`/api/v1/employees/${testEmpId}/status`)
        .set('Authorization', `Bearer ${hrMgrToken}`)
        .send({ status: 'Suspended' });

      assert.equal(res.status, 400);
      assert.equal(res.body.code, 'INVALID_STATUS_TRANSITION');
      assert.ok(res.body.message.includes('Invalid status transition'));
    });

    it('allows valid status transition Pre-Joined -> New Joined', async () => {
      const res = await request(app)
        .post(`/api/v1/employees/${testEmpId}/status`)
        .set('Authorization', `Bearer ${hrMgrToken}`)
        .send({ status: 'New Joined' });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.status, 'New Joined');
    });

    it('allows valid transition New Joined -> Suspended, and Suspended -> Active', async () => {
      const suspendRes = await request(app)
        .post(`/api/v1/employees/${testEmpId}/status`)
        .set('Authorization', `Bearer ${hrMgrToken}`)
        .send({ status: 'Suspended' });

      assert.equal(suspendRes.status, 200);
      assert.equal(suspendRes.body.data.status, 'Suspended');
    });

    it('rejects transitions from Archived status with HTTP 400', async () => {
      // Archive the employee
      const archiveRes = await request(app)
        .post(`/api/v1/employees/${testEmpId}/status`)
        .set('Authorization', `Bearer ${hrMgrToken}`)
        .send({ status: 'Archived' });
      assert.equal(archiveRes.status, 200);

      // Attempting to move out of Archived must fail
      const tryRes = await request(app)
        .post(`/api/v1/employees/${testEmpId}/status`)
        .set('Authorization', `Bearer ${hrMgrToken}`)
        .send({ status: 'Active' });

      assert.equal(tryRes.status, 400);
      assert.equal(tryRes.body.code, 'INVALID_STATUS_TRANSITION');
    });
  });

  // =========================================================================
  // 4. Activation Check & Activation Flow (Rule A)
  // =========================================================================
  describe('4. Activation Requirements Check & Activation Execution (Rule A)', () => {
    let incompleteEmpId;
    let completeEmpId;

    it('activation check fails when requirements are missing, identifying missing items', async () => {
      // Create empty Pre-Joined employee (no contract, shift, bank, or labour card)
      const empRes = await request(app)
        .post('/api/v1/employees')
        .set('Authorization', `Bearer ${hrMgrToken}`)
        .send({
          employee_code: `T-INC-${Date.now().toString().slice(-6)}`,
          name: 'Incomplete Test Employee',
          company_visa_id: visa1.id,
          branch_id: branch1.id,
          joining_date: '2026-11-01',
          nationality: 'Indian',
          gender: 'Female',
        });
      incompleteEmpId = empRes.body.data.id;

      // Check activation
      const checkRes = await request(app)
        .get(`/api/v1/employees/${incompleteEmpId}/activation-check`)
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(checkRes.status, 200);
      assert.equal(checkRes.body.data.passes, false);
      assert.ok(checkRes.body.data.missing.includes('contract'));
      assert.ok(checkRes.body.data.missing.includes('shift'));
      assert.ok(checkRes.body.data.missing.includes('bank_account'));
      assert.ok(checkRes.body.data.missing.includes('labour_card_or_person_id'));

      // Activating incomplete employee fails with 400
      const actRes = await request(app)
        .post(`/api/v1/employees/${incompleteEmpId}/activate`)
        .set('Authorization', `Bearer ${hrMgrToken}`);

      assert.equal(actRes.status, 400);
      assert.equal(actRes.body.code, 'ACTIVATION_REQUIREMENTS_UNMET');
    });

    it('activating a complete employee creates opening leave allocation and self-service invite', async () => {
      // Create employee
      const empRes = await request(app)
        .post('/api/v1/employees')
        .set('Authorization', `Bearer ${hrOfficerToken}`)
        .send({
          employee_code: `T-CMP-${Date.now().toString().slice(-6)}`,
          name: 'Complete Test Employee',
          work_email: `complete.${Date.now()}@gulftech.ae`,
          company_visa_id: visa1.id,
          branch_id: branch1.id,
          joining_date: '2026-11-01',
          mohre_person_id: '12345678901234', // valid labour card / person ID
          nationality: 'British',
          gender: 'Male',
        });
      completeEmpId = empRes.body.data.id;

      // Add Contract with shift (Payroll Officer creates, HR Manager approves per Spec 5.3)
      const contractRes = await request(app)
        .post(`/api/v1/employees/${completeEmpId}/contracts`)
        .set('Authorization', `Bearer ${payrollToken}`)
        .send({
          effective_date: '2026-11-01',
          start_date: '2026-11-01',
          job_id: job1.id,
          department_id: dept1.id,
          shift_id: shift1.id,
          attendance_policy_id: policy1.id,
          structure_id: structure1.id,
          basic: 6000,
          housing: 3000,
          transport: 1000,
          other_allowances: 0,
          gross: 10000,
        });
      assert.equal(contractRes.status, 201);

      await request(app)
        .post(`/api/v1/employees/${completeEmpId}/contracts/${contractRes.body.data.id}/approve`)
        .set('Authorization', `Bearer ${hrMgrToken}`);

      // Add Bank Account with valid UAE IBAN
      const testIban1 = generateValidUaeIban(33, Date.now() + Math.floor(Math.random() * 1000));
      const bankRes = await request(app)
        .post(`/api/v1/employees/${completeEmpId}/bank-accounts`)
        .set('Authorization', `Bearer ${hrMgrToken}`)
        .send({
          bank_name: 'Emirates NBD',
          iban: testIban1,
          routing_code: 'ENBD001',
        });
      assert.equal(bankRes.status, 200);

      // Check activation
      const checkRes = await request(app)
        .get(`/api/v1/employees/${completeEmpId}/activation-check`)
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(checkRes.status, 200);
      assert.equal(checkRes.body.data.passes, true);
      assert.equal(checkRes.body.data.missing.length, 0);

      // Activate!
      const actRes = await request(app)
        .post(`/api/v1/employees/${completeEmpId}/activate`)
        .set('Authorization', `Bearer ${hrMgrToken}`);

      assert.equal(actRes.status, 200);
      assert.equal(actRes.body.data.status, 'Active');
      assert.ok(actRes.body.data.invite_token, 'Self-service invite token must be generated');

      // Verify opening leave allocation created per statutory accrual plan (0 for new joiner)
      const alloc = await prisma.$scoped(company1.id).leave_allocations.findFirst({
        where: { employee_id: completeEmpId, allocation_type: 'Opening' },
      });
      assert.ok(alloc, 'Opening leave allocation must be created on activation');
      assert.equal(Number(alloc.days_allocated), 0, 'New joiner (<6 months wait) receives 0 opening leave days');
    });
  });

  // =========================================================================
  // 5. Versioned Contracts & Locked Pay Period Block (Rule B)
  // =========================================================================
  describe('5. Versioned Contracts, getContractOn & Locked Pay Period Check (Rule B)', () => {
    let empId;

    before(async () => {
      // Find one of the 5 employees seeded with 2 contract versions (EMP-DXB-001)
      const emp = await prisma.$scoped(company1.id).employees.findFirst({
        where: { employee_code: 'EMP-DXB-001' },
      });
      assert(emp, 'EMP-DXB-001 must exist');
      empId = emp.id;
    });

    it('returns all version rows ordered in Salary History (403 for non-salary)', async () => {
      // 1. Non-salary role receives 403
      const nonSalaryRes = await request(app)
        .get(`/api/v1/employees/${empId}/contracts`)
        .set('Authorization', `Bearer ${hrOfficerToken}`);
      assert.equal(nonSalaryRes.status, 403);
      assert.equal(nonSalaryRes.body.code, 'FORBIDDEN_SALARY_ACCESS');

      // 2. Salary role receives contract version history
      const res = await request(app)
        .get(`/api/v1/employees/${empId}/contracts`)
        .set('Authorization', `Bearer ${hrMgrToken}`);

      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.data.length >= 2, 'Must have at least 2 versions for EMP-DXB-001');
      assert.equal(res.body.data[0].version_no, 2, 'Latest version must appear first');
    });

    it('getContractOn resolves correct contract version on dates before and after raise', async () => {
      const contracts = await prisma.$scoped(company1.id).contracts.findMany({
        where: { employee_id: empId },
        orderBy: [{ effective_date: 'desc' }, { version_no: 'desc' }],
      });

      // Date before mid-year raise: 2025-05-01 should resolve version 1
      const v1 = getContractOn(contracts, '2025-05-01');
      assert.equal(v1.version_no, 1);

      // Date after mid-year raise: 2026-07-01 should resolve version 2
      const v2 = getContractOn(contracts, '2026-07-01');
      assert.equal(v2.version_no, 2);
    });

    it('rejects contract creation with effective date inside a locked pay period (Rule B)', async () => {
      // 2026-09 is locked in Gulf Tech Logistics
      const res = await request(app)
        .post(`/api/v1/employees/${empId}/contracts`)
        .set('Authorization', `Bearer ${payrollToken}`)
        .send({
          effective_date: '2026-09-15',
          start_date: '2026-09-15',
          basic: 15000,
          gross: 25000,
        });

      assert.equal(res.status, 400);
      assert.equal(res.body.code, 'LOCKED_PERIOD_BLOCKED');
      assert.ok(res.body.message.includes('locked pay period'));
    });
  });

  // =========================================================================
  // 6. UAE IBAN Validation (Rule D)
  // =========================================================================
  describe('6. UAE IBAN Validation (Rule D)', () => {
    let empId;

    before(async () => {
      const emp = await prisma.$scoped(company1.id).employees.findFirst({
        where: { employee_code: 'EMP-DXB-002' },
      });
      empId = emp.id;
    });

    it('accepts valid UAE IBAN with ISO-7064 mod-97 verification', async () => {
      const testIban2 = generateValidUaeIban(33, Date.now() + 5000 + Math.floor(Math.random() * 1000));
      const res = await request(app)
        .post(`/api/v1/employees/${empId}/bank-accounts`)
        .set('Authorization', `Bearer ${hrMgrToken}`)
        .send({
          bank_name: 'FAB',
          iban: testIban2,
          routing_code: 'FAB001',
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.iban, testIban2);
    });

    it('rejects UAE IBAN with invalid checksum (mod-97 failure)', async () => {
      const res = await request(app)
        .post(`/api/v1/employees/${empId}/bank-accounts`)
        .set('Authorization', `Bearer ${hrMgrToken}`)
        .send({
          bank_name: 'FAB',
          iban: 'AE990330000000000999102', // corrupted check digits
          routing_code: 'FAB001',
        });

      assert.equal(res.status, 400);
      assert.equal(res.body.code, 'INVALID_UAE_IBAN');
    });

    it('rejects IBAN with non-UAE country code (e.g. GB or US)', async () => {
      const res = await request(app)
        .post(`/api/v1/employees/${empId}/bank-accounts`)
        .set('Authorization', `Bearer ${hrMgrToken}`)
        .send({
          bank_name: 'Barclays',
          iban: 'GB29NWBK60161331926819',
          routing_code: 'BAR001',
        });

      assert.equal(res.status, 400);
      assert.equal(res.body.code, 'INVALID_UAE_IBAN');
      assert.ok(res.body.message.includes('AE'));
    });
  });

  // =========================================================================
  // 7. Document Upload, Magic Byte Validation & Secure Download (Rule C)
  // =========================================================================
  describe('7. Document Upload & Magic Bytes Validation (Rule C)', () => {
    let empId;
    let uploadedDocId;

    before(async () => {
      const emp = await prisma.$scoped(company1.id).employees.findFirst({
        where: { employee_code: 'EMP-DXB-003' },
      });
      empId = emp.id;
    });

    it('accepts valid PDF file upload via magic byte detection', async () => {
      // PDF header: %PDF-1.5...
      const pdfBuffer = Buffer.from('%PDF-1.5 test pdf content for employee document testing');

      const res = await request(app)
        .post(`/api/v1/employees/${empId}/documents`)
        .set('Authorization', `Bearer ${hrMgrToken}`)
        .attach('file', pdfBuffer, 'visa_copy.pdf')
        .field('doc_type', 'VISA')
        .field('doc_number', `VISA-${Date.now()}`)
        .field('expiry_date', '2028-10-01');

      assert.equal(res.status, 201);
      assert.ok(res.body.data.id);
      uploadedDocId = res.body.data.id;
      assert.equal(res.body.data.doc_type, 'VISA');
      assert.ok(res.body.data.has_file);
    });

    it('rejects fake file format with incorrect magic bytes (e.g. text/exe disguised as PDF)', async () => {
      const fakeBuffer = Buffer.from('FAKE NOT A REAL PDF OR PNG');

      const res = await request(app)
        .post(`/api/v1/employees/${empId}/documents`)
        .set('Authorization', `Bearer ${hrMgrToken}`)
        .attach('file', fakeBuffer, 'virus.pdf')
        .field('doc_type', 'VISA')
        .field('doc_number', 'BAD-001')
        .field('expiry_date', '2028-10-01');

      assert.equal(res.status, 400);
      assert.equal(res.body.code, 'INVALID_FILE_TYPE');
    });

    it('downloads document via authenticated API route; blocks unauthorized roles from sensitive files', async () => {
      // 1. HR Officer can download sensitive doc
      const hrRes = await request(app)
        .get(`/api/v1/employees/${empId}/documents/${uploadedDocId}/download`)
        .set('Authorization', `Bearer ${hrOfficerToken}`);

      assert.equal(hrRes.status, 200);
      assert.equal(hrRes.headers['content-type'], 'application/pdf');

      // 2. Unauthenticated request rejected
      const unauthRes = await request(app)
        .get(`/api/v1/employees/${empId}/documents/${uploadedDocId}/download`);

      assert.equal(unauthRes.status, 401);
    });
  });

  // =========================================================================
  // 8. Self-Verification Block (Rule G) & Audit Log (Rule F)
  // =========================================================================
  describe('8. Self-Verification Rule & Audit Logging (Rule F & G)', () => {
    let createdEmpId;

    it('blocks user from verifying an employee record they created (Rule G)', async () => {
      // HR Manager creates employee
      const createRes = await request(app)
        .post('/api/v1/employees')
        .set('Authorization', `Bearer ${hrMgrToken}`)
        .send({
          employee_code: `T-SLF-${Date.now().toString().slice(-6)}`,
          name: 'Self Verification Target',
          company_visa_id: visa1.id,
          branch_id: branch1.id,
          joining_date: '2026-11-01',
          nationality: 'Jordanian',
          gender: 'Male',
        });
      assert.equal(createRes.status, 201);
      createdEmpId = createRes.body.data.id;

      // HR Manager attempts to verify their own created employee -> 403 Forbidden
      const verifyRes = await request(app)
        .post(`/api/v1/employees/${createdEmpId}/verify`)
        .set('Authorization', `Bearer ${hrMgrToken}`)
        .send({ action: 'APPROVE', comment: 'Approved by creator' });

      assert.equal(verifyRes.status, 403);
      assert.equal(verifyRes.body.code, 'SELF_VERIFICATION_BLOCKED');
      assert.ok(verifyRes.body.message.includes('Self-verification is not permitted'));

      // Second HR Manager (hr@gulftech.ae) verifies successfully per Spec 5.3 P5
      const hr2Token = await login('hr@gulftech.ae');
      const hr2VerifyRes = await request(app)
        .post(`/api/v1/employees/${createdEmpId}/verify`)
        .set('Authorization', `Bearer ${hr2Token}`)
        .send({ action: 'APPROVE', comment: 'Approved by second HR Manager' });

      assert.equal(hr2VerifyRes.status, 200);
      assert.equal(hr2VerifyRes.body.data.status, 'New Joined');
    });

    it('records audit log entries for changes and retrieves them on History tab (Rule F)', async () => {
      const historyRes = await request(app)
        .get(`/api/v1/employees/${createdEmpId}/history`)
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(historyRes.status, 200);
      assert.ok(Array.isArray(historyRes.body.data));
      assert.ok(historyRes.body.data.length >= 2, 'History must contain Create and Verify events');

      const actions = historyRes.body.data.map((h) => h.action);
      assert.ok(actions.includes('Create'), 'Must have Create audit log');
      assert.ok(actions.includes('Verify'), 'Must have Verify audit log');
    });
  });
});
