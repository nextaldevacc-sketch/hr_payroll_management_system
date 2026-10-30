import { request } from './apiClient.js';

export async function calculateSettlement(separationId, options = {}) {
  return request(`/settlements/calculate/${separationId}`, {
    method: 'POST',
    body: JSON.stringify(options),
  });
}

export async function prepareSettlement(separationId, options = {}) {
  return request(`/settlements/prepare/${separationId}`, {
    method: 'POST',
    body: JSON.stringify(options),
  });
}

export async function getSettlement(id) {
  return request(`/settlements/${id}`);
}

export async function getSettlementBySeparation(separationId) {
  return request(`/settlements/by-separation/${separationId}`);
}

export async function validateSettlement(id) {
  return request(`/settlements/${id}/validate`, {
    method: 'POST',
  });
}

export async function approveSettlement(id) {
  return request(`/settlements/${id}/approve`, {
    method: 'POST',
  });
}

export async function paySettlement(id) {
  return request(`/settlements/${id}/pay`, {
    method: 'POST',
  });
}

export function getSettlementPdfUrl(id) {
  return `/api/v1/settlements/${id}/pdf`;
}

export default {
  calculateSettlement,
  prepareSettlement,
  getSettlement,
  getSettlementBySeparation,
  validateSettlement,
  approveSettlement,
  paySettlement,
  getSettlementPdfUrl,
};

