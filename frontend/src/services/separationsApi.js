import { request } from './apiClient.js';

export async function listSeparations(params = {}) {
  const query = new URLSearchParams();
  if (params.status) query.append('status', params.status);
  if (params.type) query.append('type', params.type);
  if (params.employeeId) query.append('employeeId', params.employeeId);
  if (params.limit) query.append('limit', params.limit);
  if (params.offset) query.append('offset', params.offset);
  const qStr = query.toString() ? `?${query.toString()}` : '';
  return request(`/separations${qStr}`);
}

export async function getSeparation(id) {
  return request(`/separations/${id}`);
}

export async function createSeparation(data) {
  return request('/separations', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function actOnSeparation(id, data) {
  return request(`/separations/${id}/action`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateClearanceItem(itemId, data) {
  return request(`/separations/clearance/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function getSeparationTasks(separationId) {
  return request(`/separations/${separationId}/tasks`);
}

export async function listSeparationTasks(params = {}) {
  const query = new URLSearchParams();
  if (params.status) query.append('status', params.status);
  if (params.task_type) query.append('task_type', params.task_type);
  const qStr = query.toString() ? `?${query.toString()}` : '';
  return request(`/separation-tasks${qStr}`);
}

export async function updateSeparationTask(taskId, data) {
  return request(`/separation-tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export default {
  listSeparations,
  getSeparation,
  createSeparation,
  actOnSeparation,
  updateClearanceItem,
  getSeparationTasks,
  listSeparationTasks,
  updateSeparationTask,
};

