import { request, API_BASE } from './apiClient';
import { getMyRejections } from './meApi';

export async function fetchPendingApprovals() {
  const res = await request('/approvals/pending');
  return Array.isArray(res) ? res : res?.data || [];
}

export async function actOnApproval(id, { action, comment, reason }) {
  return await request(`/approvals/${id}/action`, {
    method: 'POST',
    body: JSON.stringify({ action, comment, reason }),
  });
}

export async function fetchRejections({ search = '', requestType = '', startDate = '', endDate = '', page = 1, limit = 20 } = {}) {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (requestType) params.append('requestType', requestType);
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  if (page) params.append('page', page);
  if (limit) params.append('limit', limit);

  const query = params.toString();
  const endpoint = `/approvals/rejections${query ? `?${query}` : ''}`;
  const res = await request(endpoint);
  return {
    data: res?.data || [],
    pagination: res?.pagination || { total: 0, page: 1, limit: 20, totalPages: 1 },
  };
}

export async function fetchRejectionById(id) {
  const res = await request(`/approvals/rejections/${id}`);
  return res?.data || null;
}

export async function downloadRejectionsCsv({ search = '', requestType = '', startDate = '', endDate = '' } = {}) {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (requestType) params.append('requestType', requestType);
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);

  const query = params.toString();
  const endpoint = `/approvals/rejections/export/csv${query ? `?${query}` : ''}`;
  const blob = await request(endpoint, { responseType: 'blob' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `rejections-audit-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

export { getMyRejections as fetchMyRejections };

export default {
  fetchPendingApprovals,
  actOnApproval,
  fetchRejections,
  fetchMyRejections: getMyRejections,
  fetchRejectionById,
  downloadRejectionsCsv,
};
