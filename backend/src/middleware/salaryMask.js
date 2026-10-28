import { deepSanitize, hasSalaryAccess } from '../serializers/index.js';

/**
 * Middleware: Enforces Section 5.3 salary & bank privacy rule.
 * Intercepts res.json and removes all salary, monetary, and bank fields if the requesting user lacks salary access.
 */
export function salaryMaskMiddleware(req, res, next) {
  // If user sees salary or request is unauthenticated, continue normally
  if (!req.user || hasSalaryAccess(req.user)) {
    return next();
  }

  // Intercept res.json
  const originalJson = res.json.bind(res);

  res.json = function (body) {
    // If user is accessing their own personal payslip route, allow their own numbers
    if (req.baseUrl?.includes('/me/payslips') || req.path?.includes('/me/payslips')) {
      return originalJson(body);
    }

    const sanitizedBody = deepSanitize(body);
    return originalJson(sanitizedBody);
  };

  next();
}

export default salaryMaskMiddleware;
