import { request } from './apiClient.js';

export async function getAttendanceGrid(params = {}) {
  const query = new URLSearchParams();
  if (params.from) query.append('from', params.from);
  if (params.to) query.append('to', params.to);
  if (params.departmentId) query.append('departmentId', params.departmentId);
  if (params.employeeId) query.append('employeeId', params.employeeId);
  if (params.company_visa_id) query.append('company_visa_id', params.company_visa_id);
  if (params.companyVisaId) query.append('company_visa_id', params.companyVisaId);
  const qStr = query.toString() ? `?${query.toString()}` : '';
  return request(`/attendance/grid${qStr}`);
}

export async function importBiometric(formData) {
  return request('/attendance/import', {
    method: 'POST',
    body: formData,
  });
}

export async function editAttendanceDay(id, data) {
  return request(`/attendance/days/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function getMissingPunchQueue(params = {}) {
  const query = new URLSearchParams();
  if (params.month) query.append('month', params.month);
  if (params.from) query.append('from', params.from);
  if (params.to) query.append('to', params.to);
  if (params.departmentId) query.append('departmentId', params.departmentId);
  if (params.company_visa_id) query.append('company_visa_id', params.company_visa_id);
  if (params.companyVisaId) query.append('company_visa_id', params.companyVisaId);
  const qStr = query.toString() ? `?${query.toString()}` : '';
  return request(`/attendance/missing-punch${qStr}`);
}

export async function resolveMissingPunch(id, data) {
  return request(`/attendance/days/${id}/resolve-missing-punch`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function confirmManagerAttendance(data) {
  return request('/attendance/review/manager-confirm', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function confirmHRAttendance(data) {
  return request('/attendance/review/hr-confirm', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getMyAttendance(params = {}) {
  const query = new URLSearchParams();
  if (params.from) query.append('from', params.from);
  if (params.to) query.append('to', params.to);
  const qStr = query.toString() ? `?${query.toString()}` : '';
  return request(`/me/attendance${qStr}`);
}

export default {
  getAttendanceGrid,
  importBiometric,
  editAttendanceDay,
  getMissingPunchQueue,
  resolveMissingPunch,
  confirmManagerAttendance,
  confirmHRAttendance,
  getMyAttendance,
};
