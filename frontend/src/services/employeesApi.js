import { API_BASE as ROOT_API_BASE } from './apiClient.js';

/**
 * Employee API Client
 * Connects Employee List, 7-tab Profile, and Onboarding Wizard to /api/v1/employees/* endpoints.
 */

const API_BASE = `${ROOT_API_BASE}/employees`;

function getHeaders(isMultipart = false) {
  const headers = {};
  if (!isMultipart) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
}

async function handleResponse(res) {
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.message || `API error: ${res.status}`);
    err.status = res.status;
    err.code = data.code;
    err.missing = data.missing;
    throw err;
  }
  return data;
}

export async function fetchEmployees(params = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      searchParams.append(key, val);
    }
  });

  const url = `${API_BASE}?${searchParams.toString()}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: getHeaders(),
    credentials: 'include',
  });

  return handleResponse(res);
}

export async function fetchEmployeeMetaOptions() {
  const res = await fetch(`${API_BASE}/meta/options`, {
    method: 'GET',
    headers: getHeaders(),
    credentials: 'include',
  });
  const json = await handleResponse(res);
  return json.data;
}

export async function fetchEmployeeProfile(id) {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'GET',
    headers: getHeaders(),
    credentials: 'include',
  });
  const json = await handleResponse(res);
  return json.data;
}

export async function createEmployee(data) {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: getHeaders(),
    credentials: 'include',
    body: JSON.stringify(data),
  });
  const json = await handleResponse(res);
  return json.data;
}

export async function updateEmployee(id, data) {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    credentials: 'include',
    body: JSON.stringify(data),
  });
  const json = await handleResponse(res);
  return json.data;
}

export async function updateEmployeeStatus(id, status) {
  const res = await fetch(`${API_BASE}/${id}/status`, {
    method: 'POST',
    headers: getHeaders(),
    credentials: 'include',
    body: JSON.stringify({ status }),
  });
  const json = await handleResponse(res);
  return json.data;
}

export async function verifyEmployee(id, { action, comment }) {
  const res = await fetch(`${API_BASE}/${id}/verify`, {
    method: 'POST',
    headers: getHeaders(),
    credentials: 'include',
    body: JSON.stringify({ action, comment }),
  });
  const json = await handleResponse(res);
  return json.data;
}

export async function fetchActivationCheck(id) {
  const res = await fetch(`${API_BASE}/${id}/activation-check`, {
    method: 'GET',
    headers: getHeaders(),
    credentials: 'include',
  });
  const json = await handleResponse(res);
  return json.data;
}

export async function activateEmployee(id) {
  const res = await fetch(`${API_BASE}/${id}/activate`, {
    method: 'POST',
    headers: getHeaders(),
    credentials: 'include',
  });
  const json = await handleResponse(res);
  return json.data;
}

export async function fetchEmployeeContracts(id) {
  const res = await fetch(`${API_BASE}/${id}/contracts`, {
    method: 'GET',
    headers: getHeaders(),
    credentials: 'include',
  });
  const json = await handleResponse(res);
  return json.data;
}

export async function createContractVersion(id, data) {
  const res = await fetch(`${API_BASE}/${id}/contracts`, {
    method: 'POST',
    headers: getHeaders(),
    credentials: 'include',
    body: JSON.stringify(data),
  });
  const json = await handleResponse(res);
  return json.data;
}

export async function fetchEmployeeBankAccounts(id) {
  const res = await fetch(`${API_BASE}/${id}/bank-accounts`, {
    method: 'GET',
    headers: getHeaders(),
    credentials: 'include',
  });
  const json = await handleResponse(res);
  return json.data;
}

export async function saveBankAccount(id, data) {
  const res = await fetch(`${API_BASE}/${id}/bank-accounts`, {
    method: 'POST',
    headers: getHeaders(),
    credentials: 'include',
    body: JSON.stringify(data),
  });
  const json = await handleResponse(res);
  return json.data;
}

export async function fetchEmployeeDocuments(id) {
  const res = await fetch(`${API_BASE}/${id}/documents`, {
    method: 'GET',
    headers: getHeaders(),
    credentials: 'include',
  });
  const json = await handleResponse(res);
  return json.data;
}

export async function uploadEmployeeDocument(id, formData) {
  const res = await fetch(`${API_BASE}/${id}/documents`, {
    method: 'POST',
    headers: getHeaders(true),
    credentials: 'include',
    body: formData,
  });
  const json = await handleResponse(res);
  return json.data;
}

export async function downloadEmployeeDocument(id, docId, filename = 'document') {
  const res = await fetch(`${API_BASE}/${id}/documents/${docId}/download`, {
    method: 'GET',
    headers: getHeaders(),
    credentials: 'include',
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || `Download failed: ${res.status}`);
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export async function fetchEmployeeAuditHistory(id) {
  const res = await fetch(`${API_BASE}/${id}/audit-history`, {
    method: 'GET',
    headers: getHeaders(),
    credentials: 'include',
  });
  const json = await handleResponse(res);
  return json.data;
}
