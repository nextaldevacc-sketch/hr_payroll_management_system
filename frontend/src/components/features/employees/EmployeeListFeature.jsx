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
import clsx from 'clsx';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import { useVisa } from '../../../context/VisaContext';
import { fetchEmployees, fetchEmployeeMetaOptions } from '../../../services/employeesApi';
import { GlassCard } from '../../primitives/GlassCard';
import { StatusPill } from '../../primitives/StatusPill';
import { Select } from '../../primitives/form/Select';
import { getEnumLabel, getVisaNameAr } from '../../../i18n/enums';

export function EmployeeListFeature() {
  const { user, canAccess } = useAuth();
  const { isRTL, language, t } = useLanguage();
  const { selectedVisaId, setSelectedVisaId } = useVisa();

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [visaFilter, setVisaFilter] = useState(selectedVisaId === 'all' || !selectedVisaId ? '' : selectedVisaId);
  const [nationalityFilter, setNationalityFilter] = useState('');
  const [docStatusFilter, setDocStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  // Sync visaFilter with selectedVisaId from top bar
  useEffect(() => {
    setVisaFilter(selectedVisaId === 'all' || !selectedVisaId ? '' : selectedVisaId);
    setPage(1);
  }, [selectedVisaId]);

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

  const handleVisaChange = (e) => {
    const val = e.target.value;
    setVisaFilter(val);
    setSelectedVisaId(val || 'all');
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setStatusFilter('');
    setDeptFilter('');
    setBranchFilter('');
    setVisaFilter(selectedVisaId === 'all' || !selectedVisaId ? '' : selectedVisaId);
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
    const label = getEnumLabel('document_status', st, isRTL ? 'ar' : 'en');
    switch (st) {
      case 'Valid':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">{label}</span>;
      case 'Expiring Soon':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">{label}</span>;
      case 'Expired':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">{label}</span>;
      case 'Missing Data':
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-500 border border-slate-500/20">{label || (isRTL ? 'بيانات ناقصة' : 'Missing')}</span>;
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
          {canAccess('employees', 'create') && (
            <Link
              href="/employees/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-[var(--on-primary)] hover:bg-primary-hover font-semibold text-sm shadow-md transition-all active:scale-95"
              id="btn-new-employee"
            >
              <UserPlus className="w-4 h-4" />
              <span>{t('employees.newEmployee', 'New Employee')}</span>
            </Link>
          )}
        </div>
      </div>

      {/* 2. Bento Stats Highlights */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassCard className="p-4 border border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-muted">{t('employees.bento.totalFiltered', 'Total Filtered')}</span>
            <Users className="w-4 h-4 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-black text-text" data-i18n-skip>{meta.total}</div>
          <div className="text-[11px] text-text-muted mt-1">
            {user?.roles?.includes('DEPT_MANAGER') ? t('employees.bento.managedTeam', 'Your Managed Team') : t('employees.bento.workforce', 'Workforce Directory')}
          </div>
        </GlassCard>

        <GlassCard className="p-4 border border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-muted">{t('employees.bento.statusCoverage', 'Status Coverage')}</span>
            <Building2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-text" data-i18n-skip>{meta.status_coverage ?? '100%'}</div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
            {t('employees.bento.compliantVisas', 'Compliant UAE Visas')}
          </div>
        </GlassCard>

        <GlassCard className="p-4 border border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-muted">{t('employees.bento.salaryAccess', 'Salary Access')}</span>
            {canSeeSalary ? (
              <CreditCard className="w-4 h-4 text-amber-500" />
            ) : (
              <Lock className="w-4 h-4 text-slate-400" />
            )}
          </div>
          <div className="mt-2 text-xl font-bold text-text">
            {canSeeSalary ? t('employees.bento.statutoryActive', 'Statutory Active') : t('employees.bento.restrictedRole', 'Restricted Role')}
          </div>
          <div className="text-[11px] text-text-muted mt-1">
            {canSeeSalary ? t('employees.bento.payrollHrView', 'Payroll & HR Manager View') : t('employees.bento.privacyEnforced', 'Spec 5.3 Privacy Enforced')}
          </div>
        </GlassCard>

        <GlassCard className="p-4 border border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-muted">{t('employees.bento.docAlerts', 'Document Alerts')}</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-rose-600 dark:text-rose-400" data-i18n-skip>{meta.document_alerts ?? 0}</div>
          <div className="text-[11px] text-text-muted mt-1">{t('employees.bento.daysToExpiry', '≤90 Days to Expiry')}</div>
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

            {/* Quick Filter Tabs / Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                aria-pressed={!statusFilter}
                onClick={() => { setStatusFilter(''); setPage(1); }}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                  !statusFilter ? 'bg-primary text-on-primary' : 'bg-surface-raised dark:bg-inset text-text-muted hover:text-text border border-border'
                )}
              >
                {t('employees.all', 'All')}
              </button>
              <button
                type="button"
                id="filter-pill-pending-verification"
                aria-pressed={statusFilter === 'Pre-Joined'}
                onClick={() => { setStatusFilter('Pre-Joined'); setPage(1); }}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 border',
                  statusFilter === 'Pre-Joined'
                    ? 'bg-amber-500 text-white font-bold border-amber-600'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 border-amber-500/30'
                )}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span>{t('employees.pendingVerification', 'Pending Verification')}</span>
              </button>
              <button
                type="button"
                aria-pressed={statusFilter === 'Active'}
                onClick={() => { setStatusFilter('Active'); setPage(1); }}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                  statusFilter === 'Active' ? 'bg-primary text-on-primary' : 'bg-surface-raised dark:bg-inset text-text-muted hover:text-text border border-border'
                )}
              >
                {t('employees.active', 'Active')}
              </button>

              {isFilterActive && (
                <button
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-text-muted hover:text-text hover:bg-surface-raised transition-all ms-auto"
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
              <Select
                id="filter-status"
                value={statusFilter}
                onChange={handleFilterChange(setStatusFilter)}
                placeholder={t('employees.allStatuses', 'All Statuses')}
                options={[
                  { value: '', label: t('employees.allStatuses', 'All Statuses') },
                  ...(metaOptions?.statuses?.map((st) => ({ value: st, label: st })) || []),
                ]}
              />
            </div>

            {/* Department Filter */}
            <div>
              <Select
                id="filter-department"
                value={deptFilter}
                onChange={handleFilterChange(setDeptFilter)}
                placeholder={t('employees.allDepartments', 'All Departments')}
                options={[
                  { value: '', label: t('employees.allDepartments', 'All Departments') },
                  ...(metaOptions?.departments?.map((d) => ({
                    value: d.id,
                    label: language === 'ar' && d.name_ar ? d.name_ar : d.name,
                  })) || []),
                ]}
              />
            </div>

            {/* Branch Filter */}
            <div>
              <Select
                id="filter-branch"
                value={branchFilter}
                onChange={handleFilterChange(setBranchFilter)}
                placeholder={t('employees.allBranches', 'All Branches')}
                options={[
                  { value: '', label: t('employees.allBranches', 'All Branches') },
                  ...(metaOptions?.branches?.map((b) => ({
                    value: b.id,
                    label: language === 'ar' && b.name_ar ? b.name_ar : b.name,
                  })) || []),
                ]}
              />
            </div>

            {/* Visa Filter */}
            <div>
              <Select
                id="filter-visa"
                value={visaFilter}
                onChange={handleVisaChange}
                placeholder={t('employees.allVisas', 'All Visa Entities')}
                options={[
                  { value: '', label: t('employees.allVisas', 'All Visa Entities') },
                  ...(metaOptions?.visas?.map((v) => ({
                    value: v.id,
                    label: language === 'ar' ? (v.name_ar || getVisaNameAr(v.name)) : v.name,
                  })) || []),
                ]}
              />
            </div>

            {/* Nationality Filter */}
            <div>
              <Select
                id="filter-nationality"
                value={nationalityFilter}
                onChange={handleFilterChange(setNationalityFilter)}
                placeholder={t('employees.allNationalities', 'All Nationalities')}
                options={[
                  { value: '', label: t('employees.allNationalities', 'All Nationalities') },
                  { value: 'Emirati', label: 'Emirati (GPSSA)' },
                  { value: 'Indian', label: 'Indian' },
                  { value: 'Filipino', label: 'Filipino' },
                  { value: 'Egyptian', label: 'Egyptian' },
                  { value: 'British', label: 'British' },
                  { value: 'Pakistani', label: 'Pakistani' },
                ]}
              />
            </div>

            {/* Document Status Filter */}
            <div>
              <Select
                id="filter-doc-status"
                value={docStatusFilter}
                onChange={handleFilterChange(setDocStatusFilter)}
                placeholder={t('employees.allDocumentStatuses', 'All Doc Statuses')}
                options={[
                  { value: '', label: t('employees.allDocumentStatuses', 'All Doc Statuses') },
                  { value: 'Valid', label: 'Valid' },
                  { value: 'Expiring Soon', label: 'Expiring Soon (≤90d)' },
                  { value: 'Expired', label: 'Expired' },
                  { value: 'Missing Data', label: 'Missing Data' },
                ]}
              />
            </div>
          </div>
        </div>
      </GlassCard>

      {/* 4. Employees Data Table */}
      <GlassCard className="p-0 border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto w-full">
          <table className="min-w-[1150px] w-full text-start text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface-raised/40 dark:bg-white/[0.02] text-text-muted font-semibold uppercase tracking-wider text-[11px] whitespace-nowrap">
                <th className="py-3 px-2.5 text-start whitespace-nowrap">{t('employees.code', 'Code')}</th>
                <th className="py-3 px-2.5 text-start whitespace-nowrap">{t('employees.employee', 'Employee')}</th>
                <th className="py-3 px-2.5 text-start whitespace-nowrap">{t('employees.department', 'Department')}</th>
                <th className="py-3 px-2.5 text-start whitespace-nowrap">{t('employees.branch', 'Branch')}</th>
                <th className="py-3 px-2.5 text-start whitespace-nowrap">{t('employees.jobTitle', 'Job Title')}</th>
                <th className="py-3 px-2.5 text-start whitespace-nowrap">{t('employees.status', 'Status')}</th>
                <th className="py-3 px-2.5 text-start whitespace-nowrap">{t('employees.documentStatus', 'UAE Docs')}</th>
                <th className="py-3 px-2.5 text-start whitespace-nowrap">{t('employees.bankAccount', 'Bank Account')}</th>
                {canSeeSalary && (
                  <>
                    <th className="py-3 px-2.5 text-end whitespace-nowrap">{t('employees.basicSalary', 'Basic (AED)')}</th>
                    <th className="py-3 px-2.5 text-end whitespace-nowrap">{t('employees.contractGross', 'Gross (AED)')}</th>
                  </>
                )}
                <th className="py-3 px-2.5 text-center whitespace-nowrap">{t('employees.actions', 'Action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                <tr>
                  <td colSpan={canSeeSalary ? 11 : 9} className="py-12 text-center text-text-muted">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span>Loading employee master records...</span>
                    </div>
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={canSeeSalary ? 11 : 9} className="py-12 text-center text-text-muted">
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
                      <td className="py-2.5 px-2.5 font-mono font-semibold text-primary whitespace-nowrap" data-i18n-skip>
                        <Link href={`/employees/${emp.id}`} className="hover:underline">
                          {emp.employee_code}
                        </Link>
                      </td>

                      {/* Employee Info */}
                      <td className="py-2.5 px-2.5 whitespace-nowrap" data-i18n-skip>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                            {initial}
                          </div>
                          <div>
                            <Link
                              href={`/employees/${emp.id}`}
                              className="font-semibold text-text hover:text-primary transition-colors block text-xs leading-tight"
                              data-i18n-skip
                            >
                              {isRTL && emp.arabic_name ? emp.arabic_name : emp.name}
                            </Link>
                            <span className="text-[10px] text-text-muted block leading-tight mt-0.5" data-i18n-skip>
                              {emp.work_email || emp.nationality || 'Expat'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Department */}
                      <td className="py-2.5 px-2.5 text-text-muted whitespace-nowrap">
                        {(language === 'ar'
                          ? (emp.department?.name_ar || activeContract?.department?.name_ar || emp.department?.name || activeContract?.department?.name)
                          : (emp.department?.name || activeContract?.department?.name)) || '—'}
                      </td>

                      {/* Branch */}
                      <td className="py-2.5 px-2.5 text-text-muted whitespace-nowrap">
                        {(language === 'ar'
                          ? (emp.branch?.name_ar || activeContract?.branch?.name_ar || emp.branch?.name || activeContract?.branch?.name)
                          : (emp.branch?.name || activeContract?.branch?.name)) || '—'}
                      </td>

                      {/* Job Title */}
                      <td className="py-2.5 px-2.5 text-text whitespace-nowrap" data-i18n-skip>
                        {emp.job?.title || activeContract?.job?.title || '—'}
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-2.5 whitespace-nowrap">
                        <StatusPill status={emp.status} variant={getStatusVariant(emp.status)} />
                      </td>

                      {/* UAE Documents Status */}
                      <td className="py-2.5 px-2.5 whitespace-nowrap">
                        {getDocStatusPill(emp.document_status || (docAlertCount > 0 ? 'Expiring Soon' : 'Valid'))}
                      </td>

                      {/* Bank IBAN (Masked) */}
                      <td className="py-2.5 px-2.5 font-mono text-[11px] text-text-muted whitespace-nowrap" data-i18n-skip>
                        {primaryBank?.iban || '—'}
                      </td>

                      {/* Salary Columns (Visible ONLY to statutory salary roles) */}
                      {canSeeSalary && (
                        <>
                          <td className="py-2.5 px-2.5 text-end font-mono text-text whitespace-nowrap" data-i18n-skip>
                            {activeContract?.basic !== undefined
                              ? Number(activeContract.basic).toLocaleString('en-US', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })
                              : '—'}
                          </td>
                          <td className="py-2.5 px-2.5 text-end font-mono font-bold text-text whitespace-nowrap" data-i18n-skip>
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
                      <td className="py-2.5 px-2.5 text-center whitespace-nowrap">
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
              <span>{language === 'ar' ? 'السابق' : 'Previous'}</span>
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
              <span>{language === 'ar' ? 'التالي' : 'Next'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

export default EmployeeListFeature;
