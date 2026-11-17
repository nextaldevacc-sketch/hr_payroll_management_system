import jwt from 'jsonwebtoken';
import prisma, { companyStorage } from '../lib/prisma.js';
import { getCachedUserSession, setCachedUserSession } from './authCache.js';
import auditService from '../services/auditService.js';

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is required but not configured');
  }
  return secret;
};

/**
 * Extract token from cookie (nextal_token) or Authorization header (Bearer <token>)
 */
function extractToken(req) {
  if (req.cookies && req.cookies.nextal_token) {
    return req.cookies.nextal_token;
  }

  // Also parse raw cookie header if cookie-parser middleware was not used
  if (req.headers.cookie) {
    const match = req.headers.cookie.match(/(?:^|;\s*)nextal_token=([^;]+)/);
    if (match) return decodeURIComponent(match[1]);
  }

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    return req.headers.authorization.slice(7).trim();
  }

  return null;
}

/**
 * Validate user live state: active, not locked, company not suspended, token_version matches.
 * Uses 60-second in-memory cache to minimize DB load while guaranteeing prompt revocation.
 */
async function validateUserSessionState(userId, tokenVersion) {
  let sessionState = getCachedUserSession(userId);

  if (!sessionState) {
    const user = await prisma.$base().users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        status: true,
        locked_until: true,
        token_version: true,
        company_id: true,
        company: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    if (!user) {
      return { valid: false, httpStatus: 401, code: 'USER_NOT_FOUND', message: 'User account not found.' };
    }

    sessionState = {
      userId: user.id,
      userStatus: user.status,
      lockedUntil: user.locked_until,
      tokenVersion: user.token_version,
      companyId: user.company_id,
      companyStatus: user.company?.status || 'Active',
    };

    setCachedUserSession(userId, sessionState);
  }

  // 1. Verify token version: if bumped, session is invalidated immediately
  if (tokenVersion && sessionState.tokenVersion !== tokenVersion) {
    return {
      valid: false,
      httpStatus: 401,
      code: 'SESSION_REVOKED',
      message: 'Session has been invalidated. Please sign in again.',
    };
  }

  // 2. Check user status: Disabled / Deactivated accounts immediately rejected with 401
  if (sessionState.userStatus === 'Disabled' || sessionState.userStatus === 'Archived') {
    return {
      valid: false,
      httpStatus: 401,
      code: 'ACCOUNT_DISABLED',
      message: 'User account has been disabled. Please contact your company administrator.',
    };
  }

  // 3. Check account lockout: HTTP 423
  const now = new Date();
  if (sessionState.lockedUntil && new Date(sessionState.lockedUntil) > now) {
    return {
      valid: false,
      httpStatus: 423,
      code: 'ACCOUNT_LOCKED',
      message: 'Account is temporarily locked due to failed login attempts.',
    };
  }

  // 4. Check company status: Suspended companies return 403 (FR-PL2)
  if (sessionState.companyStatus === 'Suspended') {
    return {
      valid: false,
      httpStatus: 403,
      code: 'COMPANY_SUSPENDED',
      message: 'Company account is currently suspended. Please contact Nextal platform support.',
    };
  }

  return { valid: true };
}

function clearAuthCookie(req, res) {
  const isSecure = process.env.COOKIE_SECURE === 'true' || Boolean(req.secure);
  res.clearCookie('nextal_token', {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    path: '/',
  });
}

/**
 * Authentication Middleware
 * Enforces valid 8-hour JWT session on protected endpoints
 * Re-checks active, not locked, company not suspended, token_version on every request
 */
