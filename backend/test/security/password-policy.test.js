import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
if (process.env.DATABASE_URL_TEST) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
}

import prisma from '../../src/lib/prisma.js';
import authService from '../../src/services/authService.js';
import userService from '../../src/services/userService.js';
import {
  validatePassword,
  assertPasswordCompliant,
  COMMON_PASSWORDS,
} from '@nextal/shared';

test('Security Audit SEC-M6: Password Complexity & Policy Enforcement', async (t) => {
  await t.test('1. Rejects passwords shorter than 10 characters', () => {
    const res = validatePassword('Short1!');
    assert.equal(res.valid, false);
    assert(res.errors.some((e) => e.includes('10 characters')));

    assert.throws(
      () => assertPasswordCompliant('A1!b2@c3'),
      (err) => err.status === 400 && err.code === 'WEAK_PASSWORD'
    );
  });

  await t.test('2. Rejects passwords missing uppercase letters', () => {
    const res = validatePassword('nouppercase123!');
    assert.equal(res.valid, false);
    assert(res.errors.some((e) => e.includes('uppercase')));

    assert.throws(
      () => assertPasswordCompliant('nouppercase123!'),
      (err) => err.status === 400 && err.code === 'WEAK_PASSWORD'
    );
  });

  await t.test('3. Rejects passwords missing lowercase letters', () => {
    const res = validatePassword('NOLOWERCASE123!');
    assert.equal(res.valid, false);
    assert(res.errors.some((e) => e.includes('lowercase')));

    assert.throws(
      () => assertPasswordCompliant('NOLOWERCASE123!'),
      (err) => err.status === 400 && err.code === 'WEAK_PASSWORD'
    );
  });

  await t.test('4. Rejects passwords missing numeric digits', () => {
    const res = validatePassword('NoNumbersHere!@#');
    assert.equal(res.valid, false);
    assert(res.errors.some((e) => e.includes('number')));

    assert.throws(
      () => assertPasswordCompliant('NoNumbersHere!@#'),
      (err) => err.status === 400 && err.code === 'WEAK_PASSWORD'
    );
  });

  await t.test('5. Rejects passwords missing special characters', () => {
    const res = validatePassword('NoSpecialChar123');
    assert.equal(res.valid, false);
    assert(res.errors.some((e) => e.includes('special character')));

    assert.throws(
      () => assertPasswordCompliant('NoSpecialChar123'),
      (err) => err.status === 400 && err.code === 'WEAK_PASSWORD'
    );
  });

  await t.test('6. Rejects passwords containing user email username', () => {
    const res1 = validatePassword('ImranSecret#2026', { email: 'imran@gulftech.ae' });
    assert.equal(res1.valid, false);
    assert(res1.errors.some((e) => e.includes('email username')));

    // Case-insensitive
    const res2 = validatePassword('CompanyIMRAN2026!', { email: 'imran.khalid@company.ae' });
    assert.equal(res2.valid, false);
    assert(res2.errors.some((e) => e.includes('email username')));

    assert.throws(
      () => assertPasswordCompliant('Mohamed12345!', { email: 'mohamed@nextal.ae' }),
      (err) => err.status === 400 && err.code === 'WEAK_PASSWORD'
    );
  });

  await t.test('7. Rejects passwords containing user name parts', () => {
    const res1 = validatePassword('NuaimiCorp#2026', { name: 'Sarah Al-Nuaimi' });
    assert.equal(res1.valid, false);
    assert(res1.errors.some((e) => e.includes('name')));

    const res2 = validatePassword('WelcomeTariq@2026', { firstName: 'Tariq', lastName: 'Mansoor' });
    assert.equal(res2.valid, false);
    assert(res2.errors.some((e) => e.includes('name')));

    assert.throws(
      () => assertPasswordCompliant('FatimaSecure!2026', { name: 'Fatima Zahra' }),
      (err) => err.status === 400 && err.code === 'WEAK_PASSWORD'
    );
  });

  await t.test('8. Rejects common passwords from the 20-word common list', () => {
    assert(COMMON_PASSWORDS.length >= 20, 'Common passwords list must contain at least 20 words');

    for (const common of ['Password123!', 'admin123!', 'welcome123!', 'p@ssword123', 'changeme123!']) {
      const res = validatePassword(common);
      assert.equal(res.valid, false, `Expected common password "${common}" to be rejected`);
      assert(res.errors.some((e) => e.includes('common')));

      assert.throws(
        () => assertPasswordCompliant(common),
        (err) => err.status === 400 && err.code === 'WEAK_PASSWORD'
      );
    }
  });

  await t.test('9. Compliant passwords pass validation cleanly', () => {
    const goodPasswords = [
      'Str0ng#Pass2026',
      'Nextal@2026!',
      'UaeEnterprise#9921',
      'Secure^K92!Corp',
    ];

    for (const pwd of goodPasswords) {
      const res = validatePassword(pwd, { email: 'john@example.com', name: 'Zayed Al Nahyan' });
      assert.equal(res.valid, true, `Expected "${pwd}" to be valid, got errors: ${res.errors.join(', ')}`);
      assert.equal(res.errors.length, 0);
      assert.equal(assertPasswordCompliant(pwd), true);
    }
  });

  await t.test('10. authService.changePassword enforces complexity and rejects weak/context-leaking passwords', async () => {
    // Find or create a test user
    const user = await prisma.$base().users.findFirst({
      where: { email: 'employee@gulftech.ae' },
    });

    if (user) {
      // 1. Weak password (no number or special)
      await assert.rejects(
        async () => {
          await authService.changePassword({
            userId: user.id,
            newPassword: 'OnlyLettersNoNumbers',
          });
        },
        (err) => err.status === 400 && err.code === 'WEAK_PASSWORD'
      );

      // 2. Contains email username ("employee")
      await assert.rejects(
        async () => {
          await authService.changePassword({
            userId: user.id,
            newPassword: 'Employee#2026!',
          });
        },
        (err) => err.status === 400 && err.code === 'WEAK_PASSWORD'
      );

      // 3. Common password
      await assert.rejects(
        async () => {
          await authService.changePassword({
            userId: user.id,
            newPassword: 'Password123!',
          });
        },
        (err) => err.status === 400 && err.code === 'WEAK_PASSWORD'
      );
    }
  });

  await t.test('11. authService.resetPassword enforces complexity policy', async () => {
    const user = await prisma.$base().users.findFirst({
      where: { email: 'employee@gulftech.ae' },
    });

    if (user) {
      // Generate a reset token
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 3600 * 1000);

      await prisma.$base().auth_tokens.create({
        data: {
          user_id: user.id,
          token_hash: tokenHash,
          purpose: 'reset_password',
          expires_at: expiresAt,
        },
      });

      // Attempt reset with weak password
      await assert.rejects(
        async () => {
          await authService.resetPassword({
            token: rawToken,
            newPassword: 'weak',
          });
        },
        (err) => err.status === 400 && err.code === 'WEAK_PASSWORD'
      );

      // Attempt reset with common password
      await assert.rejects(
        async () => {
          await authService.resetPassword({
            token: rawToken,
            newPassword: 'Password123!',
          });
        },
        (err) => err.status === 400 && err.code === 'WEAK_PASSWORD'
      );
    }
  });

  await t.test('12. authService.setPasswordFromInvite enforces complexity policy', async () => {
    const user = await prisma.$base().users.findFirst({
      where: { email: 'employee@gulftech.ae' },
    });

    if (user) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 3600 * 1000);

      await prisma.$base().auth_tokens.create({
        data: {
          user_id: user.id,
          token_hash: tokenHash,
          purpose: 'invite',
          expires_at: expiresAt,
        },
      });

      // Attempt invite set password with weak password
      await assert.rejects(
        async () => {
          await authService.setPasswordFromInvite({
            token: rawToken,
            password: 'Short1!',
          });
        },
        (err) => err.status === 400 && err.code === 'WEAK_PASSWORD'
      );
    }
  });
});
