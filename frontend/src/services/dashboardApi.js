import { request } from './apiClient';

export async function getDashboardOverview() {
  return await request('/dashboard/overview', {}, null);
}

export async function getDashboardSalary() {
  return await request('/dashboard/salary', {}, null);
}

export default {
  getDashboardOverview,
  getDashboardSalary,
};

