import dashboardService from '../services/dashboardService.js';

export async function getOverview(req, res, next) {
  try {
    const data = await dashboardService.getOverviewMetrics(req.companyId, req.user);
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
};

