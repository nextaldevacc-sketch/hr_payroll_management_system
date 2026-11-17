import prisma from '../lib/prisma.js';
import {
  PERMISSIONS_MATRIX,
  SALARY_ROLES,
  checkPermission,
} from '@nextal/shared';

export { PERMISSIONS_MATRIX, SALARY_ROLES, checkPermission };

/**
 * Express Middleware: Require specific permission according to Section 5.3
 */
export function requirePermission(area, action = 'view') {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    // Platform admin check: Platform admins cannot access company data directly
    // unless they have a valid support grant
    if (req.user.isPlatformAdmin) {
      return next();
    }

    const roles = req.user.roles || [];
    if (roles.length === 0) {
      console.warn(`[AUTH] Access attempted by user with no assigned roles: ${req.user.email || req.user.userId} on ${req.originalUrl}`);
      return res.status(403).json({
        status: 'error',
        code: 'NO_ROLE_ASSIGNED',
        message: 'No role assigned - contact your Company Admin',
        userRoles: [],
      });
    }
    const hasAccess = checkPermission(roles, area, action);

    if (!hasAccess) {
      return res.status(403).json({
        status: 'error',
        code: 'FORBIDDEN',
        message: `Forbidden: role(s) [${roles.join(', ')}] cannot perform '${action}' on area '${area}' (Section 5.3)`,
        area,
        requiredAction: action,
        userRoles: roles,
      });
    }

    next();
  };
}

/**
 * Express Middleware: Require at least one of the specified roles
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    if (req.user.isPlatformAdmin) {
      return next();
    }

    const userRoles = req.user.roles || [];
    if (userRoles.length === 0) {
      console.warn(`[AUTH] Access attempted by user with no assigned roles: ${req.user.email || req.user.userId} on ${req.originalUrl}`);
      return res.status(403).json({
        status: 'error',
        code: 'NO_ROLE_ASSIGNED',
        message: 'No role assigned - contact your Company Admin',
        allowedRoles,
        userRoles: [],
      });
    }
    const hasRole = allowedRoles.some((r) => userRoles.includes(r));

    if (!hasRole) {
      return res.status(403).json({
        status: 'error',
        code: 'FORBIDDEN',
        message: `Forbidden: requires one of roles [${allowedRoles.join(', ')}]`,
        allowedRoles,
        userRoles,
      });
    }

    next();
  };
}

/**
 * Express Middleware: Require Platform Admin
 */
export function requirePlatformAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      status: 'error',
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    });
  }

  if (!req.user.isPlatformAdmin) {
    return res.status(403).json({
      status: 'error',
      code: 'FORBIDDEN',
      message: 'Access restricted to Nextal Platform Administrators',
    });
  }

  next();
}

/**
 * Express Middleware: Require time-limited Support Access Grant for Platform Admin (FR-PL3)
 * "Platform admin cannot see employee or salary data unless the company grants time-limited support access"
 */
export async function requireSupportGrant(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      status: 'error',
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    });
  }

  // If user is a tenant user (not platform admin), this middleware is skipped
  if (!req.user.isPlatformAdmin) {
    return next();
  }

  const companyId = req.params.companyId || req.params.id || req.companyId;

  if (!companyId) {
    return res.status(400).json({
      status: 'error',
      code: 'MISSING_COMPANY_ID',
      message: 'Company ID required to evaluate support access grant',
    });
  }

  const now = new Date();
  const grant = await prisma.$base().support_access_grants.findFirst({
    where: {
      company_id: companyId,
      platform_user_id: req.user.userId,
      starts_at: { lte: now },
      ends_at: { gte: now },
      revoked_at: null,
    },
  });

  if (!grant) {
    return res.status(403).json({
      status: 'error',
      code: 'SUPPORT_GRANT_REQUIRED',
      message: 'Platform admin access denied: no active time-limited support access grant exists for this company (FR-PL3).',
      companyId,
    });
  }

  req.supportGrant = grant;
  next();
}
