import jwt from 'jsonwebtoken';
import authService from '../services/authService.js';
import mfaService from '../services/mfaService.js';

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || null;

    const result = await authService.login({ email, password, ipAddress });

    // If MFA is required for this user, do not issue session cookie yet
    if (result.mfa_required) {
      return res.json({
        status: 'mfa_required',
        mfa_required: true,
        mfa_enrol_required: Boolean(result.mfa_enrol_required),
        mfa_token: result.mfa_token,
        user: result.user,
      });
    }

    // Set httpOnly cookie with 8-hour expiry (secure only over HTTPS or when COOKIE_SECURE=true)
    const isSecure = process.env.COOKIE_SECURE === 'true' || Boolean(req.secure);
    res.cookie('nextal_token', result.token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: result.sessionDurationMs,
    });

    res.json({
      status: 'success',
      message: 'Login successful',
      token: result.token,
      user: result.user,
    });
  } catch (err) {
    next(err);
  }
}

export async function logout(req, res, next) {
  try {
    const token =
      req.cookies?.nextal_token ||
      (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7).trim() : null);

    if (token) {
      try {
        const decoded = authService.verifyToken(token);
        if (decoded?.userId) {
          await authService.logout(decoded.userId);
        }
      } catch (err) {
        // Token might already be expired or invalid, continue clearing cookie
      }
    }

    const isSecure = process.env.COOKIE_SECURE === 'true' || Boolean(req.secure);
    res.clearCookie('nextal_token', {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
    });

    res.json({
      status: 'success',
      message: 'Logged out successfully',
    });
  } catch (err) {
    next(err);
  }
}

