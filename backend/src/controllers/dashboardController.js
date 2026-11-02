import dashboardService from '../services/dashboardService.js';

const FORBIDDEN_MONETARY_KEY_PATTERNS = [
  /amount/i,
  /salary/i,
  /wage/i,
  /cost/i,
  /gross/i,
  /net/i,
  /deduction/i,
  /allowance/i,
  /gratuity/i,
  /liability/i,
  /liabilities/i,
  /aed/i,
  /currency/i,
];

function sanitizeForNonSalaryRole(obj) {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(sanitizeForNonSalaryRole);
  }

  const clean = {};
  for (const [key, val] of Object.entries(obj)) {
    const isMonetaryKey = FORBIDDEN_MONETARY_KEY_PATTERNS.some((pat) => pat.test(key));
    if (isMonetaryKey) {
      continue; // omit monetary field
    }

    if (typeof val === 'string') {
      if (/\bAED\b/i.test(val) || /[\$€£]/.test(val)) {
        continue;
      }
      clean[key] = val;
    } else if (typeof val === 'object' && val !== null) {
      clean[key] = sanitizeForNonSalaryRole(val);
    } else {
      clean[key] = val;
    }
  }
  return clean;
}

export async function getOverview(req, res, next) {
  try {
    const rawData = await dashboardService.getOverviewMetrics(req.companyId, req.user);
    const seesSalary = Boolean(req.user?.seesSalary || req.user?.sees_salary);
    const data = seesSalary ? rawData : sanitizeForNonSalaryRole(rawData);
    res.json({ status: 'success', data });
  } catch (err) {
    next(err);
  }
}

export async function getSalary(req, res, next) {
  try {
    const data = await dashboardService.getSalaryMetrics(req.companyId);
    res.json({ status: 'success', data });
  } catch (err) {
    next(err);
  }
}

export default {
  getOverview,
  getSalary,
  sanitizeForNonSalaryRole,
};
