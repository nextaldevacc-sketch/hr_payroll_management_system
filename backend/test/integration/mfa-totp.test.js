import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import prisma from '../../src/lib/prisma.js';
import authService from '../../src/services/authService.js';
import mfaService, {
  calculateTotp,
  decryptMfaSecret,
  encryptMfaSecret,
  getMfaEncryptionKey,
  verifyTotpToken,
  hashRecoveryCode,
} from '../../src/services/mfaService.js';
import { getEncryptionKey } from '../../src/lib/storage.js';

describe('Part 8 Item 1: TOTP MFA (SEC-2) for Privileged Roles', () => {
  let company;
  let adminUser;
  let hrManagerUser;
  let employeeUser;
  let hrOfficerUser;
  let originalPassword = 'Password#Nextal2026!';
  const runId = Date.now();
  const adminEmail = `admin-${runId}@mfatest.ae`;
  const hrEmail = `hrmgr-${runId}@mfatest.ae`;
  const hroEmail = `hro-${runId}@mfatest.ae`;
  const empEmail = `emp-${runId}@mfatest.ae`;

  before(async () => {
    // Create test company with require_privileged_mfa = true
    company = await prisma.$base().companies.create({
      data: {
        name: `MFA Security Test Corp ${runId}`,
        name_ar: 'شركة اختبار الأمان للمصادقة الثنائية',
        trade_license_no: `TL-MFA-${runId}`,
        require_privileged_mfa: true,
      },
    });

    const roleAdmin = await prisma.$base().roles.findUnique({ where: { code: 'COMPANY_ADMIN' } });
    const roleHrMgr = await prisma.$base().roles.findUnique({ where: { code: 'HR_MANAGER' } });
    const roleHrOff = await prisma.$base().roles.findUnique({ where: { code: 'HR_OFFICER' } });
    const roleEmp = await prisma.$base().roles.findUnique({ where: { code: 'EMPLOYEE' } });

    const passwordHash = await authService.hashPassword(originalPassword);

    // 1. Company Admin
    adminUser = await prisma.$base().users.create({
      data: {
        email: adminEmail,
        password_hash: passwordHash,
        company_id: company.id,
        status: 'Active',
      },
    });
    await prisma.$base().user_roles.create({
      data: { user_id: adminUser.id, role_id: roleAdmin.id, company_id: company.id },
    });

    // 2. HR Manager (Privileged)
    hrManagerUser = await prisma.$base().users.create({
      data: {
        email: hrEmail,
        password_hash: passwordHash,
        company_id: company.id,
        status: 'Active',
      },
    });
    await prisma.$base().user_roles.create({
      data: { user_id: hrManagerUser.id, role_id: roleHrMgr.id, company_id: company.id },
    });

    // 3. HR Officer (Privileged - STEP 4)
    hrOfficerUser = await prisma.$base().users.create({
      data: {
        email: hroEmail,
        password_hash: passwordHash,
        company_id: company.id,
        status: 'Active',
      },
    });
    await prisma.$base().user_roles.create({
      data: { user_id: hrOfficerUser.id, role_id: roleHrOff.id, company_id: company.id },
    });

    // 4. Normal Employee (Non-privileged)
    employeeUser = await prisma.$base().users.create({
      data: {
        email: empEmail,
        password_hash: passwordHash,
        company_id: company.id,
        status: 'Active',
      },
    });
    await prisma.$base().user_roles.create({
      data: { user_id: employeeUser.id, role_id: roleEmp.id, company_id: company.id },
    });
  });

  after(async () => {
    // Do not attempt to delete from append-only audit_logs
    try {
      await prisma.$base().user_roles.deleteMany({
        where: { user: { email: { in: [adminEmail, hrEmail, hroEmail, empEmail] } } },
      });
      await prisma.$base().users.deleteMany({
        where: { email: { in: [adminEmail, hrEmail, hroEmail, empEmail] } },
      });
      await prisma.$base().companies.deleteMany({ where: { id: company.id } });
    } catch {}
  });

  it('1. Cryptographic key derivation and AES-256-GCM secret encryption', () => {
    const docKey = getEncryptionKey();
    const mfaKey = getMfaEncryptionKey();

    assert.equal(mfaKey.length, 32, 'Derived MFA key must be 32 bytes (256 bits)');
    assert.notDeepEqual(mfaKey, docKey, 'MFA key must be derived via HKDF with distinct info, not identical to document key');

    const plaintextSecret = 'JBSWY3DPEHPK3PXP';
    const encrypted = encryptMfaSecret(plaintextSecret);
    assert.ok(encrypted.includes(':'), 'Encrypted secret must be in iv:authTag:ciphertext format');
    const parts = encrypted.split(':');
    assert.equal(parts.length, 3);
    assert.equal(parts[0].length, 24, 'IV must be 12 bytes (24 hex chars)');
    assert.equal(parts[1].length, 32, 'Auth tag must be 16 bytes (32 hex chars)');

    const decrypted = decryptMfaSecret(encrypted);
    assert.equal(decrypted, plaintextSecret, 'Decrypted secret must match plaintext');
  });

  it('2. Login policy: Privileged user requires MFA enrolment; Non-privileged logs in directly', async () => {
    // HR Manager is privileged -> returns mfa_required & mfa_enrol_required
    const hrLogin = await authService.login({ email: hrEmail, password: originalPassword });
    assert.equal(hrLogin.mfa_required, true);
    assert.equal(hrLogin.mfa_enrol_required, true);
    assert.ok(hrLogin.mfa_token, 'Must return temporary mfa_token for enrolment');

    // Normal Employee is not privileged -> logs in directly without MFA
    const empLogin = await authService.login({ email: empEmail, password: originalPassword });
    assert.ok(empLogin.token, 'Employee should receive full JWT session token');
    assert.equal(empLogin.mfa_required, undefined);
  });

  it('2b. STEP 4: HR_OFFICER is privileged and requires mandatory MFA enrolment, then succeeds with TOTP', async () => {
    // 1. HR Officer login without MFA returns mfa_required & mfa_enrolment_required
    const hroLogin = await authService.login({ email: hroEmail, password: originalPassword });
    assert.equal(hroLogin.mfa_required, true);
    assert.equal(hroLogin.mfa_enrol_required, true);
    assert.equal(hroLogin.mfa_enrolment_required, true);
    assert.ok(hroLogin.mfa_token, 'Must return temporary mfa_token for enrolment');

    // 2. Enrol TOTP for HR Officer
    const enrol = await mfaService.initEnrolment(hrOfficerUser.id);
    assert.ok(enrol.secret);
    const dbUser = await prisma.$base().users.findUnique({ where: { id: hrOfficerUser.id } });
    const secret = decryptMfaSecret(dbUser.mfa_temp_secret);
    const validCode = calculateTotp(secret);
    await mfaService.confirmEnrolment(hrOfficerUser.id, validCode);

    // 3. Login after enrolment requires TOTP code (enrolment no longer required)
    const afterEnrolLogin = await authService.login({ email: hroEmail, password: originalPassword });
    assert.equal(afterEnrolLogin.mfa_required, true);
    assert.equal(afterEnrolLogin.mfa_enrol_required, false);
    assert.equal(afterEnrolLogin.mfa_enrolment_required, false);

    // 4. Verify with valid TOTP code succeeds
    const nextStepTime = Math.floor(Date.now() / 1000) + 30;
    const verifySuccess = await mfaService.verifyCodeOrRecovery(hrOfficerUser.id, calculateTotp(secret, nextStepTime), {
      nowSeconds: nextStepTime,
    });
    assert.equal(verifySuccess.success, true);
    assert.equal(verifySuccess.method, 'totp');
  });

  it('3. Enrolment initialization: creates QR code and stores encrypted temp secret', async () => {
    const enrol = await mfaService.initEnrolment(hrManagerUser.id);
    assert.ok(enrol.qr_code.startsWith('data:image/svg+xml'), 'QR code must be SVG data URI');
    assert.ok(enrol.secret, 'Must provide Base32 secret');
    assert.ok(enrol.manual_key, 'Must provide formatted manual setup key');

    // Verify database stores encrypted secret, not plaintext
    const dbUser = await prisma.$base().users.findUnique({ where: { id: hrManagerUser.id } });
    assert.ok(dbUser.mfa_temp_secret, 'Temporary secret must be saved');
    assert.notEqual(dbUser.mfa_temp_secret, enrol.secret, 'Stored secret must NEVER be plaintext');
    assert.equal(decryptMfaSecret(dbUser.mfa_temp_secret), enrol.secret, 'Stored ciphertext must decrypt to enrol.secret');
  });

  it('4. Enrolment confirmation: wrong code fails; correct code activates MFA and issues 10 recovery codes', async () => {
    // Wrong code fails
    await assert.rejects(
      async () => {
        await mfaService.confirmEnrolment(hrManagerUser.id, '000000');
      },
      (err) => {
        assert.equal(err.code, 'INVALID_MFA_CODE');
        return true;
      }
    );

    // Fetch user temp secret to calculate current valid TOTP
    const dbUser = await prisma.$base().users.findUnique({ where: { id: hrManagerUser.id } });
    const secret = decryptMfaSecret(dbUser.mfa_temp_secret);
    const validCode = calculateTotp(secret);

    // Confirm with correct code
    const confirmResult = await mfaService.confirmEnrolment(hrManagerUser.id, validCode);
    assert.equal(confirmResult.status, 'success');
    assert.equal(confirmResult.recovery_codes.length, 10, 'Must issue exactly 10 recovery codes');

    // Verify DB state
    const updatedUser = await prisma.$base().users.findUnique({ where: { id: hrManagerUser.id } });
    assert.equal(updatedUser.mfa_enabled, true, 'User MFA must now be enabled');
    assert.equal(updatedUser.mfa_temp_secret, null, 'Temporary secret must be cleared');
    assert.ok(updatedUser.mfa_secret, 'Permanent mfa_secret must be set');
    assert.equal(Array.isArray(updatedUser.mfa_recovery_codes), true);
    assert.equal(updatedUser.mfa_recovery_codes.length, 10, 'Must store 10 hashed recovery codes in DB');

    // Verify recovery codes in DB are SHA-256 hashes, not plaintext
    const firstPlain = confirmResult.recovery_codes[0];
    assert.ok(!updatedUser.mfa_recovery_codes.includes(firstPlain), 'DB must not store plaintext recovery codes');
    assert.ok(updatedUser.mfa_recovery_codes.includes(hashRecoveryCode(firstPlain)), 'DB must store SHA-256 hashes of recovery codes');
  });

  it('5. Login flow with TOTP code: wrong code increments failed count; correct code logs in', async () => {
    // 1. Password step
    const loginResult = await authService.login({ email: hrEmail, password: originalPassword });
    assert.equal(loginResult.mfa_required, true);
    assert.equal(loginResult.mfa_enrol_required, false); // already enrolled!

    // 2. Wrong TOTP code
    await assert.rejects(
      async () => {
        await mfaService.verifyCodeOrRecovery(hrManagerUser.id, '999999');
      },
      (err) => {
        assert.equal(err.code, 'INVALID_MFA_CODE');
        return true;
      }
    );

    const userAfterFail = await prisma.$base().users.findUnique({ where: { id: hrManagerUser.id } });
    assert.equal(userAfterFail.failed_logins, 1, 'Failed logins counter must increment');

    // 3. Correct TOTP code (advance to next step to test legitimate sequential code)
    const secret = decryptMfaSecret(userAfterFail.mfa_secret);
    const nextStepTime = Math.floor(Date.now() / 1000) + 30;
    const validCode = calculateTotp(secret, nextStepTime);
    const verifySuccess = await mfaService.verifyCodeOrRecovery(hrManagerUser.id, validCode, {
      nowSeconds: nextStepTime,
    });
    assert.equal(verifySuccess.success, true);
    assert.equal(verifySuccess.method, 'totp');

    const userAfterSuccess = await prisma.$base().users.findUnique({ where: { id: hrManagerUser.id } });
    assert.equal(userAfterSuccess.failed_logins, 0, 'Failed logins counter must reset on success');
    assert.ok(userAfterSuccess.mfa_last_used_step !== null, 'Last used step must be recorded');
  });

  it('6. Replay prevention: reusing the exact same TOTP code is rejected', async () => {
    const dbUser = await prisma.$base().users.findUnique({ where: { id: hrManagerUser.id } });
    const secret = decryptMfaSecret(dbUser.mfa_secret);
    // Use the step recorded in previous test
    const stepTime = Number(dbUser.mfa_last_used_step) * 30;
    const reusedCode = calculateTotp(secret, stepTime);

    // Attempting to use the code again within the same time step
    await assert.rejects(
      async () => {
        await mfaService.verifyCodeOrRecovery(hrManagerUser.id, reusedCode, { nowSeconds: stepTime });
      },
      (err) => {
        assert.equal(err.code, 'CODE_REUSED');
        return true;
      }
    );
  });

  it('7. Single-use recovery codes: code burns after first use and cannot be used again', async () => {
    // Get stored user recovery codes
    const dbUser = await prisma.$base().users.findUnique({ where: { id: hrManagerUser.id } });
    assert.equal(dbUser.mfa_recovery_codes.length, 10);

    // Generate a fresh known recovery code and set on user for testing
    const testRecoveryCode = 'TEST1-RECOV';
    const testHash = hashRecoveryCode(testRecoveryCode);
    await prisma.$base().users.update({
      where: { id: hrManagerUser.id },
      data: { mfa_recovery_codes: [...dbUser.mfa_recovery_codes, testHash] },
    });

    // Use recovery code
    const use1 = await mfaService.verifyCodeOrRecovery(hrManagerUser.id, testRecoveryCode);
    assert.equal(use1.success, true);
    assert.equal(use1.method, 'recovery_code');

    // Verify recovery code was removed from DB
    const userAfterBurn = await prisma.$base().users.findUnique({ where: { id: hrManagerUser.id } });
    assert.ok(!userAfterBurn.mfa_recovery_codes.includes(testHash), 'Used recovery code must be deleted from DB');

    // Attempting to reuse the exact same recovery code fails
    await assert.rejects(
      async () => {
        await mfaService.verifyCodeOrRecovery(hrManagerUser.id, testRecoveryCode);
      },
      (err) => {
        assert.equal(err.code, 'INVALID_MFA_CODE');
        return true;
      }
    );
  });

  it('8. Admin MFA reset: Admin cannot reset own MFA; Admin resets other user with audit log and session invalidation', async () => {
    // Admin cannot reset own MFA
    await assert.rejects(
      async () => {
        await mfaService.resetUserMfaByAdmin(adminUser.id, adminUser.id);
      },
      (err) => {
        assert.equal(err.code, 'SELF_MFA_RESET_FORBIDDEN');
        return true;
      }
    );

    const userBeforeReset = await prisma.$base().users.findUnique({ where: { id: hrManagerUser.id } });
    const initialTokenVersion = userBeforeReset.token_version;

    // Admin resets HR Manager's MFA
    const resetResult = await mfaService.resetUserMfaByAdmin(adminUser.id, hrManagerUser.id, { ipAddress: '127.0.0.1' });
    assert.equal(resetResult.status, 'success');

    // Verify target user fields reset and token_version incremented (invalidating sessions)
    const userAfterReset = await prisma.$base().users.findUnique({ where: { id: hrManagerUser.id } });
    assert.equal(userAfterReset.mfa_enabled, false);
    assert.equal(userAfterReset.mfa_secret, null);
    assert.equal(userAfterReset.mfa_recovery_codes, null);
    assert.equal(userAfterReset.token_version, initialTokenVersion + 1, 'Token version must bump to invalidate sessions');

    // Verify audit log entry
    const auditEntry = await prisma.$base().audit_logs.findFirst({
      where: {
        company_id: company.id,
        action: 'MFA_RESET_BY_ADMIN',
        record_id: hrManagerUser.id,
      },
      orderBy: { created_at: 'desc' },
    });
    assert.ok(auditEntry, 'Must create an audit log entry for MFA_RESET_BY_ADMIN');
    assert.equal(auditEntry.user_id, adminUser.id, 'Audit log must record the performing admin user ID');
  });
});
