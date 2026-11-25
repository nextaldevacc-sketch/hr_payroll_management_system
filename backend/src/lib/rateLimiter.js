import prisma from './prisma.js';

/**
 * PostgreSQL-Backed Distributed Rate Limiter
 * Survives process restarts and coordinates across multiple API instances.
 */
export class PostgresRateLimiter {
  constructor({ windowMs = 15 * 60 * 1000, max = 15, keyPrefix = 'rl' } = {}) {
    this.windowMs = windowMs;
    this.max = max;
    this.keyPrefix = keyPrefix;
  }

  /**
   * Consume a point for a key. Returns { allowed, remaining, retryAfterSeconds, totalPoints }
   */
  async consume(key, points = 1) {
    const fullKey = `${this.keyPrefix}:${key}`;
    const windowInterval = `${Math.ceil(this.windowMs)} milliseconds`;

    try {
      // Atomic upsert with conditional expiry reset in PostgreSQL
      const rows = await prisma.$base().$queryRawUnsafe(`
        INSERT INTO "rate_limits" ("key", "points", "expire_at")
        VALUES ($1, $2, NOW() + INTERVAL '${windowInterval}')
        ON CONFLICT ("key") DO UPDATE
        SET "points" = CASE
          WHEN "rate_limits"."expire_at" <= NOW() THEN $2
          ELSE "rate_limits"."points" + $2
        END,
        "expire_at" = CASE
          WHEN "rate_limits"."expire_at" <= NOW() THEN NOW() + INTERVAL '${windowInterval}'
          ELSE "rate_limits"."expire_at"
        END
        RETURNING "points", "expire_at";
      `, fullKey, points);

      const record = rows[0];
      const totalPoints = record ? Number(record.points) : points;
      const expireAt = record ? new Date(record.expire_at) : new Date(Date.now() + this.windowMs);
      const remainingMs = Math.max(0, expireAt.getTime() - Date.now());
      const retryAfterSeconds = Math.max(1, Math.ceil(remainingMs / 1000));
      const allowed = totalPoints <= this.max;
      const remaining = Math.max(0, this.max - totalPoints);

      return {
        allowed,
        totalPoints,
        remaining,
        retryAfterSeconds,
        expireAt,
      };
    } catch (err) {
      // Fail-open on DB connection hiccup to avoid total auth paralysis, but log warning
      console.warn(`[RateLimiter] Database query failed for key ${fullKey}:`, err.message);
      return {
        allowed: true,
        totalPoints: 1,
        remaining: this.max - 1,
        retryAfterSeconds: 0,
        expireAt: new Date(Date.now() + this.windowMs),
      };
    }
  }

  /**
   * Reset/clear points for a key (e.g. after successful login or admin unlock)
   */
  async reset(key) {
    const fullKey = `${this.keyPrefix}:${key}`;
    try {
      await prisma.$base().rate_limits.deleteMany({
        where: { key: fullKey },
      });
    } catch (err) {
      // Ignore if record didn't exist
    }
  }
}

/**
 * Helper to resolve real client IP considering reverse proxy headers
 */
export function getClientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (xff && typeof xff === 'string') {
    const parts = xff.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length > 0) {
      return parts[0];
    }
  }
  const xRealIp = req.headers['x-real-ip'];
  if (xRealIp && typeof xRealIp === 'string') {
    return xRealIp.trim();
  }
  return req.ip || req.socket?.remoteAddress || '127.0.0.1';
}

const isTest = process.env.NODE_ENV === 'test';

// Configurable thresholds (defaults to high limit in test to allow large suites to run)
export const authIpLimiter = new PostgresRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: process.env.AUTH_IP_RATE_LIMIT_MAX
    ? Number(process.env.AUTH_IP_RATE_LIMIT_MAX)
    : (isTest ? 10000 : 60), // 60 attempts per 15 min per IP
  keyPrefix: 'auth_ip',
});

export const authEmailLimiter = new PostgresRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: process.env.AUTH_EMAIL_RATE_LIMIT_MAX
    ? Number(process.env.AUTH_EMAIL_RATE_LIMIT_MAX)
    : (isTest ? 10000 : 15), // 15 attempts per 15 min per email
  keyPrefix: 'auth_email',
});

export const authEmailIpLimiter = new PostgresRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: process.env.AUTH_EMAIL_IP_RATE_LIMIT_MAX
    ? Number(process.env.AUTH_EMAIL_IP_RATE_LIMIT_MAX)
    : (isTest ? 10000 : 10), // 10 attempts per 15 min per (email + IP)
  keyPrefix: 'auth_email_ip',
});

/**
 * Express middleware for composite authentication rate limiting
 * Enforces per-IP and per-email limits with descriptive HTTP 429 response.
 */
export async function authRateLimitMiddleware(req, res, next) {
  // Only apply to state-changing auth endpoints (like POST /login)
  if (req.method !== 'POST') {
    return next();
  }

  const clientIp = getClientIp(req);
  const email = req.body?.email ? String(req.body.email).trim().toLowerCase() : null;

  // 1. Check IP rate limit
  const ipResult = await authIpLimiter.consume(clientIp);
  if (!ipResult.allowed) {
    res.setHeader('Retry-After', String(ipResult.retryAfterSeconds));
    return res.status(429).json({
      status: 'error',
      code: 'TOO_MANY_REQUESTS',
      message: `Too many authentication attempts from this IP address. Please try again after ${ipResult.retryAfterSeconds} seconds.`,
      retryAfter: ipResult.retryAfterSeconds,
    });
  }

  // 2. Check Email rate limit if email was provided
  if (email) {
    const emailResult = await authEmailLimiter.consume(email);
    if (!emailResult.allowed) {
      res.setHeader('Retry-After', String(emailResult.retryAfterSeconds));
      return res.status(429).json({
        status: 'error',
        code: 'TOO_MANY_REQUESTS',
        message: `Too many authentication attempts for this account. Please try again after ${emailResult.retryAfterSeconds} seconds.`,
        retryAfter: emailResult.retryAfterSeconds,
      });
    }

    // 3. Check composite (Email + IP) rate limit
    if (clientIp) {
      const compositeResult = await authEmailIpLimiter.consume(`${email}:${clientIp}`);
      if (!compositeResult.allowed) {
        res.setHeader('Retry-After', String(compositeResult.retryAfterSeconds));
        return res.status(429).json({
          status: 'error',
          code: 'TOO_MANY_REQUESTS',
          message: `Too many login attempts for this account from this IP address. Please try again after ${compositeResult.retryAfterSeconds} seconds.`,
          retryAfter: compositeResult.retryAfterSeconds,
        });
      }
    }
  }

  next();
}

export default {
  PostgresRateLimiter,
  getClientIp,
  authIpLimiter,
  authEmailLimiter,
  authRateLimitMiddleware,
};
