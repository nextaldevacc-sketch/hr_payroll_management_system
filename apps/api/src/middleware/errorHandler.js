/**
 * Centralized API Error Handling Middleware
 */
export function errorHandler(err, req, res, next) {
  const isDev = process.env.NODE_ENV !== 'production';

  console.error('[API Error]:', err);

  // Prisma record not found / company isolation access refusal
  if (err.code === 'P2025' || err.message?.includes('belongs to another company')) {
    return res.status(404).json({
      status: 'error',
      code: 'NOT_FOUND',
      message: err.message || 'Resource not found or inaccessible.',
    });
  }

  // Company context missing
  if (err.message?.includes('Company context is required')) {
    return res.status(403).json({
      status: 'error',
      code: 'FORBIDDEN_COMPANY_CONTEXT_REQUIRED',
      message: err.message,
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
      message: `A record with this ${err.meta?.target ? err.meta.target.join(', ') : 'field'} already exists.`,
    });
  }

  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    status: 'error',
    code: err.code || 'INTERNAL_SERVER_ERROR',
    message: err.message || 'An unexpected error occurred.',
    ...(isDev && { stack: err.stack }),
  });
}
