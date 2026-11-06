import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import auditService from './auditService.js';
import mailer from '../lib/mailer.js';
import { invalidateUserSession } from '../middleware/authCache.js';
import { SALARY_ROLES, hasSalaryAccess } from '../serializers/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'nextal_super_secret_jwt_key_2026_uae';
const SESSION_DURATION = '8h';
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;
const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export class AuthService {
  constructor(client = prisma) {
    this.prisma = client;
  }

  async hashPassword(password) {
    return await bcrypt.hash(password, 10);
  }

  async verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Log in a user with email and password
   */
  async login({ email, password, ipAddress = null }) {
    if (!email || !password) {
      const err = new Error('Email and password are required');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    const cleanEmail = email.trim().toLowerCase();

    // Query user without company tenant isolation restriction (auth is tenant-resolved)
    const user = await this.prisma.$base().users.findUnique({
      where: { email: cleanEmail },
      include: {
        company: {
          include: {
            company_visas: {
              select: {
                id: true,
                name: true,
                mol_establishment_id: true,
                emirate: true,
                bank_routing_code: true,
              },
              orderBy: { name: 'asc' },
            },
          },
        },
        user_roles: {
          include: {
            role: true,
          },
        },
        employee: {
          select: {
            id: true,
            employee_code: true,
            name: true,
            arabic_name: true,
            work_email: true,
          },
        },
      },
    });

    if (!user) {
      const err = new Error('Invalid email or password');
      err.status = 401;
      err.code = 'INVALID_CREDENTIALS';
      throw err;
    }

    const now = new Date();

    // 1. Check if account is locked
    if (user.locked_until) {
      // Check if lockout has auto-expired (15 minutes elapsed)
      if (user.locked_until <= now) {
        // Auto-expire lock: reset failed logins and clear locked_until
        await this.prisma.$base().users.update({
          where: { id: user.id },
          data: {
            locked_until: null,
            failed_logins: 0,
            status: user.status === 'Locked' ? 'Active' : user.status,
          },
        });
        user.locked_until = null;
        user.failed_logins = 0;
        if (user.status === 'Locked') user.status = 'Active';
        invalidateUserSession(user.id);
      } else {
        const remainingMs = user.locked_until.getTime() - now.getTime();
        const remainingMinutes = Math.max(1, Math.ceil(remainingMs / 60000));
        const err = new Error(
          `Account is locked due to ${LOCKOUT_THRESHOLD} consecutive failed login attempts. Please try again in ${remainingMinutes} minute(s).`
        );
        err.status = 423; // Locked
        err.code = 'ACCOUNT_LOCKED';
        err.locked_until = user.locked_until;
        throw err;
      }
    }

    // 2. Verify password
    const isPasswordValid = await this.verifyPassword(password, user.password_hash);

    if (!isPasswordValid) {
      const newFailedAttempts = (user.failed_logins || 0) + 1;
      const willLock = newFailedAttempts >= LOCKOUT_THRESHOLD;
      const lockedUntil = willLock ? new Date(Date.now() + LOCKOUT_DURATION_MS) : null;
      const newStatus = willLock ? 'Locked' : user.status;

      await this.prisma.$base().users.update({
        where: { id: user.id },
        data: {
          failed_logins: newFailedAttempts,
          locked_until: lockedUntil,
          status: newStatus,
        },
      });

      invalidateUserSession(user.id);

      if (user.company_id) {
        await auditService.log({
          companyId: user.company_id,
          userId: user.id,
          action: willLock ? 'LOCKOUT' : 'LOGIN_FAILED',
          tableName: 'users',
          recordId: user.id,
          oldValues: { failed_logins: user.failed_logins, status: user.status },
          newValues: { failed_logins: newFailedAttempts, locked_until: lockedUntil, status: newStatus },
          ipAddress,
        });
      }

      if (willLock) {
        const err = new Error(
          `Account is locked due to ${LOCKOUT_THRESHOLD} consecutive failed login attempts. Please try again in 15 minutes.`
        );
        err.status = 423;
        err.code = 'ACCOUNT_LOCKED';
        err.locked_until = lockedUntil;
        throw err;
      }

      const err = new Error('Invalid email or password');
      err.status = 401;
      err.code = 'INVALID_CREDENTIALS';
      err.remainingAttempts = Math.max(0, LOCKOUT_THRESHOLD - newFailedAttempts);
      throw err;
    }

    // 3. Password is valid: check platform admin feature flag (Phase 2)
    if (user.is_platform_admin && process.env.FEATURE_PLATFORM_ADMIN !== 'true') {
      const err = new Error('Not available in this release');
      err.status = 403;
      err.code = 'FEATURE_DISABLED';
      throw err;
    }

    // 4. Check company status (FR-PL2: suspended companies cannot log in)
    if (user.company && user.company.status === 'Suspended') {
      const err = new Error('Your company account is currently suspended. Please contact Nextal platform support.');
      err.status = 403;
      err.code = 'COMPANY_SUSPENDED';
      throw err;
    }

    // 4. Check user status & employee archive status (T36)
    if (user.employee && user.employee.status === 'Archived') {
      const err = new Error('Your employee account has been archived following final settlement. Login refused.');
      err.status = 403;
      err.code = 'ACCOUNT_ARCHIVED';
      throw err;
    }

    if (['Disabled', 'Archived', 'Deactivated'].includes(user.status)) {
      const err = new Error('Your user account has been disabled. Please contact your company administrator.');
      err.status = 403;
      err.code = 'ACCOUNT_DISABLED';
      throw err;
    }

    // Successful login: reset failed attempts, clear locked_until, activate if previously locked, update last_login_at
    const updatedUser = await this.prisma.$base().users.update({
      where: { id: user.id },
      data: {
        failed_logins: 0,
        locked_until: null,
        status: user.status === 'Locked' ? 'Active' : user.status,
        last_login_at: now,
      },
    });

    invalidateUserSession(user.id);

    // Determine roles & permissions
    const roles = user.user_roles.map((ur) => ur.role.code);
    if (user.is_platform_admin && !roles.includes('PLATFORM_ADMIN')) {
      roles.push('PLATFORM_ADMIN');
    }

    const scopes = user.user_roles.map((ur) => ({
      role: ur.role.code,
      scope_type: ur.scope_type,
      scope_id: ur.scope_id,
    }));

    // Section 5: Salary figures visible ONLY to Payroll Officer, HR Manager, GM, Finance.
    // Company Admin does NOT see salary unless they also hold one of those 4 roles!
    const seesSalary = user.user_roles.some((ur) => SALARY_ROLES.includes(ur.role.code));

    // Generate JWT (8 hours) with token_version for immediate revocation
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      companyId: user.company_id,
      isPlatformAdmin: user.is_platform_admin,
      employeeId: user.employee_id,
      roles,
      scopes,
      seesSalary,
      tokenVersion: user.token_version || 1,
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, {
      expiresIn: SESSION_DURATION,
    });

    if (user.company_id) {
      await auditService.log({
        companyId: user.company_id,
        userId: user.id,
        action: 'LOGIN',
        tableName: 'users',
        recordId: user.id,
        newValues: { last_login_at: now, ip: ipAddress },
        ipAddress,
      });
    }

    return {
      token,
      sessionDurationMs: SESSION_DURATION_MS,
      user: {
        id: user.id,
        email: user.email,
        name: user.employee?.name || user.email.split('@')[0],
        arabic_name: user.employee?.arabic_name || null,
        company_id: user.company_id,
        company_name: user.company?.name || 'Nextal Platform',
        company_name_ar: user.company?.name_ar || null,
        company_status: user.company?.status || 'Active',
        visas: user.company?.company_visas || [],
        is_platform_admin: user.is_platform_admin,
        status: updatedUser.status,
        employee_id: user.employee_id,
        employee: user.employee,
        roles,
        role: roles[0] || null,
        scopes,
        sees_salary: seesSalary,
        last_login_at: updatedUser.last_login_at,
      },
    };
  }

  /**
   * Log out a user and immediately invalidate existing JWT tokens by bumping token_version
   */
  async logout(userId) {
    if (!userId) return;
    try {
      await this.prisma.$base().users.update({
        where: { id: userId },
        data: {
          token_version: { increment: 1 },
        },
      });
      invalidateUserSession(userId);
    } catch (e) {
      // User may not exist or error during logout
    }
  }

  /**
   * Verify JWT Token and decode payload
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (err) {
      const error = new Error('Invalid or expired authentication session');
      error.status = 401;
      error.code = 'UNAUTHORIZED';
      throw error;
    }
  }

  /**
   * Create an invitation token: random 32-byte hex, stored hashed (sha256), expiring in 72 hours
   */
  async generateInviteToken(user) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours

    await this.prisma.$base().auth_tokens.create({
      data: {
        user_id: user.id,
        token_hash: tokenHash,
        purpose: 'invite',
        expires_at: expiresAt,
      },
    });

    const inviteUrl = `http://localhost:3100/accept-invite?token=${rawToken}`;
    await mailer.sendMail({
      to: user.email,
      subject: '[Nextal HR] Welcome! Set your account password',
      html: `<p>Welcome to Nextal HR. Please click the link below to set your account password:</p><p><a href="${inviteUrl}">${inviteUrl}</a></p>`,
      text: `Welcome to Nextal HR. Please visit the link below to set your account password:\n${inviteUrl}`,
    }).catch((err) => console.warn('[AuthService] Failed to send invite email:', err.message));

    return rawToken;
  }

  /**
   * Set password using an invitation link token
   */
  async setPasswordFromInvite({ token, password }) {
    if (!token || !password) {
      const err = new Error('Token and password are required');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    if (password.length < 10 || !/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
      const err = new Error('Password must be at least 10 characters and contain letters and numbers');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const authToken = await this.prisma.$base().auth_tokens.findUnique({
      where: { token_hash: tokenHash },
      include: { user: true },
    });

    if (!authToken || authToken.purpose !== 'invite') {
      const err = new Error('Invitation link has expired or is invalid');
      err.status = 400;
      err.code = 'INVALID_TOKEN';
      throw err;
    }

    if (authToken.used_at) {
      const err = new Error('This invitation token has already been used');
      err.status = 400;
      err.code = 'TOKEN_ALREADY_USED';
      throw err;
    }

    if (authToken.expires_at < new Date()) {
      const err = new Error('Invitation link has expired');
      err.status = 400;
      err.code = 'TOKEN_EXPIRED';
      throw err;
    }

    // Mark token used (single-use)
    await this.prisma.$base().auth_tokens.update({
      where: { id: authToken.id },
      data: { used_at: new Date() },
    });

    const passwordHash = await this.hashPassword(password);
    const updatedUser = await this.prisma.$base().users.update({
      where: { id: authToken.user_id },
      data: {
        password_hash: passwordHash,
        status: 'Active',
        failed_logins: 0,
        locked_until: null,
        token_version: { increment: 1 },
      },
    });

    invalidateUserSession(updatedUser.id);

    if (updatedUser.company_id) {
      await auditService.log({
        companyId: updatedUser.company_id,
        userId: updatedUser.id,
        action: 'SET_PASSWORD_INVITE',
        tableName: 'users',
        recordId: updatedUser.id,
        newValues: { status: 'Active' },
      });
    }

    return {
      status: 'success',
      message: 'Password set successfully. You can now log in.',
      userId: updatedUser.id,
      email: updatedUser.email,
    };
  }

  /**
   * Generate password reset token: random 32-byte hex, stored hashed (sha256), expiring in 1 hour
   */
  async generateResetToken(email) {
    const cleanEmail = email.trim().toLowerCase();
    const user = await this.prisma.$base().users.findUnique({
      where: { email: cleanEmail },
    });

    if (!user) {
      // Do not reveal email existence to prevent user enumeration
      return {
        status: 'success',
        message: 'If the email is registered, a password reset link has been dispatched.',
      };
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.$base().auth_tokens.create({
      data: {
        user_id: user.id,
        token_hash: tokenHash,
        purpose: 'reset_password',
        expires_at: expiresAt,
      },
    });

    const resetUrl = `http://localhost:3100/reset-password?token=${rawToken}`;
    await mailer.sendMail({
      to: cleanEmail,
      subject: '[Nextal HR] Password Reset Request',
      html: `<p>A password reset was requested for your Nextal HR account. Click the link below to set a new password:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>This link expires in 1 hour.</p>`,
      text: `A password reset was requested for your Nextal HR account. Visit the link below to set a new password:\n${resetUrl}\n\nThis link expires in 1 hour.`,
    }).catch((err) => console.warn('[AuthService] Failed to send reset email:', err.message));

    return {
      status: 'success',
      message: 'If the email is registered, a password reset link has been dispatched.',
      resetToken: rawToken, // Returned for UI testing / demo convenience
      resetUrl,
    };
  }

  /**
   * Reset password with single-use, expiring reset token
   */
  async resetPassword({ token, newPassword }) {
    if (!token || !newPassword) {
      const err = new Error('Reset token and new password are required');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    if (newPassword.length < 10 || !/[a-zA-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
      const err = new Error('Password must be at least 10 characters and contain letters and numbers');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const authToken = await this.prisma.$base().auth_tokens.findUnique({
      where: { token_hash: tokenHash },
      include: { user: true },
    });

    if (!authToken || authToken.purpose !== 'reset_password') {
      const err = new Error('Password reset link has expired or is invalid');
      err.status = 400;
      err.code = 'INVALID_TOKEN';
      throw err;
    }

    if (authToken.used_at) {
      const err = new Error('This password reset link has already been used');
      err.status = 400;
      err.code = 'TOKEN_ALREADY_USED';
      throw err;
    }

    if (authToken.expires_at < new Date()) {
      const err = new Error('Password reset link has expired');
      err.status = 400;
      err.code = 'TOKEN_EXPIRED';
      throw err;
    }

    // Mark token used (single-use)
    await this.prisma.$base().auth_tokens.update({
      where: { id: authToken.id },
      data: { used_at: new Date() },
    });

    const passwordHash = await this.hashPassword(newPassword);
    const updatedUser = await this.prisma.$base().users.update({
      where: { id: authToken.user_id },
      data: {
        password_hash: passwordHash,
        failed_logins: 0,
        locked_until: null,
        status: 'Active',
        token_version: { increment: 1 },
      },
    });

    invalidateUserSession(updatedUser.id);

    if (updatedUser.company_id) {
      await auditService.log({
        companyId: updatedUser.company_id,
        userId: updatedUser.id,
        action: 'RESET_PASSWORD',
        tableName: 'users',
        recordId: updatedUser.id,
        newValues: { status: 'Active' },
      });
    }

    return {
      status: 'success',
      message: 'Password reset successfully. You can now log in with your new credentials.',
    };
  }
}

export const authService = new AuthService();
export default authService;
