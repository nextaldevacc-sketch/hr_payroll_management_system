import crypto from 'node:crypto';
import prisma from '../lib/prisma.js';
import auditService from './auditService.js';
import { getEncryptionKey } from '../lib/storage.js';
import { createQRCodeSvg } from '../lib/qrcode.js';
import { invalidateUserSession } from '../middleware/authCache.js';

export const PRIVILEGED_ROLES = ['HR_MANAGER', 'PAYROLL_OFFICER', 'GM', 'FINANCE', 'COMPANY_ADMIN'];

const RFC4648_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const MFA_HKDF_INFO = 'nextal-mfa-totp-encryption-key-v1';

/**
 * Encodes a buffer to RFC 4648 Base32 string (unpadded)
 */
export function base32Encode(buffer) {
  let bits = 0;
  let value = 0;
  let output = '';
  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;
    while (bits >= 5) {
      output += RFC4648_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += RFC4648_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

/**
 * Decodes an RFC 4648 Base32 string to Buffer
 */
export function base32Decode(str) {
  const clean = String(str).toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  let bits = 0;
  let value = 0;
  const out = [];
  for (let i = 0; i < clean.length; i++) {
    const idx = RFC4648_ALPHABET.indexOf(clean[i]);
    if (idx === -1) {
      const err = new Error(`Invalid Base32 character: ${clean[i]}`);
      err.code = 'INVALID_BASE32';
      throw err;
    }
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/**
 * Derives a 32-byte key specifically for MFA TOTP secrets using HKDF with info 'nextal-mfa-totp-encryption-key-v1'
 */
export function getMfaEncryptionKey() {
  const docKey = getEncryptionKey();
  const derived = crypto.hkdfSync('sha256', docKey, Buffer.alloc(0), MFA_HKDF_INFO, 32);
  return Buffer.from(derived);
}

/**
 * Encrypts a plaintext secret with AES-256-GCM
 * Returns format: ivHex:authTagHex:ciphertextHex
 */
export function encryptMfaSecret(plaintext) {
  const key = getMfaEncryptionKey();
  const iv = crypto.randomBytes(12); // 96-bit IV standard for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypts an AES-256-GCM encrypted secret
 */
export function decryptMfaSecret(payload) {
  if (!payload || typeof payload !== 'string') return null;
  const parts = payload.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid MFA ciphertext format');
  }
  const key = getMfaEncryptionKey();
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const ciphertext = Buffer.from(parts[2], 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}

/**
 * RFC 6238 TOTP calculation (HMAC-SHA1, 30s step, 6 digits)
 */
export function calculateTotp(secretBase32, timeSeconds = Math.floor(Date.now() / 1000), step = 30, digits = 6) {
  const secretBuf = base32Decode(secretBase32);
  const counter = Math.floor(timeSeconds / step);
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(BigInt(counter), 0);

  const hmac = crypto.createHmac('sha1', secretBuf).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = binary % 10 ** digits;
  return otp.toString().padStart(digits, '0');
}

/**
 * Verifies a TOTP code within +-1 step window (RFC 6238) and prevents replay
 */
export function verifyTotpToken(
  secretBase32,
  token,
  { window = 1, step = 30, lastUsedStep = null, nowSeconds = Math.floor(Date.now() / 1000) } = {}
) {
  const cleanToken = String(token).trim();
  if (!/^\d{6}$/.test(cleanToken)) {
    return { valid: false, reason: 'INVALID_FORMAT' };
  }

  const currentCounter = Math.floor(nowSeconds / step);

  for (let offset = -window; offset <= window; offset++) {
    const checkStep = currentCounter + offset;
    const expected = calculateTotp(secretBase32, checkStep * step, step, 6);
    if (crypto.timingSafeEqual(Buffer.from(cleanToken), Buffer.from(expected))) {
      // Replay prevention check
      if (lastUsedStep !== null && lastUsedStep !== undefined) {
        if (BigInt(checkStep) <= BigInt(lastUsedStep)) {
          return { valid: false, reason: 'CODE_REUSED', step: checkStep };
        }
      }
      return { valid: true, step: checkStep };
    }
  }

  return { valid: false, reason: 'INVALID_CODE' };
}

/**
 * Generates 10 single-use recovery codes
 */
export function generateRecoveryCodes(count = 10) {
  const plaintextCodes = [];
  const hashedCodes = [];

  for (let i = 0; i < count; i++) {
    const raw = crypto.randomBytes(5).toString('hex').toUpperCase(); // 10 hex characters
    const formatted = `${raw.slice(0, 5)}-${raw.slice(5)}`;
    const hash = crypto.createHash('sha256').update(formatted).digest('hex');
    plaintextCodes.push(formatted);
    hashedCodes.push(hash);
  }

  return { plaintextCodes, hashedCodes };
}

/**
 * Hashes a recovery code for comparison
 */
export function hashRecoveryCode(code) {
  const clean = String(code).trim().toUpperCase();
  return crypto.createHash('sha256').update(clean).digest('hex');
}

export class MfaService {
  constructor(client = prisma) {
    this.prisma = client;
  }

  /**
   * Evaluates whether MFA is enforced for a user given their roles and company policy
   */
  async checkMfaPolicyForUser(userId) {
    const user = await this.prisma.$base().users.findUnique({
      where: { id: userId },
      include: {
        company: true,
        user_roles: { include: { role: true } },
      },
    });

    if (!user) return { required: false, enabled: false };

    const roles = user.user_roles.map((ur) => ur.role.code);
    const isPrivileged = roles.some((r) => PRIVILEGED_ROLES.includes(r));
    const companyRequiresMfa = user.company?.require_privileged_mfa !== false;

    const mfaRequired = user.mfa_enabled || (isPrivileged && companyRequiresMfa);
    return {
      required: Boolean(mfaRequired),
      enrolRequired: Boolean(isPrivileged && companyRequiresMfa && !user.mfa_enabled),
      enabled: Boolean(user.mfa_enabled),
      roles,
      user,
    };
  }

  /**
   * Initializes enrolment: creates a random 20-byte base32 secret, stores encrypted temp secret, returns QR code SVG
   */
  async initEnrolment(userId) {
    const user = await this.prisma.$base().users.findUnique({
      where: { id: userId },
      select: { id: true, email: true, company_id: true, mfa_enabled: true },
    });

    if (!user) {
      const err = new Error('User not found');
      err.status = 404;
      throw err;
    }

    // Generate 20-byte random secret
    const rawBytes = crypto.randomBytes(20);
    const base32Secret = base32Encode(rawBytes);
    const encryptedSecret = encryptMfaSecret(base32Secret);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await this.prisma.$base().users.update({
      where: { id: user.id },
      data: {
        mfa_temp_secret: encryptedSecret,
        mfa_temp_secret_expires: expiresAt,
      },
    });

    const issuer = 'Nextal';
    const otpauthUri = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(
      user.email
    )}?secret=${base32Secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;

    const { dataUri } = createQRCodeSvg(otpauthUri, 'M');
    // Format manual key in 4-character chunks for human readability: XXXX XXXX ...
    const formattedManualKey = base32Secret.match(/.{1,4}/g)?.join(' ') || base32Secret;

    // NEVER return or log the encrypted payload or raw keys in logs
    return {
      qr_code: dataUri,
      secret: base32Secret,
      manual_key: formattedManualKey,
      expires_at: expiresAt,
    };
  }

  /**
   * Confirms enrolment with a valid 6-digit TOTP code, enables MFA, and generates 10 single-use recovery codes
   */
  async confirmEnrolment(userId, code, { ipAddress = null } = {}) {
    const user = await this.prisma.$base().users.findUnique({
      where: { id: userId },
    });

    if (!user || !user.mfa_temp_secret) {
      const err = new Error('No pending MFA enrolment found. Please initialize enrolment first.');
      err.status = 400;
      err.code = 'NO_PENDING_ENROLMENT';
      throw err;
    }

    if (user.mfa_temp_secret_expires && user.mfa_temp_secret_expires < new Date()) {
      const err = new Error('MFA enrolment session has expired. Please try again.');
      err.status = 400;
      err.code = 'ENROLMENT_EXPIRED';
      throw err;
    }

    const decryptedSecret = decryptMfaSecret(user.mfa_temp_secret);
    const verifyResult = verifyTotpToken(decryptedSecret, code);

    if (!verifyResult.valid) {
      const err = new Error('Invalid verification code. Please check your authenticator app and try again.');
      err.status = 400;
      err.code = 'INVALID_MFA_CODE';
      throw err;
    }

    // Generate 10 single-use recovery codes
    const { plaintextCodes, hashedCodes } = generateRecoveryCodes(10);

    await this.prisma.$base().users.update({
      where: { id: user.id },
      data: {
        mfa_enabled: true,
        mfa_secret: user.mfa_temp_secret,
        mfa_temp_secret: null,
        mfa_temp_secret_expires: null,
        mfa_recovery_codes: hashedCodes,
        mfa_last_used_step: BigInt(verifyResult.step),
        failed_logins: 0,
      },
    });

    if (user.company_id) {
      await auditService.log({
        companyId: user.company_id,
        userId: user.id,
        action: 'MFA_ENABLED',
        tableName: 'users',
        recordId: user.id,
        oldValues: { mfa_enabled: false },
        newValues: { mfa_enabled: true },
        ipAddress,
      });
    }

    return {
      status: 'success',
      message: 'MFA successfully enabled.',
      recovery_codes: plaintextCodes,
    };
  }

  /**
   * Verifies an MFA TOTP code or single-use recovery code during login.
   * Applies failed attempt tracking, lockout at 5 attempts, and single-use consumption.
   */
  async verifyCodeOrRecovery(userId, code, { ipAddress = null, nowSeconds = Math.floor(Date.now() / 1000) } = {}) {
    const user = await this.prisma.$base().users.findUnique({
      where: { id: userId },
      include: {
        company: true,
        user_roles: { include: { role: true } },
      },
    });

    if (!user) {
      const err = new Error('User not found');
      err.status = 404;
      throw err;
    }

    const now = new Date();

    // Check account lockout
    if (user.locked_until) {
      if (user.locked_until <= now) {
        await this.prisma.$base().users.update({
          where: { id: user.id },
          data: { locked_until: null, failed_logins: 0 },
        });
        user.locked_until = null;
        user.failed_logins = 0;
      } else {
        const remainingMinutes = Math.max(1, Math.ceil((user.locked_until.getTime() - now.getTime()) / 60000));
        const err = new Error(`Account is locked. Please try again in ${remainingMinutes} minute(s).`);
        err.status = 423;
        err.code = 'ACCOUNT_LOCKED';
        throw err;
      }
    }

    const cleanCode = String(code || '').trim();

    // Check if code is a 6-digit TOTP
    if (/^\d{6}$/.test(cleanCode) && user.mfa_secret) {
      const secret = decryptMfaSecret(user.mfa_secret);
      const result = verifyTotpToken(secret, cleanCode, {
        lastUsedStep: user.mfa_last_used_step,
        nowSeconds,
      });

      if (result.valid) {
        // Success via TOTP
        await this.prisma.$base().users.update({
          where: { id: user.id },
          data: {
            mfa_last_used_step: BigInt(result.step),
            failed_logins: 0,
            locked_until: null,
          },
        });

        if (user.company_id) {
          await auditService.log({
            companyId: user.company_id,
            userId: user.id,
            action: 'MFA_VERIFY_SUCCESS',
            tableName: 'users',
            recordId: user.id,
            ipAddress,
          });
        }

        return { success: true, method: 'totp', user };
      }

      if (result.reason === 'CODE_REUSED') {
        const err = new Error('Verification code has already been used. Please wait 30 seconds for the next code.');
        err.status = 400;
        err.code = 'CODE_REUSED';
        throw err;
      }
    }

    // Check if code is an emergency recovery code (case-insensitive hash match)
    const codeHash = hashRecoveryCode(cleanCode);
    const existingRecoveryCodes = Array.isArray(user.mfa_recovery_codes) ? user.mfa_recovery_codes : [];
    const recoveryIndex = existingRecoveryCodes.indexOf(codeHash);

    if (recoveryIndex !== -1) {
      // Single-use: consume this recovery code
      const updatedRecoveryCodes = existingRecoveryCodes.filter((_, idx) => idx !== recoveryIndex);

      await this.prisma.$base().users.update({
        where: { id: user.id },
        data: {
          mfa_recovery_codes: updatedRecoveryCodes,
          failed_logins: 0,
          locked_until: null,
        },
      });

      if (user.company_id) {
        await auditService.log({
          companyId: user.company_id,
          userId: user.id,
          action: 'MFA_RECOVERY_CODE_USED',
          tableName: 'users',
          recordId: user.id,
          newValues: { remaining_recovery_codes_count: updatedRecoveryCodes.length },
          ipAddress,
        });
      }

      return {
        success: true,
        method: 'recovery_code',
        remaining_recovery_codes: updatedRecoveryCodes.length,
        user,
      };
    }

    // Verification failed: increment failed_logins and apply lockout
    const newFailed = (user.failed_logins || 0) + 1;
    const willLock = newFailed >= LOCKOUT_THRESHOLD;
    const lockedUntil = willLock ? new Date(Date.now() + LOCKOUT_DURATION_MS) : null;

    await this.prisma.$base().users.update({
      where: { id: user.id },
      data: {
        failed_logins: newFailed,
        locked_until: lockedUntil,
        status: willLock ? 'Locked' : user.status,
      },
    });

    invalidateUserSession(user.id);

    if (user.company_id) {
      await auditService.log({
        companyId: user.company_id,
        userId: user.id,
        action: willLock ? 'LOCKOUT' : 'MFA_VERIFY_FAILED',
        tableName: 'users',
        recordId: user.id,
        newValues: { failed_logins: newFailed, locked_until: lockedUntil },
        ipAddress,
      });
    }

    if (willLock) {
      const err = new Error(
        `Account is locked due to ${LOCKOUT_THRESHOLD} consecutive failed attempts. Please try again in 15 minutes.`
      );
      err.status = 423;
      err.code = 'ACCOUNT_LOCKED';
      err.locked_until = lockedUntil;
      throw err;
    }

    const err = new Error('Invalid verification code or recovery code.');
    err.status = 401;
    err.code = 'INVALID_MFA_CODE';
    err.remainingAttempts = Math.max(0, LOCKOUT_THRESHOLD - newFailed);
    throw err;
  }

  /**
   * Reset another user's MFA by Company Admin.
   * A user CANNOT reset their own MFA without a valid code.
   * Invalidates active sessions by incrementing token_version.
   */
  async resetUserMfaByAdmin(adminUserId, targetUserId, { ipAddress = null } = {}) {
    if (adminUserId === targetUserId) {
      const err = new Error('Administrators cannot reset their own MFA. Please use a recovery code or contact another Company Admin.');
      err.status = 403;
      err.code = 'SELF_MFA_RESET_FORBIDDEN';
      throw err;
    }

    const targetUser = await this.prisma.$base().users.findUnique({
      where: { id: targetUserId },
      include: { user_roles: { include: { role: true } } },
    });

    if (!targetUser) {
      const err = new Error('Target user not found');
      err.status = 404;
      throw err;
    }

    // Reset MFA fields and bump token_version to invalidate active sessions
    const updated = await this.prisma.$base().users.update({
      where: { id: targetUserId },
      data: {
        mfa_enabled: false,
        mfa_secret: null,
        mfa_temp_secret: null,
        mfa_temp_secret_expires: null,
        mfa_recovery_codes: null,
        mfa_last_used_step: null,
        token_version: (targetUser.token_version || 1) + 1,
      },
    });

    // Invalidate auth cache immediately
    invalidateUserSession(targetUserId);

    // Audit log entry
    if (targetUser.company_id) {
      await auditService.log({
        companyId: targetUser.company_id,
        userId: adminUserId,
        action: 'MFA_RESET_BY_ADMIN',
        tableName: 'users',
        recordId: targetUserId,
        oldValues: { mfa_enabled: targetUser.mfa_enabled },
        newValues: { mfa_enabled: false, reset_by_admin: adminUserId },
        ipAddress,
      });
    }

    return {
      status: 'success',
      message: `MFA for user ${targetUser.email} has been reset. User will be prompted to re-enrol on next login.`,
    };
  }
}

export default new MfaService();
