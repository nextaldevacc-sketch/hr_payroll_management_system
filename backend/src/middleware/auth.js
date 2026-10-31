import jwt from 'jsonwebtoken';
import prisma, { companyStorage } from '../lib/prisma.js';
import { getCachedUserSession, setCachedUserSession } from './authCache.js';

const JWT_SECRET = process.env.JWT_SECRET || 'nextal_super_secret_jwt_key_2026_uae';

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
    decoded = jwt.verify(token, JWT_SECRET);
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

  // Determine companyId: platform admin might specify X-Company-Id for context
  const companyId = decoded.isPlatformAdmin
    ? req.headers['x-company-id'] || decoded.companyId || null
    : decoded.companyId;

  req.companyId = companyId;
  req.isPlatformAdmin = Boolean(decoded.isPlatformAdmin);

  // Run inside AsyncLocalStorage context
  companyStorage.run(
    {
      companyId,
      isPlatformAdmin: decoded.isPlatformAdmin,
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
 * Populates req.user if present, but does not block if not logged in
 */
export async function optionalAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const validation = await validateUserSessionState(decoded.userId, decoded.tokenVersion);
    if (!validation.valid) {
      return next();
    }

    req.user = decoded;
    const companyId = decoded.companyId || req.headers['x-company-id'] || null;
    req.companyId = companyId;
    req.isPlatformAdmin = Boolean(decoded.isPlatformAdmin);

    companyStorage.run(
      {
        companyId,
        isPlatformAdmin: decoded.isPlatformAdmin,
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
