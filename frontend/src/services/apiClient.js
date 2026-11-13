/**
 * Base API Client for Nextal HR & Payroll
 * Shared request handler with authentication cookies (credentials: include) and error mapping.
 */

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

export function getHeaders(isMultipart = false) {
  const headers = {};
  if (!isMultipart) {
    headers['Content-Type'] = 'application/json';
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

    if (options.responseType === 'blob') {
      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }
      return await res.blob();
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (res.status === 401 && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('nextal:session-expired'));
      }
      const err = new Error(data.message || `API error: ${res.status}`);
      err.status = res.status;
      err.code = data.code;
      err.missing = data.missing;
      err.errors = data.errors || data.issues || [];
      err.fieldErrors = {};
      if (Array.isArray(err.errors)) {
        err.errors.forEach((e) => {
          if (e.field) err.fieldErrors[e.field] = e.message;
        });
      }
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
