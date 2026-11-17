import { companyStorage } from '../lib/prisma.js';

/**
 * Company Context Middleware
 * Initializes companyStorage with authenticated user context.
 * NOTE: Raw client headers (e.g. X-Company-Id, X-Platform-Admin) are NEVER trusted.
 * req.companyId and req.isPlatformAdmin MUST originate strictly from verified auth tokens.
 */
export function companyContextMiddleware(req, res, next) {
  const companyId = req.user?.company_id || req.user?.companyId || null;
  const isPlatformAdmin = Boolean(req.user?.is_platform_admin || req.user?.isPlatformAdmin);

  req.companyId = companyId;
  req.isPlatformAdmin = isPlatformAdmin;

  companyStorage.run(
    {
      companyId,
      isPlatformAdmin,
      userId: req.user?.id || req.user?.userId || null,
      seesSalary: req.user?.seesSalary ?? false,
    },
    () => {
      next();
    }
  );
}
