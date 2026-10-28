import { request, getHeaders, API_BASE } from './apiClient';

/**
 * Pay Runs API
 */
export async function fetchPayRuns(params = {}) {
  const query = new URLSearchParams();
  if (params.companyVisaId) query.set('companyVisaId', params.companyVisaId);
  if (params.periodMonth) query.set('periodMonth', params.periodMonth);
  if (params.status) query.set('status', params.status);
  if (params.limit) query.set('limit', params.limit);
  if (params.offset !== undefined) query.set('offset', params.offset);

  const qs = query.toString();
  return request(`/payroll/runs${qs ? `?${qs}` : ''}`);
}

export async function fetchPayRun(id) {
  return request(`/payroll/runs/${id}`);
}

export async function createPayRun(data) {
  return request('/payroll/runs', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function calculatePayRun(id) {
  return request(`/payroll/runs/${id}/calculate`, {
    method: 'POST',
  });
}

export async function validatePayRun(id) {
  return request(`/payroll/runs/${id}/validate`, {
    method: 'POST',
  });
}

export async function lockPayRun(id) {
  return request(`/payroll/runs/${id}/lock`, {
    method: 'POST',
  });
}

export async function markPayRunPaid(id) {
  return request(`/payroll/runs/${id}/pay`, {
    method: 'POST',
  });
}

export async function fetchPayRunPayslips(id, params = {}) {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.hasVariance) query.set('hasVariance', params.hasVariance);
  if (params.limit) query.set('limit', params.limit);
  if (params.offset !== undefined) query.set('offset', params.offset);

  const qs = query.toString();
  return request(`/payroll/runs/${id}/payslips${qs ? `?${qs}` : ''}`);
}

export async function fetchPayRunIssues(id, params = {}) {
  const query = new URLSearchParams();
  if (params.severity) query.set('severity', params.severity);
  if (params.resolved !== undefined) query.set('resolved', params.resolved);

  const qs = query.toString();
  return request(`/payroll/runs/${id}/issues${qs ? `?${qs}` : ''}`);
}

/**
 * Payslips & Variances API
 */
export async function fetchPayslip(id) {
  return request(`/payroll/payslips/${id}`);
}

export async function updateVarianceReason(payslipId, reason) {
  return request(`/payroll/payslips/${payslipId}/variance`, {
    method: 'PATCH',
    body: JSON.stringify({ reason }),
  });
}

/**
 * Salary Adjustments API (Loans, Advances, Corrections)
 */
export async function fetchSalaryAdjustments(params = {}) {
  const query = new URLSearchParams();
  if (params.employeeId) query.set('employeeId', params.employeeId);
  if (params.type) query.set('type', params.type);
  if (params.status) query.set('status', params.status);
  if (params.limit) query.set('limit', params.limit);
  if (params.offset !== undefined) query.set('offset', params.offset);

  const qs = query.toString();
  return request(`/payroll/adjustments${qs ? `?${qs}` : ''}`);
}

export async function createSalaryAdjustment(data) {
  return request('/payroll/adjustments', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function approveSalaryAdjustment(id) {
  return request(`/payroll/adjustments/${id}/approve`, {
    method: 'POST',
  });
}

export async function rejectSalaryAdjustment(id, reason) {
  return request(`/payroll/adjustments/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

/**
 * File Downloads (Direct browser triggers with auth headers)
 */
async function downloadBlob(url, filename) {
  const res = await fetch(url, {
    headers: getHeaders(),
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Download failed: ${res.status}`);
  }
  const blob = await res.blob();
  const blobUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(blobUrl);
}

export async function downloadWpsSif(payRunId, filename = 'wps_salary_file.sif') {
  return downloadBlob(`${API_BASE}/payroll/runs/${payRunId}/sif`, filename);
}

export async function downloadPayrollRegisterExcel(payRunId, filename = 'payroll_register.xlsx') {
  return downloadBlob(`${API_BASE}/payroll/runs/${payRunId}/reports/register`, filename);
}

export async function downloadVarianceReportExcel(payRunId, filename = 'payroll_variance.xlsx') {
  return downloadBlob(`${API_BASE}/payroll/runs/${payRunId}/reports/variance`, filename);
}

export async function downloadPayslipPdf(payslipId, filename = 'payslip.pdf') {
  return downloadBlob(`${API_BASE}/payroll/payslips/${payslipId}/pdf`, filename);
}