export async function getCurrentUser(req, res, next) {
  try {
    if (!req.user) {
      return res.json({
        status: 'success',
        user: null,
      });
    }
    const user = await authService.prisma.$base().users.findUnique({
      where: { id: req.user.userId },
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
          include: { role: true },
        },
        employee: {
          select: {
            id: true,
            employee_code: true,
            name: true,
            arabic_name: true,
            work_email: true,
            company_visa_id: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        status: 'error',
        code: 'USER_NOT_FOUND',
        message: 'User account not found',
      });
    }

    const roles = user.user_roles.map((ur) => ur.role.code);
    if (user.is_platform_admin && !roles.includes('PLATFORM_ADMIN')) {
      roles.push('PLATFORM_ADMIN');
    }

    if (roles.length === 0 && !user.is_platform_admin) {
      console.warn(`[AUTH] User without role fetched session: ${user.email} (userId: ${user.id})`);
    }

    const SALARY_ROLES = ['HR_MANAGER', 'PAYROLL_OFFICER', 'GM', 'FINANCE'];
    const seesSalary = user.user_roles.some((ur) => SALARY_ROLES.includes(ur.role.code));

    res.json({
      status: 'success',
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
        status: user.status,
        must_change_password: user.must_change_password ?? false,
        employee_id: user.employee_id,
        employee: user.employee,
        roles,
        role: roles[0] || null,
        scopes: user.user_roles.map((ur) => ({
          role: ur.role.code,
          scope_type: ur.scope_type,
          scope_id: ur.scope_id,
        })),
        sees_salary: seesSalary,
        last_login_at: user.last_login_at,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        status: 'error',
        code: 'VALIDATION_ERROR',
        message: 'Email address is required',
      });
    }

    const result = await authService.generateResetToken(email);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const { token, new_password } = req.body;
    const result = await authService.resetPassword({
      token,
      newPassword: new_password,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function setPasswordFromInvite(req, res, next) {
  try {
    const { token, password } = req.body;
    const result = await authService.setPasswordFromInvite({
      token,
      password,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function changePassword(req, res, next) {
  try {
    const userId = req.user.userId || req.user.id;
    const { current_password, new_password } = req.body;
    const result = await authService.changePassword({
      userId,
      currentPassword: current_password,
      newPassword: new_password,
    });

    const isSecure = process.env.COOKIE_SECURE === 'true' || Boolean(req.secure);
    res.cookie('nextal_token', result.token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}

function resolveMfaUserId(req) {
  if (req.user?.userId) {
    return req.user.userId;
  }
  const mfaToken =
    req.body?.mfa_token ||
    (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7).trim() : null);
  if (mfaToken) {
    try {
      const decoded = jwt.verify(
        mfaToken,
        process.env.JWT_SECRET
      );
      if (decoded.userId) return decoded.userId;
    } catch (err) {
      const e = new Error('Invalid or expired MFA session. Please log in again.');
      e.status = 401;
      e.code = 'INVALID_MFA_TOKEN';
      throw e;
    }
  }
  const err = new Error('Authentication or MFA token required.');
  err.status = 401;
  err.code = 'UNAUTHORIZED';
  throw err;
}

export async function mfaEnrolInit(req, res, next) {
  try {
    const userId = resolveMfaUserId(req);
    const data = await mfaService.initEnrolment(userId);
    res.json({
      status: 'success',
      data,
    });
  } catch (err) {
    next(err);
  }
}

export async function mfaEnrolConfirm(req, res, next) {
  try {
    const userId = resolveMfaUserId(req);
    const { code, mfa_token } = req.body;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || null;

    const result = await mfaService.confirmEnrolment(userId, code, { ipAddress });

    let session = null;
    if (mfa_token || !req.user) {
      session = await authService.generateSessionForUser(userId, { ipAddress });
      const isSecure = process.env.COOKIE_SECURE === 'true' || Boolean(req.secure);
      res.cookie('nextal_token', session.token, {
        httpOnly: true,
        secure: isSecure,
        sameSite: 'lax',
        maxAge: session.sessionDurationMs,
      });
    }

    res.json({
      status: 'success',
      message: result.message,
      recovery_codes: result.recovery_codes,
      token: session ? session.token : undefined,
      user: session ? session.user : undefined,
    });
  } catch (err) {
    next(err);
  }
}

export async function mfaVerify(req, res, next) {
  try {
    const { mfa_token, code } = req.body;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || null;

    if (!mfa_token || !code) {
      const err = new Error('MFA token and verification code are required.');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    let decoded;
    try {
      decoded = jwt.verify(
        mfa_token,
        process.env.JWT_SECRET
      );
    } catch (e) {
      const err = new Error('MFA session expired or invalid. Please log in again.');
      err.status = 401;
      err.code = 'INVALID_MFA_TOKEN';
      throw err;
    }

    const verifyResult = await mfaService.verifyCodeOrRecovery(decoded.userId, code, { ipAddress });
    const session = await authService.generateSessionForUser(decoded.userId, { ipAddress });

    const isSecure = process.env.COOKIE_SECURE === 'true' || Boolean(req.secure);
    res.cookie('nextal_token', session.token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: session.sessionDurationMs,
    });

    res.json({
      status: 'success',
      message: 'MFA verification successful',
      token: session.token,
      user: session.user,
      method: verifyResult.method,
      remaining_recovery_codes: verifyResult.remaining_recovery_codes,
    });
  } catch (err) {
    next(err);
  }
}

export async function mfaStatus(req, res, next) {
  try {
    const userId = req.user.userId;
    const policy = await mfaService.checkMfaPolicyForUser(userId);
    res.json({
      status: 'success',
      data: {
        mfa_enabled: policy.enabled,
        mfa_required: policy.required,
        mfa_enrol_required: policy.enrolRequired,
      },
    });
  } catch (err) {
    next(err);
  }
}

export default {
  login,
  logout,
  getCurrentUser,
  forgotPassword,
  resetPassword,
  setPasswordFromInvite,
  changePassword,
  mfaEnrolInit,
  mfaEnrolConfirm,
  mfaVerify,
  mfaStatus,
};
