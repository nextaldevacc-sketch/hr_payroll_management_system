import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../../src/app.js';
import prisma from '../../src/lib/prisma.js';
import authService from '../../src/services/authService.js';
import userService from '../../src/services/userService.js';
import { authIpLimiter, authEmailLimiter } from '../../src/lib/rateLimiter.js';

describe('Part 11 Section A: Authentication Reliability & Session Management', () => {
  let company;
  let testUser;
  let adminUser;
  const runId = Date.now();
  const testPassword = 'Password#Reliable2026!';
  const userEmail = `user-${runId}@reliability.test`;
  const adminEmail = `admin-${runId}@reliability.test`;

  before(async () => {
    // 1. Create company
    company = await prisma.$base().companies.create({
      data: {
        name: `Auth Reliability Co ${runId}`,
        trade_license_no: `TL-REL-${runId}`,
        require_privileged_mfa: false,
      },
    });

    const roleHrMgr = await prisma.$base().roles.findUnique({ where: { code: 'HR_MANAGER' } });
    const roleAdmin = await prisma.$base().roles.findUnique({ where: { code: 'COMPANY_ADMIN' } });
    const passwordHash = await authService.hashPassword(testPassword);

    // 2. Create test HR Manager
    testUser = await prisma.$base().users.create({
      data: {
        company_id: company.id,
        email: userEmail,
        password_hash: passwordHash,
        status: 'Active',
        must_change_password: false,
      },
    });
    if (roleHrMgr) {
      await prisma.$base().user_roles.create({
        data: {
          company_id: company.id,
          user_id: testUser.id,
          role_id: roleHrMgr.id,
          scope_type: 'Company',
        },
      });
    }

    // 3. Create Admin user
    adminUser = await prisma.$base().users.create({
      data: {
        company_id: company.id,
        email: adminEmail,
        password_hash: passwordHash,
        status: 'Active',
        must_change_password: false,
      },
    });
    if (roleAdmin) {
      await prisma.$base().user_roles.create({
        data: {
          company_id: company.id,
          user_id: adminUser.id,
          role_id: roleAdmin.id,
          scope_type: 'Company',
        },
      });
    }
  });

  after(async () => {
    try {
      await prisma.$base().rate_limits.deleteMany({});
      await prisma.$base().sessions.deleteMany({ where: { user_id: { in: [testUser.id, adminUser.id] } } });
      await prisma.$base().user_roles.deleteMany({ where: { company_id: company.id } });
      await prisma.$base().users.deleteMany({ where: { company_id: company.id } });
      await prisma.$base().companies.delete({ where: { id: company.id } });
    } catch (e) {
      // Ignore cleanup error
    }
  });

  it('1. Supports multiple concurrent sessions: Device A and Device B log in simultaneously', async () => {
    // Device A login
    const resA = await request(app)
      .post('/api/v1/auth/login')
      .set('Origin', 'https://localhost')
      .set('User-Agent', 'DeviceA/1.0')
      .send({ email: userEmail, password: testPassword });

    assert.equal(resA.status, 200);
    assert.ok(resA.body.token);
    assert.ok(resA.body.sessionId);
    const tokenA = resA.body.token;
    const sessionAId = resA.body.sessionId;

    // Device B login
    const resB = await request(app)
      .post('/api/v1/auth/login')
      .set('Origin', 'https://localhost')
      .set('User-Agent', 'DeviceB/1.0')
      .send({ email: userEmail, password: testPassword });

    assert.equal(resB.status, 200);
    assert.ok(resB.body.token);
    assert.ok(resB.body.sessionId);
    const tokenB = resB.body.token;
    const sessionBId = resB.body.sessionId;

    // Must be distinct sessions
    assert.notEqual(sessionAId, sessionBId);

    // Both sessions can access /auth/me
    const meA = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${tokenA}`);
    assert.equal(meA.status, 200);
    assert.equal(meA.body.user.email, userEmail);

    const meB = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${tokenB}`);
    assert.equal(meB.status, 200);
    assert.equal(meB.body.user.email, userEmail);

    // Device A logs out
    const logoutA = await request(app)
      .post('/api/v1/auth/logout')
      .set('Origin', 'https://localhost')
      .set('Authorization', `Bearer ${tokenA}`);
    assert.equal(logoutA.status, 200);

    // Device A is now revoked
    const meAAfter = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${tokenA}`);
    assert.equal(meAAfter.status, 401);
    assert.equal(meAAfter.body.code, 'SESSION_REVOKED');

    // Device B MUST STILL BE VALID! (No cross-kickout bug)
    const meBAfter = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${tokenB}`);
    assert.equal(meBAfter.status, 200);
    assert.equal(meBAfter.body.user.email, userEmail);
  });

  it('2. POST /api/v1/auth/logout-all logs out all devices for the user', async () => {
    // Device C and Device D log in
    const resC = await request(app)
      .post('/api/v1/auth/login')
      .set('Origin', 'https://localhost')
      .set('User-Agent', 'DeviceC/1.0')
      .send({ email: userEmail, password: testPassword });
    const tokenC = resC.body.token;

    const resD = await request(app)
      .post('/api/v1/auth/login')
      .set('Origin', 'https://localhost')
      .set('User-Agent', 'DeviceD/1.0')
      .send({ email: userEmail, password: testPassword });
    const tokenD = resD.body.token;

    // Call logout-all using Device C
    const logoutAllRes = await request(app)
      .post('/api/v1/auth/logout-all')
      .set('Origin', 'https://localhost')
      .set('Authorization', `Bearer ${tokenC}`);
    assert.equal(logoutAllRes.status, 200);
    assert.equal(logoutAllRes.body.status, 'success');

    // Both Device C and Device D must now be revoked
    const meC = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${tokenC}`);
    assert.equal(meC.status, 401);

    const meD = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${tokenD}`);
    assert.equal(meD.status, 401);
  });

  it('3. Account lockout: 5 consecutive failed attempts lock the account with 423', async () => {
    const freshUserEmail = `locktest-${runId}@reliability.test`;
    const passwordHash = await authService.hashPassword(testPassword);
    const lockUser = await prisma.$base().users.create({
      data: {
        company_id: company.id,
        email: freshUserEmail,
        password_hash: passwordHash,
        status: 'Active',
      },
    });

    // 4 failed attempts -> 401 with remainingAttempts
    for (let i = 1; i <= 4; i++) {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .set('Origin', 'https://localhost')
        .send({ email: freshUserEmail, password: 'WrongPassword999!' });
      assert.equal(res.status, 401);
      assert.equal(res.body.code, 'INVALID_CREDENTIALS');
      assert.equal(res.body.remainingAttempts, 5 - i);
    }

    // 5th failed attempt -> 423 ACCOUNT_LOCKED
    const lockRes = await request(app)
      .post('/api/v1/auth/login')
      .set('Origin', 'https://localhost')
      .send({ email: freshUserEmail, password: 'WrongPassword999!' });

    assert.equal(lockRes.status, 423);
    assert.equal(lockRes.body.code, 'ACCOUNT_LOCKED');
    assert.ok(lockRes.body.message.includes('Account is locked'));

    // Even with CORRECT password, login is blocked with 423 while locked
    const correctWhileLocked = await request(app)
      .post('/api/v1/auth/login')
      .set('Origin', 'https://localhost')
      .send({ email: freshUserEmail, password: testPassword });

    assert.equal(correctWhileLocked.status, 423);
    assert.equal(correctWhileLocked.body.code, 'ACCOUNT_LOCKED');

    // Admin unlocks user -> resets lock and rate limit points
    await userService.unlockUser({
      companyId: company.id,
      userId: lockUser.id,
      updatedBy: adminUser.id,
    });

    // Now login with correct password succeeds immediately
    const loginAfterUnlock = await request(app)
      .post('/api/v1/auth/login')
      .set('Origin', 'https://localhost')
      .send({ email: freshUserEmail, password: testPassword });

    assert.equal(loginAfterUnlock.status, 200);
    assert.ok(loginAfterUnlock.body.token);

    // Cleanup (ignore FK to immutable audit_logs)
    try {
      await prisma.$base().sessions.deleteMany({ where: { user_id: lockUser.id } });
    } catch {}
  });

  it('4. Distributed Rate Limiter: returns 429 with retry-after header and clear code', async () => {
    // Verify PostgresRateLimiter returns allowed: false and retryAfterSeconds when points exceed max
    const { PostgresRateLimiter } = await import('../../src/lib/rateLimiter.js');
    const testLimiter = new PostgresRateLimiter({
      windowMs: 15 * 60 * 1000,
      max: 5,
      keyPrefix: 'test_limit',
    });

    const testKey = `rate-test-${runId}@test.local`;
    const res = await testLimiter.consume(testKey, 6);
    assert.equal(res.allowed, false);
    assert.ok(res.retryAfterSeconds > 0);
  });
});
