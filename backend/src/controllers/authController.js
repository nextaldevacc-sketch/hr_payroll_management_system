import authService from '../services/authService.js';

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || null;

    const result = await authService.login({ email, password, ipAddress });

    // Set httpOnly secure cookie with 8-hour expiry
    res.cookie('nextal_token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
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

export function logout(req, res) {
  res.clearCookie('nextal_token');
  res.json({
    status: 'success',
    message: 'Logged out successfully',
  });
}

export async function getCurrentUser(req, res, next) {
  try {
    const user = await authService.prisma.$base().users.findUnique({
      where: { id: req.user.userId },
      include: {
        company: true,
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

    const SALARY_ROLES = ['HR_MANAGER', 'PAYROLL_OFFICER', 'GM', 'FINANCE'];
    const seesSalary = user.user_roles.some((ur) => SALARY_ROLES.includes(ur.role.code));

    res.json({
      status: 'success',
      user: {
        id: user.id,
        email: user.email,
        company_id: user.company_id,
        company_name: user.company?.name || 'Nextal Platform',
        company_status: user.company?.status || 'Active',
        is_platform_admin: user.is_platform_admin,
        status: user.status,
        employee_id: user.employee_id,
        employee: user.employee,
        roles,
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

export default {
  login,
  logout,
  getCurrentUser,
  forgotPassword,
  resetPassword,
  setPasswordFromInvite,
};
