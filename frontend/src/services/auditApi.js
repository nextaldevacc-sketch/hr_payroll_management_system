import { request, API_BASE } from './apiClient';
import { downloadFile } from './reportsApi';

export async function listAuditLogs(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      query.append(key, val);
    }
  });
  const qs = query.toString() ? `?${query.toString()}` : '';
  return await request(`/audit-logs${qs}`);
}

export async function exportAuditLogsCsv(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      query.append(key, val);
    }
  });
  const qs = query.toString() ? `?${query.toString()}` : '';
  return await downloadFile(`/audit-logs/export.csv${qs}`, 'audit_logs.csv');
}

export default {
  listAuditLogs,
  exportAuditLogsCsv,
};

