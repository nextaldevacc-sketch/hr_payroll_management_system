/**
 * CSRF and Origin / Referer validation middleware for state-changing HTTP methods
 */
export function csrfProtection(req, res, next) {
  // Safe methods do not mutate state
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // Exempt health and public doc endpoints
  if (req.path === '/health' || req.path === '/healthz' || req.path === '/api/v1/health' || req.path === '/api/v1/healthz' || req.path.startsWith('/api/docs')) {
    return next();
  }

  const isProd = process.env.NODE_ENV === 'production';
  const origin = req.headers['origin'];
  const referer = req.headers['referer'];

  // If neither Origin nor Referer is present:
  if (!origin && !referer) {
    // API tokens (Bearer auth) or non-production automated test calls without browser Origin
    if (!isProd || req.headers['authorization']) {
      return next();
    }
    return res.status(403).json({
      status: 'error',
      code: 'CSRF_BLOCKED',
      message: 'Missing Origin or Referer header on state-changing request',
    });
  }

  let requestOrigin = origin;
  if (!requestOrigin && referer) {
    try {
      requestOrigin = new URL(referer).origin;
    } catch {
      requestOrigin = null;
    }
  }

  if (!requestOrigin) {
    return next();
  }

  // Allow localhost / 127.0.0.1 in non-production
  if (!isProd && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(requestOrigin)) {
    return next();
  }

  const allowedOrigin = process.env.ALLOWED_ORIGIN || process.env.CORS_ORIGIN;
  if (allowedOrigin && requestOrigin === allowedOrigin) {
    return next();
  }

  // In test/dev environment, allow by default unless explicit CSRF check testing
  if (!isProd && !req.headers['x-test-csrf-enforce']) {
    return next();
  }

  return res.status(403).json({
    status: 'error',
    code: 'CSRF_BLOCKED',
    message: 'Cross-site request forgery detected: Origin not permitted',
  });
}

export default csrfProtection;
