import { request, API_BASE } from './apiClient';

export async function getMyHome() {
  return await request('/me/home', {}, null);
}

export async function getMyProfile() {
  return await request('/me/profile', {}, null);
}

export async function getMyPayslips() {
  return await request('/me/payslips', {}, []);
}

export async function getMyPayslip(id) {
  return await request(`/me/payslips/${id}`, {}, null);
}

export function getMyPayslipPdfUrl(id) {
  return `${API_BASE}/me/payslips/${id}/pdf`;
}

export async function getMyAttendance(month = '') {
  const q = month ? `?month=${month}` : '';
  return await request(`/me/attendance${q}`, {}, []);
}

export async function getMyLeave(year = '') {
  const q = year ? `?year=${year}` : '';
  return await request(`/me/leave${q}`, {}, { balances: [], request_history: [] });
}

export async function getMyRequests() {
  return await request('/me/requests', {}, []);
}

export async function submitMyRequest(data) {
  return await request('/me/requests', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function cancelMyRequest(type, id) {
  return await request(`/me/requests/${type}/${id}/cancel`, {
    method: 'POST',
  });
}

export async function getMyDocuments() {
  return await request('/me/documents', {}, []);
}

export async function uploadMyDocument(formData) {
  return await request('/me/documents', {
    method: 'POST',
    body: formData,
  });
}

export function getMyDocumentDownloadUrl(id) {
  return `${API_BASE}/me/documents/${id}/download`;
}

export async function getMyRejections({ search = '', requestType = '', startDate = '', endDate = '', page = 1, limit = 20 } = {}) {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (requestType) params.append('requestType', requestType);
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  if (page) params.append('page', page);
  if (limit) params.append('limit', limit);

  const query = params.toString();
  const endpoint = `/me/rejections${query ? `?${query}` : ''}`;
  const res = await request(endpoint);
  if (Array.isArray(res)) {
    return {
      data: res,
      pagination: { total: res.length, page: Number(page) || 1, limit: Number(limit) || 20, totalPages: 1 },
    };
  }
  return {
    data: res?.data || [],
    pagination: res?.pagination || { total: 0, page: 1, limit: 20, totalPages: 1 },
  };
}

export default {
  getMyHome,
  getMyProfile,
  getMyPayslips,
  getMyPayslip,
  getMyPayslipPdfUrl,
  getMyAttendance,
  getMyLeave,
  getMyRequests,
  submitMyRequest,
  cancelMyRequest,
  getMyDocuments,
  uploadMyDocument,
  getMyDocumentDownloadUrl,
  getMyRejections,
};

