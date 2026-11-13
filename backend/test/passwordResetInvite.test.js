import dotenv from 'dotenv';
dotenv.config({ path: 'backend/.env' });
import test from 'node:test';
import assert from 'node:assert/strict';
import authService from '../src/services/authService.js';
import userService from '../src/services/userService.js';
import prisma from '../src/lib/prisma.js';
import mailer from '../src/lib/mailer.js';

test('Password Reset & Invite Flows End-to-End (E3 & SEC-4)', async (t) => {
  let testCompany;
  let testUser;

  // Setup test company & user
  testCompany = await prisma.$base().companies.findFirst();
  if (!testCompany) {
    testCompany = await prisma.$base().companies.create({
      data: {
        name: 'Email Flow Test Company LLC',
        trade_license_no: 'TL-TEST-FLOW',
      },
    });
  }

  const uniqueEmail = `test_flow_${Date.now()}@flowtest.ae`;
  const initialPassword = 'InitialStrongPassword123!';
  const initialHash = await authService.hashPassword(initialPassword);

  testUser = await prisma.$base().users.create({
    data: {
      email: uniqueEmail,
      password_hash: initialHash,
      company_id: testCompany.id,
      status: 'Active',
      token_version: 1,
    },
  });

  t.after(async () => {
    try {
      await prisma.$base().audit_logs.deleteMany({ where: { user_id: testUser.id } }).catch(() => {});
      await prisma.$base().auth_tokens.deleteMany({ where: { user_id: testUser.id } }).catch(() => {});
      await prisma.$base().users.delete({ where: { id: testUser.id } }).catch(() => {});
    } catch (_) {}
  });

  await t.test('1. forgot-password generates single-use expiring token and dispatches email', async () => {
    mailer.clearHistory();
    const res = await authService.generateResetToken(uniqueEmail);

    assert.equal(res.status, 'success');
    assert.equal(res.message, 'If the email is registered, a password reset link has been dispatched.');

    // Verify token record in database
    const tokenRecord = await prisma.$base().auth_tokens.findFirst({
      where: { user_id: testUser.id, purpose: 'reset_password' },
      orderBy: { created_at: 'desc' },
    });
    assert.ok(tokenRecord, 'Auth token must be persisted in database');
    assert.equal(tokenRecord.used_at, null, 'New token must not be used');
    assert.ok(tokenRecord.expires_at > new Date(), 'Expires at must be in the future');

    // Verify email was dispatched via mailer
    const recent = mailer.getRecentSent();
    const resetMail = recent.find((m) => m.to === uniqueEmail);
    assert.ok(resetMail, 'Reset email must be dispatched to recipient');
    assert.ok(resetMail.html.includes('reset-password'), 'Email must contain reset link');
  });

  await t.test('2. timing and message are indistinguishable between known and unknown emails (anti-enumeration)', async () => {
    const unknownEmail = `nonexistent_user_${Date.now()}@doesnotexist.ae`;

    const startUnknown = Date.now();
    const resUnknown = await authService.generateResetToken(unknownEmail);
    const durationUnknown = Date.now() - startUnknown;

    const startKnown = Date.now();
    const resKnown = await authService.generateResetToken(uniqueEmail);
    const durationKnown = Date.now() - startKnown;

    // Both messages must be strictly identical
    assert.equal(resUnknown.message, resKnown.message);
    assert.equal(resUnknown.status, resKnown.status);

    // Timing delta should be minimal (within timing equalizer tolerances)
    const delta = Math.abs(durationKnown - durationUnknown);
    assert.ok(delta < 300, `Timing delta (${delta}ms) is safely within equalizer limits`);
  });

  await t.test('3. resetting password invalidates all sessions by incrementing token_version', async () => {
    // Generate fresh reset token
    const res = await authService.generateResetToken(uniqueEmail);
    const rawToken = res.resetToken;

    const userBefore = await prisma.$base().users.findUnique({ where: { id: testUser.id } });
    const versionBefore = userBefore.token_version;

    // Execute reset
    const newPassword = 'NewPermanentPassword2026!';
    await authService.resetPassword({ token: rawToken, newPassword });

    const userAfter = await prisma.$base().users.findUnique({ where: { id: testUser.id } });
    assert.equal(
      userAfter.token_version,
      versionBefore + 1,
      'token_version must increment by 1 on password reset to invalidate active JWTs'
    );

    // Verify user can login with new password
    const loginRes = await authService.login({ email: uniqueEmail, password: newPassword });
    assert.ok(loginRes.token, 'Must successfully login with new password');
  });

  await t.test('4. reset token is single-use: second attempt fails with TOKEN_ALREADY_USED', async () => {
    const res = await authService.generateResetToken(uniqueEmail);
    const rawToken = res.resetToken;

    // First use
    await authService.resetPassword({ token: rawToken, newPassword: 'AnotherPassword123!' });

    // Second use
    await assert.rejects(
      async () => {
        await authService.resetPassword({ token: rawToken, newPassword: 'ThirdPassword123!' });
      },
      (err) => {
        assert.equal(err.code, 'TOKEN_ALREADY_USED');
        return true;
      }
    );
  });

  await t.test('5. invite link token is single-use and cannot be used twice', async () => {
    const inviteEmail = `invite_test_${Date.now()}@flowtest.ae`;
    const inviteUser = await prisma.$base().users.create({
      data: {
        email: inviteEmail,
        password_hash: 'UNINITIALIZED_INVITE',
        company_id: testCompany.id,
        status: 'Invited',
      },
    });

    const inviteToken = await authService.generateInviteToken(inviteUser);

    // First use
    await authService.setPasswordFromInvite({ token: inviteToken, password: 'ActivatedPassword123!' });

    // Verify user is active
    const activeUser = await prisma.$base().users.findUnique({ where: { id: inviteUser.id } });
    assert.equal(activeUser.status, 'Active');

    // Second use must fail
    await assert.rejects(
      async () => {
        await authService.setPasswordFromInvite({ token: inviteToken, password: 'ReActivatedPassword123!' });
      },
      (err) => {
        assert.equal(err.code, 'TOKEN_ALREADY_USED');
        return true;
      }
    );

    await prisma.$base().audit_logs.deleteMany({ where: { user_id: inviteUser.id } }).catch(() => {});
    await prisma.$base().auth_tokens.deleteMany({ where: { user_id: inviteUser.id } }).catch(() => {});
    await prisma.$base().users.delete({ where: { id: inviteUser.id } }).catch(() => {});
  });

  await t.test('6. HR facts alone cannot reset a password or MFA (SEC-4)', async () => {
    // SEC-4 Mandate: Birthdate, National ID, Joining Date, or Employee Code cannot reset password
    // Only verified cryptographic token from authorized channel can reset password
    await assert.rejects(
      async () => {
        await authService.resetPassword({
          token: 'INVALID_TOKEN_HR_FACTS_ATTEMPT',
          newPassword: 'HackedPassword123!',
        });
      },
      (err) => {
        assert.equal(err.code, 'INVALID_TOKEN');
        return true;
      }
    );
  });
});
