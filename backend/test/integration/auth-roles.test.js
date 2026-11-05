import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../../src/app.js';
import prisma from '../../src/lib/prisma.js';
import authService from '../../src/services/authService.js';
import userService from '../../src/services/userService.js';
import companyService from '../../src/services/companyService.js';
import approvalService from '../../src/services/approvalService.js';
import jwt from 'jsonwebtoken';
import { deepScanForSalaryBankData, FORBIDDEN_SALARY_BANK_KEYS } from '../../src/serializers/index.js';
import { clearSessionCache, invalidateCompanySessions } from '../../src/middleware/authCache.js';

const JWT_SECRET = process.env.JWT_SECRET || 'nextal_super_secret_jwt_key_2026_uae';

describe('Phase 2: Authentication, Roles, Permissions Matrix & Approval Engine Tests', () => {
  let company1;
  let testUserPassword = 'Nextal@2026!';

  before(async () => {
    company1 = await prisma.$base().companies.findFirst({
      where: { name: 'Gulf Tech Logistics LLC' },
    });
    assert(company1, 'Gulf Tech Logistics LLC company must exist in database');
  });

  beforeEach(() => {
    clearSessionCache();
  });

  // =========================================================================
  // 1. Login & Session (JWT, 8-hour session, bcrypt)
  // =========================================================================
  describe('1. Login & Session Management', () => {
    it('successfully logs in with valid credentials and sets 8-hour httpOnly cookie', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@gulftech.ae',
          password: testUserPassword,
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.status, 'success');
      assert.ok(res.body.token, 'Token must be returned in response');
      assert.equal(res.body.user.email, 'admin@gulftech.ae');
      assert.ok(res.body.user.roles.includes('COMPANY_ADMIN'));

      // Verify Set-Cookie header for httpOnly cookie
      const cookies = res.headers['set-cookie'];
      assert.ok(cookies, 'Set-Cookie header must be present');
      const tokenCookie = cookies.find((c) => c.startsWith('nextal_token='));
      assert.ok(tokenCookie, 'nextal_token cookie must be set');
      assert.ok(tokenCookie.includes('HttpOnly'), 'Cookie must be HttpOnly');
      assert.ok(tokenCookie.includes('Max-Age=28800'), 'Cookie Max-Age must be 28800 seconds (8 hours)');

      // Verify token decoded expiration
      const decoded = jwt.verify(res.body.token, JWT_SECRET);
      assert.equal(decoded.email, 'admin@gulftech.ae');
      const lifespanHours = (decoded.exp - decoded.iat) / 3600;
      assert.equal(lifespanHours, 8, 'JWT lifespan must be exactly 8 hours');
    });

    it('GET /api/v1/auth/me returns current user profile; Company Admin does NOT see salary by default', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@gulftech.ae',
          password: testUserPassword,
        });

      const token = loginRes.body.token;

      // Access using Bearer token
      const meRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      assert.equal(meRes.status, 200);
      assert.equal(meRes.body.user.email, 'admin@gulftech.ae');
      assert.equal(meRes.body.user.company_name, 'Gulf Tech Logistics LLC');
      // Section 5: Company Admin does NOT see salary by default unless holding salary role!
      assert.equal(meRes.body.user.sees_salary, false);

      // Access using cookie
      const meCookieRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Cookie', `nextal_token=${token}`);

      assert.equal(meCookieRes.status, 200);
      assert.equal(meCookieRes.body.user.email, 'admin@gulftech.ae');
    });

    it('HR Manager and Payroll Officer DO see salary by default', async () => {
      const hrLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'hr.mgr@gulftech.ae', password: testUserPassword });
      assert.equal(hrLogin.body.user.sees_salary, true);

      const payrollLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'payroll@gulftech.ae', password: testUserPassword });
      assert.equal(payrollLogin.body.user.sees_salary, true);
    });

    it('rejects invalid password with 401 and tracks failed login attempts', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'dept.mgr@gulftech.ae',
          password: 'WrongPassword123!',
        });

      assert.equal(res.status, 401);
      assert.equal(res.body.code, 'INVALID_CREDENTIALS');

      const user = await prisma.$base().users.findUnique({
        where: { email: 'dept.mgr@gulftech.ae' },
      });
      assert.ok(user.failed_logins >= 1);
    });

    it('POST /api/v1/auth/logout clears nextal_token cookie', async () => {
      const res = await request(app).post('/api/v1/auth/logout');
      assert.equal(res.status, 200);
      const cookies = res.headers['set-cookie'];
      assert.ok(cookies, 'Set-Cookie header must be present');
      const cleared = cookies.some((c) => c.includes('nextal_token=;') || c.includes('Max-Age=0'));
      assert.ok(cleared, 'nextal_token cookie must be cleared on logout');
    });
  });

  // =========================================================================
  // 2. Lockout after 5 Failed Attempts for 15 Minutes & Auto-Expiry
  // =========================================================================
  describe('2. Account Lockout Protection & Auto-Expiry', () => {
    let testLockoutEmail;
    let lockoutUserId;

    before(async () => {
      testLockoutEmail = `lockout.test.${Date.now()}@gulftech.ae`;
      const hash = await authService.hashPassword('CorrectPass123!');
      const user = await prisma.$base().users.create({
        data: {
          company_id: company1.id,
          email: testLockoutEmail,
          password_hash: hash,
          status: 'Active',
          failed_logins: 0,
        },
      });
      lockoutUserId = user.id;
    });

    it('locks account after 5 consecutive failed attempts with HTTP 423 and 15-minute lock', async () => {
      for (let i = 1; i <= 4; i++) {
        const res = await request(app)
          .post('/api/v1/auth/login')
          .send({ email: testLockoutEmail, password: 'BadPassword!' });
        assert.equal(res.status, 401);
      }

      // 5th attempt triggers lockout
      const fifthRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testLockoutEmail, password: 'BadPassword!' });

      assert.equal(fifthRes.status, 423, '5th attempt must return HTTP 423 Locked');
      assert.equal(fifthRes.body.code, 'ACCOUNT_LOCKED');

      const userInDb = await prisma.$base().users.findUnique({
        where: { email: testLockoutEmail },
      });
      assert.equal(userInDb.failed_logins, 5);
      assert.equal(userInDb.status, 'Locked');
      assert.ok(userInDb.locked_until);

      const remainingMs = userInDb.locked_until.getTime() - Date.now();
      assert.ok(remainingMs > 14 * 60 * 1000 && remainingMs <= 15 * 60 * 1000 + 5000);
    });

    it('blocks subsequent attempts with correct password while locked', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testLockoutEmail, password: 'CorrectPass123!' });

      assert.equal(res.status, 423);
      assert.equal(res.body.code, 'ACCOUNT_LOCKED');
    });

    it('lockout auto-expires after 15 minutes (mocked time) and status does not persist forever', async () => {
      // Mock time advancing by setting locked_until to 1 minute in the past
      await prisma.$base().users.update({
        where: { email: testLockoutEmail },
        data: {
          locked_until: new Date(Date.now() - 60 * 1000), // 1 min in past
        },
      });

      // Attempt login with correct password
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testLockoutEmail, password: 'CorrectPass123!' });

      assert.equal(res.status, 200, 'Login must succeed once 15 minutes have passed');
      assert.equal(res.body.user.status, 'Active');

      // Failure counter must be reset to 0 and locked_until must be cleared
      const userAfter = await prisma.$base().users.findUnique({
        where: { email: testLockoutEmail },
      });
      assert.equal(userAfter.failed_logins, 0);
      assert.equal(userAfter.locked_until, null);
      assert.equal(userAfter.status, 'Active');
    });

    it('company admin unlock explicitly clears failure counter and locked status', async () => {
      // Put user back into locked state
      await prisma.$base().users.update({
        where: { id: lockoutUserId },
        data: {
          failed_logins: 5,
          locked_until: new Date(Date.now() + 15 * 60 * 1000),
          status: 'Locked',
        },
      });

      // Admin logs in
      const adminLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'admin@gulftech.ae', password: testUserPassword });

      // Admin calls unlock
      const unlockRes = await request(app)
        .post(`/api/v1/company/users/${lockoutUserId}/unlock`)
        .set('Authorization', `Bearer ${adminLogin.body.token}`);

      assert.equal(unlockRes.status, 200);

      const unlockedUser = await prisma.$base().users.findUnique({
        where: { id: lockoutUserId },
      });
      assert.equal(unlockedUser.failed_logins, 0);
      assert.equal(unlockedUser.locked_until, null);
      assert.equal(unlockedUser.status, 'Active');
    });
  });

  // =========================================================================
  // 3. Invite & Reset Tokens (32-byte, sha256 hashed, single-use, expiring)
  // =========================================================================
  describe('3. Single-Use Expiring Invite & Reset Tokens', () => {
    it('invite token is single-use and cannot be redeemed a second time', async () => {
      const email = `invite.singleuse.${Date.now()}@gulftech.ae`;
      const passHash = await authService.hashPassword('TempPass123!');
      const user = await prisma.$base().users.create({
        data: {
          company_id: company1.id,
          email,
          password_hash: passHash,
          status: 'Invited',
        },
      });

      // Generate raw token (auth_tokens stores sha256 hash)
      const rawToken = await authService.generateInviteToken(user);
      assert.equal(rawToken.length, 64, '32-byte hex token must be 64 characters');

      // First use: must succeed
      const use1 = await authService.setPasswordFromInvite({
        token: rawToken,
        password: 'FinalPassword2026!',
      });
      assert.equal(use1.status, 'success');

      // Second use: must fail with TOKEN_ALREADY_USED
      await assert.rejects(
        async () => {
          await authService.setPasswordFromInvite({
            token: rawToken,
            password: 'AnotherPassword2026!',
          });
        },
        (err) => err.code === 'TOKEN_ALREADY_USED' || err.status === 400
      );
    });

    it('rejects expired invite tokens (72h expiry)', async () => {
      const email = `invite.expired.${Date.now()}@gulftech.ae`;
      const passHash = await authService.hashPassword('TempPass123!');
      const user = await prisma.$base().users.create({
        data: {
          company_id: company1.id,
          email,
          password_hash: passHash,
          status: 'Invited',
        },
      });

      const rawToken = await authService.generateInviteToken(user);

      // Artificially expire the token in database
      const crypto = await import('crypto');
      const hash = crypto.createHash('sha256').update(rawToken).digest('hex');
      await prisma.$base().auth_tokens.update({
        where: { token_hash: hash },
        data: { expires_at: new Date(Date.now() - 1000) },
      });

      await assert.rejects(
        async () => {
          await authService.setPasswordFromInvite({
            token: rawToken,
            password: 'NewPassword2026!',
          });
        },
        (err) => err.code === 'TOKEN_EXPIRED' || err.status === 400
      );
    });

    it('password reset token is single-use and expiring (1h expiry)', async () => {
      const email = `reset.test.${Date.now()}@gulftech.ae`;
      const passHash = await authService.hashPassword('OldPass123!');
      await prisma.$base().users.create({
        data: {
          company_id: company1.id,
          email,
          password_hash: passHash,
          status: 'Active',
        },
      });

      const gen = await authService.generateResetToken(email);
      const rawToken = gen.resetToken;

      // 1st reset succeeds
      const reset1 = await authService.resetPassword({
        token: rawToken,
        newPassword: 'BrandNewPass2026!',
      });
      assert.equal(reset1.status, 'success');

      // 2nd reset fails (single-use)
      await assert.rejects(
        async () => {
          await authService.resetPassword({
            token: rawToken,
            newPassword: 'BrandNewPass2026!',
          });
        },
        (err) => err.code === 'TOKEN_ALREADY_USED' || err.status === 400
      );
    });
  });

  // =========================================================================
  // 4. Permissions Matrix (Section 5.3) Enforcement
  // =========================================================================
  describe('4. Section 5.3 Permissions Matrix & HTTP 403 Enforcement', () => {
    let tokens = {};

    before(async () => {
      const testPersonas = [
        'employee@gulftech.ae',
        'dept.mgr@gulftech.ae',
        'hr.officer@gulftech.ae',
        'payroll@gulftech.ae',
        'hr.mgr@gulftech.ae',
        'gm@gulftech.ae',
        'finance@gulftech.ae',
        'admin@gulftech.ae',
      ];

      for (const email of testPersonas) {
        const loginRes = await request(app)
          .post('/api/v1/auth/login')
          .send({ email, password: testUserPassword });
        if (loginRes.status === 200) {
          tokens[email] = loginRes.body.token;
        }
      }
    });

    it('Employee role: blocked from viewing company employee list (HTTP 403)', async () => {
      const res = await request(app)
        .get('/api/v1/employees')
        .set('Authorization', `Bearer ${tokens['employee@gulftech.ae']}`);
      assert.equal(res.status, 403);
    });

    it('Dept Manager: allowed to view team employees, blocked from salary endpoints (HTTP 403)', async () => {
      const empRes = await request(app)
        .get('/api/v1/employees')
        .set('Authorization', `Bearer ${tokens['dept.mgr@gulftech.ae']}`);
      assert.equal(empRes.status, 200);

      const payRes = await request(app)
        .get('/api/v1/payroll/overview')
        .set('Authorization', `Bearer ${tokens['dept.mgr@gulftech.ae']}`);
      assert.equal(payRes.status, 403);
    });

    it('HR Officer: allowed to view employee records, blocked from salary endpoints (HTTP 403)', async () => {
      const empRes = await request(app)
        .get('/api/v1/employees')
        .set('Authorization', `Bearer ${tokens['hr.officer@gulftech.ae']}`);
      assert.equal(empRes.status, 200);

      const payRes = await request(app)
        .get('/api/v1/payroll/overview')
        .set('Authorization', `Bearer ${tokens['hr.officer@gulftech.ae']}`);
      assert.equal(payRes.status, 403);
    });

    it('Payroll Officer: allowed to view salary endpoints', async () => {
      const payRes = await request(app)
        .get('/api/v1/payroll/overview')
        .set('Authorization', `Bearer ${tokens['payroll@gulftech.ae']}`);
      assert.equal(payRes.status, 200);
    });

    it('Finance: allowed to view salary overview, blocked from employee records (HTTP 403)', async () => {
      const payRes = await request(app)
        .get('/api/v1/payroll/overview')
        .set('Authorization', `Bearer ${tokens['finance@gulftech.ae']}`);
      assert.equal(payRes.status, 200);

      const empRes = await request(app)
        .get('/api/v1/employees')
        .set('Authorization', `Bearer ${tokens['finance@gulftech.ae']}`);
      assert.equal(empRes.status, 403);
    });
  });

  // =========================================================================
  // 5. Salary Privacy: Allowlist & Deep-Scan for All Non-Salary Roles
  // =========================================================================
  describe('5. Salary Privacy Allowlist & Deep-Scan', () => {
    const nonSalaryEmails = [
      'employee@gulftech.ae',
      'dept.mgr@gulftech.ae',
      'hr.officer@gulftech.ae',
      'admin@gulftech.ae', // Company Admin does NOT see salary by default!
    ];

    for (const email of nonSalaryEmails) {
      it(`deep-scan verifies NO salary or bank fields appear for ${email}`, async () => {
        const loginRes = await request(app)
          .post('/api/v1/auth/login')
          .send({ email, password: testUserPassword });

        const token = loginRes.body.token;

        // Call employee endpoints if accessible
        const empRes = await request(app)
          .get('/api/v1/employees')
          .set('Authorization', `Bearer ${token}`);

        if (empRes.status === 200) {
          // Deep-scan entire payload at all nesting depths
          assert.doesNotThrow(() => {
            deepScanForSalaryBankData(empRes.body.data);
          }, `Payload for ${email} contained forbidden salary or bank keys`);
        }

        // Call single employee endpoint
        const sampleEmp = await prisma.$base().employees.findFirst({
          where: { company_id: company1.id },
        });

        if (sampleEmp) {
          const detailRes = await request(app)
            .get(`/api/v1/employees/${sampleEmp.id}`)
            .set('Authorization', `Bearer ${token}`);

          if (detailRes.status === 200) {
            assert.doesNotThrow(() => {
              deepScanForSalaryBankData(detailRes.body.data);
            }, `Detail payload for ${email} contained forbidden salary or bank keys`);
          }
        }

        // Must be blocked from payroll overview
        const payRes = await request(app)
          .get('/api/v1/payroll/overview')
          .set('Authorization', `Bearer ${token}`);
        assert.equal(payRes.status, 403, `Non-salary role ${email} must be blocked from payroll`);
      });
    }

    it('Payroll Officer receives employee list WITH intact salary figures', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'payroll@gulftech.ae', password: testUserPassword });

      const res = await request(app)
        .get('/api/v1/employees')
        .set('Authorization', `Bearer ${loginRes.body.token}`);

      assert.equal(res.status, 200);
      const sample = res.body.data.find((e) => e.contracts && e.contracts.length > 0);
      assert.ok(sample);
      assert.notEqual(sample.contracts[0].basic, undefined);
      assert.notEqual(sample.contracts[0].gross, undefined);
    });
  });

  // =========================================================================
  // 6. Approval Engine: Self-Approval Prevention Rule
  // =========================================================================
  describe('6. Approval Engine: Self-Approval Prevention Rule', () => {
    let hrManagerUser;
    let createdRequest;

    before(async () => {
      hrManagerUser = await prisma.$base().users.findUnique({
        where: { email: 'hr.mgr@gulftech.ae' },
      });
      assert(hrManagerUser);

      createdRequest = await approvalService.createRequest({
        companyId: company1.id,
        requestType: 'Leave',
        recordId: '00000000-0000-0000-0000-000000000001',
        requestedBy: hrManagerUser.id,
        details: { employee_name: 'Maryam Al-Nuaimi', days: 3 },
      });
    });

    it('strictly forbids HR Manager from approving their OWN request (HTTP 403)', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'hr.mgr@gulftech.ae', password: testUserPassword });

      const actionRes = await request(app)
        .post(`/api/v1/approvals/requests/${createdRequest.id}/action`)
        .set('Authorization', `Bearer ${loginRes.body.token}`)
        .send({ action: 'Approve' });

      assert.equal(actionRes.status, 403);
      assert.equal(actionRes.body.code, 'SELF_APPROVAL_FORBIDDEN');
    });

    it('allows a DIFFERENT qualified approver (Company Admin) to approve the request', async () => {
      const adminLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'admin@gulftech.ae', password: testUserPassword });

      const actionRes = await request(app)
        .post(`/api/v1/approvals/requests/${createdRequest.id}/action`)
        .set('Authorization', `Bearer ${adminLogin.body.token}`)
        .send({ action: 'Approve' });

      assert.equal(actionRes.status, 200);
      assert.equal(actionRes.body.status, 'success');
    });
  });

  // =========================================================================
  // 7. Platform Admin Data Isolation & Support Access (FR-PL3)
  // =========================================================================
  describe('7. Platform Admin Data Isolation & Support Access (FR-PL3)', () => {
    if (process.env.FEATURE_PLATFORM_ADMIN !== 'true') {
      it('Platform Admin is disabled in this release (HTTP 403 on login, 404 on platform routes)', async () => {
        const loginRes = await request(app)
          .post('/api/v1/auth/login')
          .send({ email: 'platform@nextal.ae', password: testUserPassword });
        assert.equal(loginRes.status, 403);
        assert.equal(loginRes.body.code, 'FEATURE_DISABLED');

        const platformRes = await request(app).get('/api/v1/platform/companies');
        assert.equal(platformRes.status, 404);
      });
    } else {
      let platformToken;

      before(async () => {
        const loginRes = await request(app)
          .post('/api/v1/auth/login')
          .send({ email: 'platform@nextal.ae', password: testUserPassword });
        platformToken = loginRes.body.token;

        // Clean up any residual support access grants
        await prisma.$base().support_access_grants.deleteMany({
          where: { company_id: company1.id },
        });
      });

      it('Platform Admin is BLOCKED (HTTP 403) from company employee data without active grant', async () => {
        const res = await request(app)
          .get(`/api/v1/platform/companies/${company1.id}/data`)
          .set('Authorization', `Bearer ${platformToken}`);

        assert.equal(res.status, 403);
        assert.equal(res.body.code, 'SUPPORT_GRANT_REQUIRED');
      });

      it('Platform Admin can access company data when an active time-limited support grant exists', async () => {
        const grantRes = await request(app)
          .post(`/api/v1/platform/companies/${company1.id}/support-grants`)
          .set('Authorization', `Bearer ${platformToken}`)
          .send({
            reason: 'Diagnosing biometric punch sync issue',
            duration_hours: 4,
          });

        assert.equal(grantRes.status, 201);
        const grantId = grantRes.body.data.id;

        const accessRes = await request(app)
          .get(`/api/v1/platform/companies/${company1.id}/data`)
          .set('Authorization', `Bearer ${platformToken}`);

        assert.equal(accessRes.status, 200);
        assert.ok(accessRes.body.count >= 42);

        // Clean up grant
        await request(app)
          .delete(`/api/v1/platform/support-grants/${grantId}`)
          .set('Authorization', `Bearer ${platformToken}`);
      });
    }
  });

  // =========================================================================
  // 8. Session Revocation: Company Suspension, User Disabling & Token Version
  // =========================================================================
  describe('8. Session Invalidation & Re-check on Every Request', () => {
    it('suspending a company causes existing user tokens to receive HTTP 403 on the next request', async () => {
      // 1. Log in a user in Company 1
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'hr.mgr@gulftech.ae', password: testUserPassword });
      const userToken = loginRes.body.token;

      // Verify token works
      const test1 = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${userToken}`);
      assert.equal(test1.status, 200);

      // 2. Suspend Company 1
      try {
        await prisma.$base().companies.update({
          where: { id: company1.id },
          data: { status: 'Suspended' },
        });
        invalidateCompanySessions(company1.id);

        // 3. User uses the SAME token on the next request -> MUST receive HTTP 403 COMPANY_SUSPENDED
        const test2 = await request(app)
          .get('/api/v1/auth/me')
          .set('Authorization', `Bearer ${userToken}`);

        assert.equal(test2.status, 403);
        assert.equal(test2.body.code, 'COMPANY_SUSPENDED');
      } finally {
        // Reactivate Company 1 for subsequent tests
        await prisma.$base().companies.update({
          where: { id: company1.id },
          data: { status: 'Active' },
        });
        invalidateCompanySessions(company1.id);
      }
    });

    it('disabling a user causes their existing token to receive HTTP 401 on the next request', async () => {
      const email = `disablable.${Date.now()}@gulftech.ae`;
      const passHash = await authService.hashPassword('Pass12345!');
      const user = await prisma.$base().users.create({
        data: {
          company_id: company1.id,
          email,
          password_hash: passHash,
          status: 'Active',
        },
      });

      // User logs in and gets token
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email, password: 'Pass12345!' });
      const token = loginRes.body.token;

      // Disable the user
      await userService.updateUserStatus({
        companyId: company1.id,
        userId: user.id,
        status: 'Disabled',
        updatedBy: user.id,
      });

      // Next request with existing token MUST return HTTP 401
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      assert.equal(res.status, 401);
      assert.ok(res.body.code === 'ACCOUNT_DISABLED' || res.body.code === 'SESSION_REVOKED');
    });

    it('strictly forbids authentication bypass via path tricks (Section 1 security verification)', async () => {
      // 1. GET /api/v1/employees?x=/auth/me without token -> 401
      const res1 = await request(app).get('/api/v1/employees?x=/auth/me');
      assert.equal(res1.status, 401);

      // 2. GET /api/v1/me/payslips?r=/auth/me without token -> 401
      const res2 = await request(app).get('/api/v1/me/payslips?r=/auth/me');
      assert.equal(res2.status, 401);

      // 3. GET /api/v1/payroll/runs with X-Original-URL: /auth/me without token -> 401
      const res3 = await request(app)
        .get('/api/v1/payroll/runs')
        .set('X-Original-URL', '/auth/me');
      assert.equal(res3.status, 401);

      // 4. GET /api/v1/auth/me without token -> 200 with { user: null }
      const res4 = await request(app).get('/api/v1/auth/me');
      assert.equal(res4.status, 200);
      assert.equal(res4.body.user, null);
    });
  });
});
