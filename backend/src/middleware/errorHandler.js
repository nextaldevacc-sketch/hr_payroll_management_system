/**
 * Centralized API Error Handling Middleware
 * Production Hardening (PART 7B - B2)
 */

export function maskPii(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/\bAE\d{2}[A-Za-z0-9]{19}\b/gi, (m) => `${m.slice(0, 4)}****************${m.slice(-3)}`)
    .replace(/\b784-?\d{4}-?\d{7}-?\d\b/gi, '784-****-*******-*')
    .replace(/\b[A-PR-WY][0-9]{7,8}\b/gi, 'P*******');
}

export function errorHandler(err, req, res, next) {
  const isDev = process.env.NODE_ENV !== 'production';

  // Sanitize logged message to prevent PII leakage in server log aggregators
  const logMsg = err.stack || err.message || String(err);
  console.error('[API Error]:', maskPii(logMsg));

  // Prisma record not found / company isolation access refusal
  if (err.code === 'P2025' || err.message?.includes('belongs to another company')) {
    return res.status(404).json({
      status: 'error',
      code: 'NOT_FOUND',
      message: 'Resource not found or inaccessible.',
    });
  }

  // Company context missing
  if (err.message?.includes('Company context is required')) {
    return res.status(403).json({
      status: 'error',
      code: 'FORBIDDEN_COMPANY_CONTEXT_REQUIRED',
      message: 'Company context is required to access this resource.',
    });
  }

  // Append-only audit trigger violation
  if (err.message?.includes('audit_logs table is append-only')) {
    return res.status(403).json({
      status: 'error',
      code: 'AUDIT_LOG_IMMUTABLE',
      message: 'audit_logs table is append-only. UPDATE and DELETE operations are prohibited.',
    });
  }

  // Unique constraint violation in Prisma
  if (err.code === 'P2002') {
    return res.status(409).json({
      status: 'error',
      code: 'CONFLICT_UNIQUE_VIOLATION',
      message: 'A record with these unique details already exists.',
    });
  }

  const statusCode = err.status || err.statusCode || 500;
  const isPrismaInternal =
    err.code?.startsWith('P') ||
    err.message?.includes('prisma') ||
    err.message?.includes('Invalid `prisma.') ||
    err.message?.includes('Invocation:');

  let safeMessage = err.message || 'An unexpected error occurred.';
  if (!isDev) {
    if (statusCode === 500 || isPrismaInternal) {
      safeMessage = 'An internal server error occurred. Please contact system administrator.';
    }
  }

  res.status(statusCode).json({
    status: 'error',
    code: err.code || 'INTERNAL_SERVER_ERROR',
    message: safeMessage,
    ...(err.field ? { field: err.field } : {}),
    ...(isDev && { stack: err.stack }),
  });
}
