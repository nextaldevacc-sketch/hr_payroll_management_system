import { companyStorage } from '../lib/prisma.js';

/**
 * Company Context Middleware
 * Extracts companyId and user info from headers or auth token and runs
 * the request inside AsyncLocalStorage companyStorage.
 */
export function companyContextMiddleware(req, res, next) {
  // Support both explicit header (e.g. X-Company-Id) and user authentication context
  const companyId = req.headers['x-company-id'] || req.user?.company_id || null;
  const isPlatformAdmin = Boolean(req.user?.is_platform_admin || req.headers['x-platform-admin'] === 'true');

  companyStorage.run({ companyId, isPlatformAdmin, userId: req.user?.id }, () => {
    req.companyId = companyId;
    req.isPlatformAdmin = isPlatformAdmin;
    next();
  });
}
