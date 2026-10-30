import { request, API_BASE } from './apiClient';

export async function getHeadcountReport(params = {}) {
  const query = new URLSearchParams(params).toString();
  return await request(`/reports/headcount${query ? `?${query}` : ''}`);
}

export async function downloadFile(endpoint, defaultFilename) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('nextal_token') : null;
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Download failed');
  }

  const blob = await res.blob();
  const disposition = res.headers.get('content-disposition');
  let filename = defaultFilename;
  if (disposition && disposition.includes('filename=')) {
    const match = disposition.match(/filename="?([^"]+)"?/);
    if (match && match[1]) filename = match[1];
  }

  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(downloadUrl);
  document.body.removeChild(a);
}

export const reportsApi = {
  getHeadcountReport,
  downloadAttendanceReport: (params) => {
    const qs = new URLSearchParams(params).toString();
    return downloadFile(`/reports/attendance${qs ? `?${qs}` : ''}`, 'attendance_report.xlsx');
  },
  downloadLeaveReport: (params) => {
    const qs = new URLSearchParams(params).toString();
    return downloadFile(`/reports/leave${qs ? `?${qs}` : ''}`, 'leave_report.xlsx');
  },
  downloadHeadcountReport: (params) => {
    const qs = new URLSearchParams(params).toString();
    return downloadFile(`/reports/headcount/download${qs ? `?${qs}` : ''}`, 'headcount_report.xlsx');
  },
  downloadAccountingExport: (payRunId) => {
    return downloadFile(`/reports/accounting-export?payRunId=${payRunId}`, 'accounting_export.csv');
  },
  downloadPayrollRegister: (payRunId) => {
    return downloadFile(`/reports/payroll-register?payRunId=${payRunId}`, 'payroll_register.xlsx');
  },
  downloadVarianceReport: (payRunId) => {
    return downloadFile(`/reports/variance?payRunId=${payRunId}`, 'variance_report.xlsx');
  },
  downloadGratuityProvision: (params) => {
    const qs = new URLSearchParams(params).toString();
    return downloadFile(`/reports/gratuity-provision${qs ? `?${qs}` : ''}`, 'gratuity_provision.xlsx');
  },
  downloadLeaveLiability: (params) => {
    const qs = new URLSearchParams(params).toString();
    return downloadFile(`/reports/leave-liability${qs ? `?${qs}` : ''}`, 'leave_liability.xlsx');
  },
};

export default reportsApi;
