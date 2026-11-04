import { request } from './apiClient';

export async function getDashboardOverview(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return await request(`/dashboard/overview${qs ? `?${qs}` : ''}`, {}, null);
}

export async function getDashboardSalary(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return await request(`/dashboard/salary${qs ? `?${qs}` : ''}`, {}, null);
}

export default {
  getDashboardOverview,
  getDashboardSalary,
};
