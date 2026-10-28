import { request } from './apiClient.js';

export async function getAttendanceGrid(params = {}) {
  const query = new URLSearchParams();
  if (params.from) query.append('from', params.from);
  if (params.to) query.append('to', params.to);
  if (params.departmentId) query.append('departmentId', params.departmentId);
  if (params.employeeId) query.append('employeeId', params.employeeId);
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
  if (params.from) query.append('from', params.from);
  if (params.to) query.append('to', params.to);
  if (params.departmentId) query.append('departmentId', params.departmentId);
  const qStr = query.toString() ? `?${query.toString()}` : '';
  return request(`/attendance/missing-punches${qStr}`);
}

export async function resolveMissingPunch(id, data) {
  return request(`/attendance/missing-punches/${id}/resolve`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function confirmManagerAttendance(data) {
  return request('/attendance/confirm/manager', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function confirmHRAttendance(data) {
  return request('/attendance/confirm/hr', {
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
