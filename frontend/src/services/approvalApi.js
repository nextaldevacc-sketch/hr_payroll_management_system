import { request } from './apiClient';

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

export default {
  fetchPendingApprovals,
  actOnApproval,
};

