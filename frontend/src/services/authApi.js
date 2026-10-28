/**
 * Authentication API Service
 */
import { request } from './apiClient.js';

export async function login(email, password) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function logout() {
  return request('/auth/logout', {
    method: 'POST',
  });
}

export async function fetchCurrentUser() {
  return request('/auth/me', {
    method: 'GET',
  });
}

export default {
  login,
  logout,
  fetchCurrentUser,
};
