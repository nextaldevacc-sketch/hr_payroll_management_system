import { request, API_BASE } from './apiClient';

export async function getComplianceOverview(params = {}) {
  const query = new URLSearchParams();
  if (params.company_visa_id) query.append('company_visa_id', params.company_visa_id);
  if (params.companyVisaId) query.append('company_visa_id', params.companyVisaId);
  const qs = query.toString() ? `?${query.toString()}` : '';
  return await request(`/compliance/overview${qs}`);
}

export async function listComplianceDocuments(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      query.append(key, val);
    }
  });
  const qs = query.toString() ? `?${query.toString()}` : '';
  return await request(`/compliance/documents${qs}`);
}

export async function renewDocument(id, formData) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('nextal_token') : null;
  const res = await fetch(`${API_BASE}/compliance/documents/${id}/renew`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to renew document');
  }

  return await res.json();
}

export async function verifyDocument(id) {
  return await request(`/compliance/documents/${id}/verify`, {
    method: 'POST',
  });
}

export async function getDocumentHistory(id) {
  return await request(`/compliance/documents/${id}/history`);
}

export default {
  getComplianceOverview,
  listComplianceDocuments,
  renewDocument,
  verifyDocument,
  getDocumentHistory,
};