export async function authenticate(req, res, next) {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({
      status: 'error',
      code: 'UNAUTHORIZED',
      message: 'Authentication session required. Please sign in.',
    });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, getJwtSecret());
  } catch (err) {
    clearAuthCookie(req, res);
    return res.status(401).json({
      status: 'error',
      code: 'UNAUTHORIZED',
      message: 'Authentication session has expired or is invalid. Please sign in again.',
    });
  }

  // Re-check live user & company state (with 60-second TTL cache)
  const validation = await validateUserSessionState(decoded.userId, decoded.tokenVersion);
  if (!validation.valid) {
    clearAuthCookie(req, res);
    return res.status(validation.httpStatus).json({
      status: 'error',
      code: validation.code,
      message: validation.message,
    });
  }

  req.user = decoded;
  req.user.id = decoded.userId;
  req.user.company_id = decoded.companyId;
  req.user.is_platform_admin = Boolean(decoded.isPlatformAdmin);

  // Determine companyId: platform admin might specify X-Company-Id for context
  let companyId = decoded.companyId;
  const isPlatformAdmin = Boolean(decoded.isPlatformAdmin);

  const requestedCompanyId = req.headers['x-company-id'];
  if (requestedCompanyId) {
    if (isPlatformAdmin) {
      if (requestedCompanyId !== decoded.companyId) {
        // Legitimate platform admin tenant switch: audit the action
        companyId = requestedCompanyId;
        req.user.company_id = requestedCompanyId;

        try {
          await auditService.log({
            companyId: requestedCompanyId,
            userId: decoded.userId,
            action: 'TENANT_SWITCH',
            tableName: 'companies',
            recordId: requestedCompanyId,
            newValues: {
              switched_from: decoded.companyId,
              switched_to: requestedCompanyId,
              reason: 'Platform Admin tenant switch via X-Company-Id',
            },
            ipAddress: req.ip || req.connection?.remoteAddress,
          });
        } catch (auditErr) {
          console.error('Failed to log tenant context switch:', auditErr);
        }
      }
    } else {
      // Regular user sent X-Company-Id: client headers are never trusted.
      // req.companyId remains strictly decoded.companyId.
    }
  }

  req.companyId = companyId;
  req.isPlatformAdmin = isPlatformAdmin;

  // Run inside AsyncLocalStorage context
  companyStorage.run(
    {
      companyId,
      isPlatformAdmin,
      userId: decoded.userId,
      seesSalary: decoded.seesSalary,
    },
    () => {
      next();
    }
  );
}

/**
 * Optional Authentication Middleware
 * Populates req.user if present, but does not block if not logged in.
 * Use ONLY on GET /auth/me so the frontend can check session state without a 401.
 */
export async function optionalAuthenticate(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    req.user = null;
    return next();
  }

  let decoded;
  try {
    decoded = jwt.verify(token, getJwtSecret());
  } catch (err) {
    clearAuthCookie(req, res);
    return res.status(401).json({
      status: 'error',
      code: 'UNAUTHORIZED',
      message: 'Authentication session has expired or is invalid. Please sign in again.',
    });
  }

  // Re-check live user & company state (with 60-second TTL cache)
  const validation = await validateUserSessionState(decoded.userId, decoded.tokenVersion);
  if (!validation.valid) {
    clearAuthCookie(req, res);
    return res.status(validation.httpStatus).json({
      status: 'error',
      code: validation.code,
      message: validation.message,
    });
  }

  req.user = decoded;
  req.user.id = decoded.userId;
  req.user.company_id = decoded.companyId;
  req.user.is_platform_admin = Boolean(decoded.isPlatformAdmin);

  let companyId = decoded.companyId;
  const isPlatformAdmin = Boolean(decoded.isPlatformAdmin);

  const requestedCompanyId = req.headers['x-company-id'];
  if (requestedCompanyId && isPlatformAdmin && requestedCompanyId !== decoded.companyId) {
    companyId = requestedCompanyId;
    req.user.company_id = requestedCompanyId;
  }

  req.companyId = companyId;
  req.isPlatformAdmin = isPlatformAdmin;

  companyStorage.run(
    {
      companyId,
      isPlatformAdmin,
      userId: decoded.userId,
      seesSalary: decoded.seesSalary,
    },
    () => {
      next();
    }
  );
}

/**
 * @deprecated Use optionalAuthenticate instead
 */
export async function optionalAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret());
    const validation = await validateUserSessionState(decoded.userId, decoded.tokenVersion);
    if (!validation.valid) {
      return next();
    }

    req.user = decoded;
    req.user.id = decoded.userId;
    req.user.company_id = decoded.companyId;
    req.user.is_platform_admin = Boolean(decoded.isPlatformAdmin);

    let companyId = decoded.companyId;
    const isPlatformAdmin = Boolean(decoded.isPlatformAdmin);

    const requestedCompanyId = req.headers['x-company-id'];
    if (requestedCompanyId && isPlatformAdmin && requestedCompanyId !== decoded.companyId) {
      companyId = requestedCompanyId;
      req.user.company_id = requestedCompanyId;
    }

    req.companyId = companyId;
    req.isPlatformAdmin = isPlatformAdmin;

    companyStorage.run(
      {
        companyId,
        isPlatformAdmin,
        userId: decoded.userId,
        seesSalary: decoded.seesSalary,
      },
      () => {
        next();
      }
    );
  } catch (e) {
    next();
  }
}

export default authenticate;
