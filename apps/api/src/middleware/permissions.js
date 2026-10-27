import prisma from '../prisma/client.js';

/**
 * Section 5.3 Permissions Matrix
 * Mapping of Role -> Area -> Set of allowed actions/capabilities
 */
export const PERMISSIONS_MATRIX = {
  EMPLOYEE: {
    dashboard: [],
    profile_self: ['view'],
    employees: [],
    documents: ['upload_own'],
    salary: [],
    attendance: ['own'],
    overtime: ['request'],
    leave: ['apply'],
    salary_adjustments: [],
    pay_runs: [],
    clearance: [],
    final_settlement: [],
    settings: [],
    audit: [],
  },
  DEPT_MANAGER: {
    dashboard: ['view_team', 'view'],
    profile_self: ['view'],
    employees: ['view_team'],
    documents: [],
    salary: [],
    attendance: ['confirm_team', 'view_team'],
    overtime: ['approve_team', 'view_team'],
    leave: ['approve_1st', 'view_team'],
    salary_adjustments: [],
    pay_runs: [],
    clearance: ['clear_own'],
    final_settlement: [],
    settings: [],
    audit: [],
  },
  HR_OFFICER: {
    dashboard: ['view'],
    profile_self: ['view'],
    employees: ['edit', 'view'],
    documents: ['edit', 'view'],
    salary: [],
    attendance: ['edit', 'confirm', 'view'],
    overtime: ['view'],
    leave: ['approve_2nd', 'view'],
    salary_adjustments: [],
    pay_runs: [],
    clearance: ['prepare', 'clear', 'view'],
    final_settlement: ['prepare'],
    settings: [],
    audit: [],
  },
  PAYROLL_OFFICER: {
    dashboard: ['view'],
    profile_self: ['view'],
    employees: ['view'],
    documents: [],
    salary: ['edit', 'view'],
    attendance: ['view'],
    overtime: ['view'],
    leave: ['view'],
    salary_adjustments: ['prepare', 'view'],
    pay_runs: ['prepare', 'view'],
    clearance: ['view'],
    final_settlement: ['calculate', 'view'],
    settings: ['edit_rules', 'view'],
    audit: [],
  },
  HR_MANAGER: {
    dashboard: ['view'],
    profile_self: ['view'],
    employees: ['edit', 'verify', 'view'],
    documents: ['edit', 'verify', 'view'],
    salary: ['approve', 'view'],
    attendance: ['edit', 'view'],
    overtime: ['approve', 'view'],
    leave: ['approve', 'view'],
    salary_adjustments: ['approve', 'view'],
    pay_runs: ['validate', 'view'],
    clearance: ['approve', 'view'],
    final_settlement: ['validate', 'view'],
    settings: ['edit_all', 'view'],
    audit: ['view'],
  },
  GM: {
    dashboard: ['view'],
    profile_self: ['view'],
    employees: ['view'],
    documents: ['view'],
    salary: ['view'],
    attendance: ['view'],
    overtime: [],
    leave: ['final_flagged', 'approve', 'view'],
    salary_adjustments: ['view'],
    pay_runs: ['approve', 'view'],
    clearance: [],
    final_settlement: ['approve', 'view'],
    settings: [],
    audit: ['view'],
  },
  FINANCE: {
    dashboard: ['view'],
    profile_self: ['view'],
    employees: [],
    documents: [],
    salary: ['view'],
    attendance: [],
    overtime: [],
    leave: [],
    salary_adjustments: ['view'],
    pay_runs: ['pay', 'view'],
    clearance: ['clear_own'],
    final_settlement: ['pay', 'view'],
    settings: ['accounts_only', 'view'],
    audit: [],
  },
  COMPANY_ADMIN: {
    dashboard: ['view'],
    profile_self: ['view'],
    employees: ['edit', 'verify', 'view'],
    documents: ['edit', 'verify', 'view'],
    salary: [], // Section 5: Company Admin does NOT see salary unless holding Payroll Officer, HR Manager, GM, or Finance
    attendance: ['edit', 'confirm', 'view'],
    overtime: ['approve', 'view'],
    leave: ['approve', 'view'],
    salary_adjustments: ['prepare', 'approve', 'view'],
    pay_runs: ['prepare', 'validate', 'approve', 'pay', 'view'],
    clearance: ['prepare', 'clear', 'approve', 'view'],
    final_settlement: ['prepare', 'calculate', 'validate', 'approve', 'pay', 'view'],
    settings: ['all', 'edit_all', 'edit_rules', 'accounts_only', 'view'],
    audit: ['view'],
  },
};

export const SALARY_ROLES = ['HR_MANAGER', 'PAYROLL_OFFICER', 'GM', 'FINANCE'];

/**
 * Check whether a list of user roles grants a specific permission in an area
 */
export function checkPermission(userRoles = [], area, action) {
  // Area: salary is strictly restricted to the 4 statutory salary roles
  if (area === 'salary') {
    return userRoles.some((r) => SALARY_ROLES.includes(r));
  }

  if (userRoles.includes('COMPANY_ADMIN')) {
    return true; // Company Admin has administrative capabilities for non-salary areas
  }

  for (const roleCode of userRoles) {
    const rolePermissions = PERMISSIONS_MATRIX[roleCode];
    if (rolePermissions && rolePermissions[area]) {
      const allowedActions = rolePermissions[area];
      if (
        allowedActions.includes(action) ||
        (action === 'view' && allowedActions.includes('view_team')) ||
        (allowedActions.includes('view') && action === 'read')
      ) {
        return true;
      }
    }
  }

  return false;
}

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

  const companyId = req.params.companyId || req.params.id || req.companyId || req.headers['x-company-id'];

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
