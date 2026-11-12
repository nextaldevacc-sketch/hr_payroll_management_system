import { request } from './apiClient.js';

export async function getLeaveTypes() {
  return request('/leave/types');
}

export async function getLeaveBalances(params = {}) {
  const query = new URLSearchParams();
  const empId = params.employee_id || params.employeeId;
  if (empId) query.append('employee_id', empId);
  if (params.year) query.append('year', params.year);
  if (params.company_visa_id) query.append('company_visa_id', params.company_visa_id);
  if (params.companyVisaId) query.append('company_visa_id', params.companyVisaId);
  const qStr = query.toString() ? `?${query.toString()}` : '';
  return request(`/leave/balances${qStr}`);
}

export async function listLeaveRequests(params = {}) {
  const query = new URLSearchParams();
  if (params.status) query.append('status', params.status);
  if (params.employeeId) query.append('employeeId', params.employeeId);
  if (params.year) query.append('year', params.year);
  if (params.company_visa_id) query.append('company_visa_id', params.company_visa_id);
  if (params.companyVisaId) query.append('company_visa_id', params.companyVisaId);
  const qStr = query.toString() ? `?${query.toString()}` : '';
  return request(`/leave/requests${qStr}`);
}

export async function requestLeave(data) {
  const isMultipart = data instanceof FormData;
  return request('/leave/request', {
    method: 'POST',
    body: isMultipart ? data : JSON.stringify(data),
  });
}

export async function actOnLeave(id, data) {
  return request(`/leave/requests/${id}/action`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getMyLeave(params = {}) {
  const query = new URLSearchParams();
  if (params.year) query.append('year', params.year);
  const qStr = query.toString() ? `?${query.toString()}` : '';
  return request(`/me/leave${qStr}`);
}

export async function getMyRequests(params = {}) {
  const query = new URLSearchParams();
  if (params.year) query.append('year', params.year);
  const qStr = query.toString() ? `?${query.toString()}` : '';
  return request(`/me/requests${qStr}`);
}

export default {
  getLeaveTypes,
  getLeaveBalances,
  listLeaveRequests,
  requestLeave,
  actOnLeave,
  getMyLeave,
  getMyRequests,
};
