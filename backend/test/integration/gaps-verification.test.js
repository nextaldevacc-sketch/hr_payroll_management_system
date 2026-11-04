import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../../src/app.js';
import prisma from '../../src/lib/prisma.js';
import employeeService from '../../src/services/employeeService.js';

describe('GAP 1, GAP 2, GAP 3 Verification Integration Tests', () => {
  let company1;
  let visa1;
  let visa2;
  let branch1;
  let branch2;
  let hrMgrToken;
  let hrOfficerToken;
  let hrOfficerUser;
  let hrMgrUser;

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

    const visas = await prisma.$base().company_visas.findMany({
      where: { company_id: company1.id },
      orderBy: { created_at: 'asc' },
    });
    assert(visas.length >= 2, 'Must have at least 2 company visas seeded');
    visa1 = visas[0];
    visa2 = visas[1];

    branch1 = await prisma.$base().branches.findFirst({
      where: { company_id: company1.id, company_visa_id: visa1.id },
    });
    branch2 = await prisma.$base().branches.findFirst({
      where: { company_id: company1.id, company_visa_id: visa2.id },
    });

    hrOfficerUser = await prisma.$base().users.findUnique({
      where: { email: 'hr.officer@gulftech.ae' },
    });
    hrMgrUser = await prisma.$base().users.findUnique({
      where: { email: 'hr.mgr@gulftech.ae' },
    });

    hrMgrToken = await login('hr.mgr@gulftech.ae');
    hrOfficerToken = await login('hr.officer@gulftech.ae');
  });

  describe('GAP 1: Visa Filtering Across Endpoints', () => {
    it('GET /api/v1/employees?company_visa_id=<v01> returns only visa 1 employees', async () => {
      const res = await request(app)
        .get(`/api/v1/employees?company_visa_id=${visa1.id}`)
        .set('Authorization', `Bearer ${hrMgrToken}`);

      assert.equal(res.status, 200);
      assert(res.body.data.length > 0, 'Expected at least 1 employee for visa 1');
      for (const emp of res.body.data) {
        assert.equal(emp.company_visa_id, visa1.id);
      }
    });

    it('GET /api/v1/payroll/runs?company_visa_id=<v01> filters by visa establishment', async () => {
      const res = await request(app)
        .get(`/api/v1/payroll/runs?company_visa_id=${visa1.id}`)
        .set('Authorization', `Bearer ${hrMgrToken}`);

      assert.equal(res.status, 200);
      const items = Array.isArray(res.body) ? res.body : res.body.items || [];
      for (const run of items) {
        assert.equal(run.company_visa_id, visa1.id);
      }
    });

    it('GET /api/v1/attendance/grid?company_visa_id=<v01> filters employees by visa', async () => {
      const res = await request(app)
        .get(`/api/v1/attendance/grid?from=2026-10-01&to=2026-10-31&company_visa_id=${visa1.id}`)
        .set('Authorization', `Bearer ${hrMgrToken}`);

      assert.equal(res.status, 200);
      const grid = res.body.grid || [];
      for (const row of grid) {
        if (row.employee?.company_visa_id) {
          assert.equal(row.employee.company_visa_id, visa1.id);
        }
      }
    });

    it('Foreign or nonexistent visa UUID returns HTTP 400 INVALID_VISA', async () => {
      const foreignVisaId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .get(`/api/v1/employees?company_visa_id=${foreignVisaId}`)
        .set('Authorization', `Bearer ${hrMgrToken}`);

      assert.equal(res.status, 400);
      assert(
        res.body.error === 'INVALID_VISA' || res.body.code === 'INVALID_VISA',
        `Expected INVALID_VISA error code, got ${JSON.stringify(res.body)}`
      );
    });
  });

  describe('GAP 2: Safe Employee Code Generator & Concurrency', () => {
    it('creates 5 employees concurrently with consecutive codes and zero P2002 errors', async () => {
      const promises = [1, 2, 3, 4, 5].map((i) =>
        employeeService.createEmployee({
          companyId: company1.id,
          data: {
            name: `Concurrent Test User ${i} ${Date.now()}`,
            company_visa_id: visa1.id,
            branch_id: branch1?.id || null,
            status: 'Pre-Joined',
            joining_date: '2026-11-15',
            residency_type: 'Expat',
            nationality: 'Indian',
            gender: 'Male',
          },
          viewer: { id: hrOfficerUser.id, userId: hrOfficerUser.id, role: 'HR_OFFICER' },
        })
      );

      const createdList = await Promise.all(promises);
      assert.equal(createdList.length, 5);

      const codes = createdList.map((e) => e.employee_code).sort();
      console.log('Generated concurrent employee codes:', codes);

      // Verify all codes follow EMP-DXB-XXX format
      for (const code of codes) {
        assert.match(code, /^EMP-DXB-\d{3,}$/);
      }

      // Verify all codes are unique
      const uniqueCodes = new Set(codes);
      assert.equal(uniqueCodes.size, 5, 'All 5 concurrent codes must be unique');

      // Verify numeric continuity
      const numbers = codes.map((c) => parseInt(c.match(/(\d+)$/)[1], 10));
      for (let j = 1; j < numbers.length; j++) {
        assert.equal(numbers[j], numbers[j - 1] + 1, 'Codes must be consecutive');
      }
    });
  });

  describe('GAP 3: Pending Verification Approval Inbox & Guards', () => {
    let testEmp;
    let approvalItem;

    it('creating Pre-Joined employee generates an EMPLOYEE_VERIFICATION approval request', async () => {
      testEmp = await employeeService.createEmployee({
        companyId: company1.id,
        data: {
          name: `Verification Test Joiner ${Date.now()}`,
          company_visa_id: visa1.id,
          branch_id: branch1?.id || null,
          status: 'Pre-Joined',
          joining_date: '2026-11-20',
          residency_type: 'Expat',
          nationality: 'Pakistani',
          gender: 'Female',
        },
        viewer: { id: hrOfficerUser.id, userId: hrOfficerUser.id, role: 'HR_OFFICER' },
      });

      assert.equal(testEmp.status, 'Pre-Joined');

      // Check approval inbox for HR Manager
      const res = await request(app)
        .get('/api/v1/approvals/pending')
        .set('Authorization', `Bearer ${hrMgrToken}`);

      assert.equal(res.status, 200);
      const items = res.body.data || [];
      approvalItem = items.find(
        (it) => it.request_type === 'EMPLOYEE_VERIFICATION' && it.record_id === testEmp.id
      );

      assert(approvalItem, 'Expected EMPLOYEE_VERIFICATION item in pending approvals inbox');
      assert.equal(approvalItem.employee?.code, testEmp.employee_code);
      assert.equal(approvalItem.employee?.name, testEmp.name);
    });

    it('creator is forbidden from self-approval (HTTP 403 SELF_APPROVAL_FORBIDDEN)', async () => {
      const res = await request(app)
        .post(`/api/v1/approvals/${approvalItem.id}/action`)
        .set('Authorization', `Bearer ${hrOfficerToken}`)
        .send({ action: 'APPROVE', comment: 'Attempting self-approval' });

      assert.equal(res.status, 403);
      assert(
        res.body.code === 'SELF_APPROVAL_FORBIDDEN' || res.body.error === 'SELF_APPROVAL_FORBIDDEN',
        `Expected SELF_APPROVAL_FORBIDDEN, got: ${JSON.stringify(res.body)}`
      );
    });

    it('rejecting without reason or reason < 5 chars is rejected with HTTP 400', async () => {
      const res = await request(app)
        .post(`/api/v1/approvals/${approvalItem.id}/action`)
        .set('Authorization', `Bearer ${hrMgrToken}`)
        .send({ action: 'REJECT', reason: 'bad' });

      assert.equal(res.status, 400);
    });

    it('HR Manager approves employee verification -> employee status advances to New Joined', async () => {
      const res = await request(app)
        .post(`/api/v1/approvals/${approvalItem.id}/action`)
        .set('Authorization', `Bearer ${hrMgrToken}`)
        .send({ action: 'APPROVE', comment: 'Approved legal records verification' });

      assert.equal(res.status, 200);

      // Verify employee record is now New Joined
      const updated = await prisma.$base().employees.findUnique({
        where: { id: testEmp.id },
      });
      assert.equal(updated.status, 'New Joined');
      assert.equal(updated.verified_by, hrMgrUser.id);
      assert(updated.verified_at, 'verified_at timestamp must be recorded');
    });
  });
});

