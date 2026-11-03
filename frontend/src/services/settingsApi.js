/**
 * Settings API Client
 * Connects TanStack Query hooks and drawers directly to /api/v1/settings/* endpoints.
 * Fallbacks to settingsData.js for offline dev resilience.
 */

import {
  INITIAL_COMPANY_PROFILE,
  INITIAL_BRANCHES,
  INITIAL_DEPARTMENTS,
  INITIAL_JOBS,
  INITIAL_SHIFTS,
  INITIAL_ATTENDANCE_POLICY,
  INITIAL_LEAVE_TYPES,
  INITIAL_HOLIDAYS_2026,
  INITIAL_SALARY_RULES,
  INITIAL_APPROVAL_FLOWS,
  INITIAL_PAYROLL_ALERTS,
} from '../components/features/settings/settingsData.js';

import { API_BASE as ROOT_API_BASE } from './apiClient.js';

const API_BASE = `${ROOT_API_BASE}/settings`;

function getHeaders() {
  return { 'Content-Type': 'application/json' };
}

async function request(endpoint, options = {}, fallback = null) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        ...getHeaders(),
        ...(options.headers || {}),
      },
      credentials: 'include',
    });

    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data.message || `API error: ${res.status}`);
      err.status = res.status;
      err.code = data.code;
      throw err;
    }

    return data.data !== undefined ? data.data : data;
  } catch (err) {
    if (fallback !== null && (err.name === 'TypeError' || err.status === 401 || err.status === 403)) {
      console.warn(`[SettingsAPI fallback] ${endpoint}:`, err.message);
      return fallback;
    }
    throw err;
  }
}

// 1. Overview
export async function fetchSettingsOverview() {
  return request('/overview', { method: 'GET' }, null);
}

// 2. Company Profile & Visas
export async function fetchCompanyProfile() {
  const data = await request('/company', { method: 'GET' }, INITIAL_COMPANY_PROFILE);
  return data;
}

export async function updateCompanyProfile(payload) {
  return request('/company', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function createCompanyVisa(payload) {
  return request('/visas', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateCompanyVisa(id, payload) {
  return request(`/visas/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteCompanyVisa(id) {
  return request(`/visas/${id}`, { method: 'DELETE' });
}

// 3. Branches
export async function fetchBranches() {
  const data = await request('/branches', { method: 'GET' }, INITIAL_BRANCHES);
  return Array.isArray(data) ? data : INITIAL_BRANCHES;
}

export async function createBranch(payload) {
  return request('/branches', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateBranch(id, payload) {
  return request(`/branches/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteBranch(id) {
  return request(`/branches/${id}`, { method: 'DELETE' });
}

// 4. Departments & Jobs
export async function fetchDepartments() {
  const data = await request('/departments', { method: 'GET' }, INITIAL_DEPARTMENTS);
  return Array.isArray(data) ? data : INITIAL_DEPARTMENTS;
}

export async function createDepartment(payload) {
  return request('/departments', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateDepartment(id, payload) {
  return request(`/departments/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteDepartment(id) {
  return request(`/departments/${id}`, { method: 'DELETE' });
}

export async function fetchJobs() {
  const data = await request('/jobs', { method: 'GET' }, INITIAL_JOBS);
  return Array.isArray(data) ? data : INITIAL_JOBS;
}

export async function createJob(payload) {
  return request('/jobs', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateJob(id, payload) {
  return request(`/jobs/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteJob(id) {
  return request(`/jobs/${id}`, { method: 'DELETE' });
}

// 5. Shifts & Attendance Policies
export async function fetchShifts() {
  const data = await request('/shifts', { method: 'GET' }, []);
  return Array.isArray(data) ? data : [];
}

export async function createShift(payload) {
  return request('/shifts', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateShift(id, payload) {
  return request(`/shifts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteShift(id) {
  return request(`/shifts/${id}`, { method: 'DELETE' });
}

export async function fetchAttendancePolicies() {
  const data = await request('/attendance-policies', { method: 'GET' }, [INITIAL_ATTENDANCE_POLICY]);
  return Array.isArray(data) ? data : [INITIAL_ATTENDANCE_POLICY];
}

export async function updateAttendancePolicy(id, payload) {
  return request(`/attendance-policies/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

// 6. Leave Types & Accruals
export async function fetchLeaveTypes() {
  const data = await request('/leave-types', { method: 'GET' }, INITIAL_LEAVE_TYPES);
  return Array.isArray(data) ? data : INITIAL_LEAVE_TYPES;
}

export async function createLeaveType(payload) {
  return request('/leave-types', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateLeaveType(id, payload) {
  return request(`/leave-types/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteLeaveType(id) {
  return request(`/leave-types/${id}`, { method: 'DELETE' });
}

export async function createAccrualPlan(payload) {
  return request('/accrual-plans', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// 7. Public Holidays
export async function fetchHolidays(year = 2026) {
  const data = await request(`/holidays?year=${year}`, { method: 'GET' }, INITIAL_HOLIDAYS_2026);
  return Array.isArray(data) ? data : INITIAL_HOLIDAYS_2026;
}

export async function createHoliday(payload) {
  return request('/holidays', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateHoliday(id, payload) {
  return request(`/holidays/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteHoliday(id) {
  return request(`/holidays/${id}`, { method: 'DELETE' });
}

// 8. Salary Rules & Structures
export async function fetchSalaryRules() {
  const data = await request('/salary-rules', { method: 'GET' }, INITIAL_SALARY_RULES);
  return Array.isArray(data) ? data : INITIAL_SALARY_RULES;
}

export async function fetchSalaryStructures() {
  return request('/salary-structures', { method: 'GET' }, []);
}

export async function createSalaryRule(payload) {
  return request('/salary-rules', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateSalaryRule(id, payload) {
  return request(`/salary-rules/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteSalaryRule(id) {
  return request(`/salary-rules/${id}`, { method: 'DELETE' });
}

export async function testSalaryRules(payload) {
  return request('/salary-rules/test', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// 9. Approval Flows
export async function fetchApprovalFlows() {
  const data = await request('/approval-flows', { method: 'GET' }, INITIAL_APPROVAL_FLOWS);
  return Array.isArray(data) ? data : INITIAL_APPROVAL_FLOWS;
}

export async function updateApprovalFlow(id, payload) {
  return request(`/approval-flows/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

// 10. Payroll Alerts
export async function fetchPayrollAlerts() {
  const data = await request('/payroll-alerts', { method: 'GET' }, INITIAL_PAYROLL_ALERTS);
  return data || INITIAL_PAYROLL_ALERTS;
}

export async function updatePayrollAlerts(payload) {
  return request('/payroll-alerts', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

// 11. Version History & Defaults
export async function fetchVersionHistory(entityType, entityId) {
  return request(`/versions/${entityType}/${entityId}`, { method: 'GET' }, []);
}

export async function fetchDefaultsDiff(section) {
  return request(`/defaults-diff/${section}`, { method: 'GET' }, null);
}

export async function resetDefaults(section) {
  return request(`/reset-defaults/${section}`, { method: 'POST' }, null);
}

// 12. Support Access (FR-PL3)
export async function fetchSupportGrants() {
  return request('/support-access', { method: 'GET' }, []);
}

export async function createSupportGrant(payload) {
  return request('/support-access', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function revokeSupportGrant(id) {
  return request(`/support-access/${id}`, {
    method: 'DELETE',
  });
}
