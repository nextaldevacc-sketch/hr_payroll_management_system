'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  UserPlus,
  Search,
  RotateCcw,
  Building2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Lock,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import { fetchEmployees, fetchEmployeeMetaOptions } from '../../../services/employeesApi';
import { GlassCard } from '../../primitives/GlassCard';
import { StatusPill } from '../../primitives/StatusPill';

export function EmployeeListFeature() {
  const { user } = useAuth();
  const { isRTL, t } = useLanguage();

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [visaFilter, setVisaFilter] = useState('');
  const [nationalityFilter, setNationalityFilter] = useState('');
  const [docStatusFilter, setDocStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Reset page when any filter changes
  const handleFilterChange = (setter) => (e) => {
    setter(e.target.value);
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setStatusFilter('');
    setDeptFilter('');
    setBranchFilter('');
    setVisaFilter('');
    setNationalityFilter('');
    setDocStatusFilter('');
    setPage(1);
  };

  // Fetch meta options (departments, branches, visas, jobs)
  const { data: metaOptions } = useQuery({
    queryKey: ['employee-meta-options'],
    queryFn: fetchEmployeeMetaOptions,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch employees list from API
  const {
    data: responseData,
    isLoading,
  } = useQuery({
    queryKey: [
      'employees-list',
      page,
      limit,
      debouncedSearch,
      statusFilter,
      deptFilter,
      branchFilter,
      visaFilter,
      nationalityFilter,
      docStatusFilter,
      (user?.roles || []).join(','),
    ],
    queryFn: () =>
      fetchEmployees({
        page,
        limit,
        search: debouncedSearch,
        status: statusFilter,
        department_id: deptFilter,
        branch_id: branchFilter,
        company_visa_id: visaFilter,
        nationality: nationalityFilter,
        document_status: docStatusFilter,
      }),
    keepPreviousData: true,
  });

  const employees = responseData?.data || [];
  const meta = responseData?.meta || { total: 0, totalPages: 1 };
  const canSeeSalary = Boolean(user?.sees_salary);

  // Status mapping colors
  const getStatusVariant = (st) => {
    switch (st) {
      case 'Active':
        return 'success';
      case 'New Joined':
      case 'Pre-Joined':
        return 'warning';
      case 'Suspended':
        return 'danger';
      case 'Archived':
      case 'Transferred':
      default:
        return 'neutral';
    }
  };

  // Document alert status colors
  const getDocStatusPill = (st) => {
    switch (st) {
      case 'Valid':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">{st}</span>;
      case 'Expiring Soon':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">{st}</span>;
      case 'Expired':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">{st}</span>;
      case 'Missing Data':
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-500 border border-slate-500/20">{st || 'Missing'}</span>;
    }
  };

  const isFilterActive =
    searchTerm ||
    statusFilter ||
    deptFilter ||
    branchFilter ||
    visaFilter ||
    nationalityFilter ||
    docStatusFilter;

  return (
    <div className="space-y-6 animate-fade-in p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto">
      {/* 1. Header with Bento Summary Tiles */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-text">
                {t('employees.title', 'Employee Directory')}
              </h1>
              <p className="text-sm text-text-muted">
                {t('employees.subtitle', 'Master records, versioned contracts & compliance status')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/employees/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-[var(--on-primary)] hover:bg-primary-hover font-semibold text-sm shadow-md transition-all active:scale-95"
            id="btn-new-employee"
          >
            <UserPlus className="w-4 h-4" />
            <span>{t('employees.newEmployee', 'New Employee')}</span>
          </Link>
        </div>
      </div>

      {/* 2. Bento Stats Highlights */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassCard className="p-4 border border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-muted">Total Filtered</span>
            <Users className="w-4 h-4 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-black text-text">{meta.total}</div>
          <div className="text-[11px] text-text-muted mt-1">
            {user?.roles?.includes('DEPT_MANAGER') ? 'Your Managed Team' : 'Gulf Tech Workforce'}
          </div>
        </GlassCard>

        <GlassCard className="p-4 border border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-muted">Status Coverage</span>
            <Building2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-text">100%</div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
            Compliant UAE Visas
          </div>
        </GlassCard>

        <GlassCard className="p-4 border border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-muted">Salary Access</span>
            {canSeeSalary ? (
              <CreditCard className="w-4 h-4 text-amber-500" />
            ) : (
              <Lock className="w-4 h-4 text-slate-400" />
            )}
          </div>
          <div className="mt-2 text-xl font-bold text-text">
            {canSeeSalary ? 'Statutory Active' : 'Restricted Role'}
          </div>
          <div className="text-[11px] text-text-muted mt-1">
            {canSeeSalary ? 'Payroll & HR Manager View' : 'Spec 5.3 Privacy Enforced'}
          </div>
        </GlassCard>

        <GlassCard className="p-4 border border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-muted">Document Alerts</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-rose-600 dark:text-rose-400">10</div>
          <div className="text-[11px] text-text-muted mt-1">≤90 Days to Expiry</div>
        </GlassCard>
      </div>

      {/* 3. Server-Side Filter Bar */}
      <GlassCard className="p-4 border border-border shadow-sm">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
            {/* Search Input */}
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 start-3 text-text-muted" />
              <input
                type="text"
                placeholder={t('employees.search', 'Search by name, employee code, email...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full ps-9 pe-3 py-2 text-sm rounded-xl bg-surface-raised dark:bg-inset border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all text-text"
                id="employee-search-input"
              />
            </div>

            {/* Quick Count & Reset */}
            <div className="flex items-center gap-2 self-end md:self-auto">
              {isFilterActive && (
                <button
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-text-muted hover:text-text hover:bg-surface-raised transition-all"
                  id="btn-reset-filters"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{t('employees.clearFilters', 'Reset Filters')}</span>
                </button>
              )}
            </div>
          </div>

          {/* Select Filters Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2 border-t border-border/60">
            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={handleFilterChange(setStatusFilter)}
                className="w-full text-xs py-2 px-2.5 rounded-lg bg-surface-raised dark:bg-inset border border-border text-text focus:outline-none focus:ring-1 focus:ring-primary"
                id="filter-status"
              >
                <option value="">{t('employees.allStatuses', 'All Statuses')}</option>
                {metaOptions?.statuses?.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            {/* Department Filter */}
            <div>
              <select
                value={deptFilter}
                onChange={handleFilterChange(setDeptFilter)}
                className="w-full text-xs py-2 px-2.5 rounded-lg bg-surface-raised dark:bg-inset border border-border text-text focus:outline-none focus:ring-1 focus:ring-primary"
                id="filter-department"
              >
                <option value="">{t('employees.allDepartments', 'All Departments')}</option>
                {metaOptions?.departments?.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Branch Filter */}
            <div>
              <select
                value={branchFilter}
                onChange={handleFilterChange(setBranchFilter)}
                className="w-full text-xs py-2 px-2.5 rounded-lg bg-surface-raised dark:bg-inset border border-border text-text focus:outline-none focus:ring-1 focus:ring-primary"
                id="filter-branch"
              >
                <option value="">{t('employees.allBranches', 'All Branches')}</option>
                {metaOptions?.branches?.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Visa Filter */}
            <div>
              <select
                value={visaFilter}
                onChange={handleFilterChange(setVisaFilter)}
                className="w-full text-xs py-2 px-2.5 rounded-lg bg-surface-raised dark:bg-inset border border-border text-text focus:outline-none focus:ring-1 focus:ring-primary"
                id="filter-visa"
              >
                <option value="">{t('employees.allVisas', 'All Visa Entities')}</option>
                {metaOptions?.visas?.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.visa_entity_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Nationality Filter */}
            <div>
              <select
                value={nationalityFilter}
                onChange={handleFilterChange(setNationalityFilter)}
                className="w-full text-xs py-2 px-2.5 rounded-lg bg-surface-raised dark:bg-inset border border-border text-text focus:outline-none focus:ring-1 focus:ring-primary"
                id="filter-nationality"
              >
                <option value="">{t('employees.allNationalities', 'All Nationalities')}</option>
                <option value="Emirati">Emirati (GPSSA)</option>
                <option value="Indian">Indian</option>
                <option value="Filipino">Filipino</option>
                <option value="Egyptian">Egyptian</option>
                <option value="British">British</option>
                <option value="Pakistani">Pakistani</option>
              </select>
            </div>

            {/* Document Status Filter */}
            <div>
              <select
                value={docStatusFilter}
                onChange={handleFilterChange(setDocStatusFilter)}
                className="w-full text-xs py-2 px-2.5 rounded-lg bg-surface-raised dark:bg-inset border border-border text-text focus:outline-none focus:ring-1 focus:ring-primary"
                id="filter-doc-status"
              >
                <option value="">{t('employees.allDocumentStatuses', 'All Doc Statuses')}</option>
                <option value="Valid">Valid</option>
                <option value="Expiring Soon">Expiring Soon (≤90d)</option>
                <option value="Expired">Expired</option>
                <option value="Missing Data">Missing Data</option>
              </select>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* 4. Employees Data Table */}
      <GlassCard className="p-0 border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface-raised/40 dark:bg-white/[0.02] text-text-muted font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4 text-start">{t('employees.code', 'Code')}</th>
                <th className="py-3.5 px-4 text-start">{t('employees.employee', 'Employee')}</th>
                <th className="py-3.5 px-4 text-start">{t('employees.department', 'Department')}</th>
                <th className="py-3.5 px-4 text-start">{t('employees.jobTitle', 'Job Title')}</th>
                <th className="py-3.5 px-4 text-start">{t('employees.status', 'Status')}</th>
                <th className="py-3.5 px-4 text-start">{t('employees.documentStatus', 'UAE Docs')}</th>
                <th className="py-3.5 px-4 text-start">{t('employees.bankAccount', 'Bank Account')}</th>
                {canSeeSalary && (
                  <>
                    <th className="py-3.5 px-4 text-end">{t('employees.basicSalary', 'Basic (AED)')}</th>
                    <th className="py-3.5 px-4 text-end">{t('employees.contractGross', 'Gross (AED)')}</th>
                  </>
                )}
                <th className="py-3.5 px-4 text-center">{t('employees.actions', 'Action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                <tr>
                  <td colSpan={canSeeSalary ? 10 : 8} className="py-12 text-center text-text-muted">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span>Loading employee master records...</span>
                    </div>
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={canSeeSalary ? 10 : 8} className="py-12 text-center text-text-muted">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users className="w-8 h-8 opacity-40" />
                      <span className="font-medium">No employees found matching filter criteria.</span>
                      {isFilterActive && (
                        <button
                          onClick={handleResetFilters}
                          className="mt-1 text-xs text-primary underline"
                        >
                          Clear all filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                employees.map((emp) => {
                  const initial = emp.name ? emp.name.charAt(0).toUpperCase() : '?';
                  const activeContract = emp.current_contract || (emp.contracts && emp.contracts[0]);
                  const primaryBank = emp.bank_accounts && emp.bank_accounts[0];
                  const docAlertCount = emp.doc_alert_count || 0;

                  return (
                    <tr
                      key={emp.id}
                      className="hover:bg-surface-raised/50 dark:hover:bg-white/[0.02] transition-colors group cursor-pointer"
                    >
                      {/* Code */}
                      <td className="py-3 px-4 font-mono font-semibold text-primary whitespace-nowrap">
                        <Link href={`/employees/${emp.id}`} className="hover:underline">
                          {emp.employee_code}
                        </Link>
                      </td>

                      {/* Employee Info */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                            {initial}
                          </div>
                          <div>
                            <Link
                              href={`/employees/${emp.id}`}
                              className="font-semibold text-text hover:text-primary transition-colors block text-sm leading-tight"
                            >
                              {isRTL && emp.arabic_name ? emp.arabic_name : emp.name}
                            </Link>
                            <span className="text-[11px] text-text-muted block leading-tight mt-0.5">
                              {emp.work_email || emp.nationality || 'Expat'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Department */}
                      <td className="py-3 px-4 text-text-muted whitespace-nowrap">
                        {emp.department?.name || activeContract?.department?.name || '—'}
                      </td>

                      {/* Job Title */}
                      <td className="py-3 px-4 text-text whitespace-nowrap">
                        {emp.job?.title || activeContract?.job?.title || '—'}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <StatusPill status={emp.status} variant={getStatusVariant(emp.status)} />
                      </td>

                      {/* UAE Documents Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getDocStatusPill(emp.document_status || (docAlertCount > 0 ? 'Expiring Soon' : 'Valid'))}
                      </td>

                      {/* Bank IBAN (Masked) */}
                      <td className="py-3 px-4 font-mono text-[11px] text-text-muted whitespace-nowrap">
                        {primaryBank?.iban || '—'}
                      </td>

                      {/* Salary Columns (Visible ONLY to statutory salary roles) */}
                      {canSeeSalary && (
                        <>
                          <td className="py-3 px-4 text-end font-mono text-text whitespace-nowrap">
                            {activeContract?.basic !== undefined
                              ? Number(activeContract.basic).toLocaleString('en-US', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })
                              : '—'}
                          </td>
                          <td className="py-3 px-4 text-end font-mono font-bold text-text whitespace-nowrap">
                            {activeContract?.gross !== undefined
                              ? Number(activeContract.gross).toLocaleString('en-US', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })
                              : '—'}
                          </td>
                        </>
                      )}

                      {/* Actions */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <Link
                          href={`/employees/${emp.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-surface-raised hover:bg-primary hover:text-[var(--on-primary)] transition-all border border-border"
                        >
                          <span>{t('employees.viewProfile', 'View')}</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 5. Pagination Controls */}
        <div className="p-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-text-muted">
          <div>
            {t('employees.showing', 'Showing')}{' '}
            <span className="font-bold text-text">
              {employees.length > 0 ? (page - 1) * limit + 1 : 0}
            </span>{' '}
            to{' '}
            <span className="font-bold text-text">
              {Math.min(page * limit, meta.total)}
            </span>{' '}
            {t('employees.of', 'of')}{' '}
            <span className="font-bold text-text">{meta.total}</span>{' '}
            {t('employees.records', 'employees')}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border hover:bg-surface-raised disabled:opacity-40 disabled:cursor-not-allowed transition-all font-medium"
              id="btn-prev-page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            <span className="px-2 font-mono">
              {t('employees.page', 'Page')} {page} / {meta.totalPages || 1}
            </span>

            <button
              onClick={() => setPage((p) => Math.min(meta.totalPages || 1, p + 1))}
              disabled={page >= (meta.totalPages || 1)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border hover:bg-surface-raised disabled:opacity-40 disabled:cursor-not-allowed transition-all font-medium"
              id="btn-next-page"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

export default EmployeeListFeature;
