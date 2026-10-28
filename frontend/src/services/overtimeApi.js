import { request } from './apiClient.js';

export async function listOvertime(params = {}) {
  const query = new URLSearchParams();
  if (params.status) query.append('status', params.status);
  if (params.from) query.append('from', params.from);
  if (params.to) query.append('to', params.to);
  if (params.employeeId) query.append('employeeId', params.employeeId);
  const qStr = query.toString() ? `?${query.toString()}` : '';
  return request(`/overtime${qStr}`);
}

export async function requestOvertime(data) {
  return request('/overtime/request', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function actOnOvertime(id, data) {
  return request(`/overtime/${id}/action`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function bulkApproveOvertime(ids) {
  return request('/overtime/bulk-approve', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
}

export default {
  listOvertime,
  requestOvertime,
  actOnOvertime,
  bulkApproveOvertime,
};
