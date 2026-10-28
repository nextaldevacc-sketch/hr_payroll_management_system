/**
 * Base API Client for Nextal HR & Payroll
 * Shared request handler with authentication headers and error mapping.
 */

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export function getHeaders(isMultipart = false) {
  const headers = {};
  if (!isMultipart) {
    headers['Content-Type'] = 'application/json';
  }
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('nextal_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return headers;
}

export async function request(endpoint, options = {}, fallback = null) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        ...getHeaders(options.body instanceof FormData),
        ...(options.headers || {}),
      },
      credentials: 'include',
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const err = new Error(data.message || `API error: ${res.status}`);
      err.status = res.status;
      err.code = data.code;
      err.missing = data.missing;
      throw err;
    }

    return data.data !== undefined ? data.data : data;
  } catch (err) {
    if (fallback !== null && (err.name === 'TypeError' || err.status === 401 || err.status === 403)) {
      console.warn(`[apiClient fallback] ${endpoint}:`, err.message);
      return fallback;
    }
    throw err;
  }
}

export default {
  request,
  getHeaders,
  API_BASE,
};
