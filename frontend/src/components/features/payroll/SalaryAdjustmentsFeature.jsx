'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  SlidersHorizontal,
  Plus,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Building,
  UserCheck,
  TrendingDown,
  DollarSign,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchSalaryAdjustments,
  createSalaryAdjustment,
  approveSalaryAdjustment,
  rejectSalaryAdjustment,
} from '../../../services/payrollApi';
import { fetchEmployees } from '../../../services/employeesApi';
import { GlassCard } from '../../primitives/GlassCard';
import { StatusPill } from '../../primitives/StatusPill';
import { Modal } from '../../primitives/Modal';
import { Select } from '../../primitives/form/Select';
import { useLanguage } from '../../../context/LanguageContext';

export function SalaryAdjustmentsFeature() {
  const queryClient = useQueryClient();
  const { language } = useLanguage();

  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    employee_id: '',
    type: 'Loan',
    total_amount: '',
    monthly_amount: '',
    start_month: '2026-11-01',
    reason: '',
  });
  const [createError, setCreateError] = useState('');

  // Fetch adjustments
  const { data: adjustmentsData, isLoading } = useQuery({
    queryKey: ['salary-adjustments', typeFilter, statusFilter],
    queryFn: () =>
      fetchSalaryAdjustments({
        type: typeFilter || undefined,
        status: statusFilter || undefined,
        limit: 100,
      }),
  });

  // Fetch employees for create modal dropdown
  const { data: employeesData } = useQuery({
    queryKey: ['employees-picker'],
    queryFn: () => fetchEmployees({ limit: 100 }),
  });

  const adjustments = Array.isArray(adjustmentsData)
    ? adjustmentsData
    : adjustmentsData?.items || [];
  const employees = employeesData?.employees || [];

  // Mutations
  const createMutation = useMutation({
    mutationFn: createSalaryAdjustment,
    onSuccess: () => {
      queryClient.invalidateQueries(['salary-adjustments']);
      setIsCreateModalOpen(false);
      setCreateForm({
        employee_id: '',
        type: 'Loan',
        total_amount: '',
        monthly_amount: '',
        start_month: '2026-11-01',
        reason: '',
      });
      setCreateError('');
    },
    onError: (err) => {
      setCreateError(err.message || 'Failed to create adjustment');
    },
  });

  const approveMutation = useMutation({
    mutationFn: approveSalaryAdjustment,
    onSuccess: () => {
      queryClient.invalidateQueries(['salary-adjustments']);
    },
    onError: (err) => {
      alert(`Approval error: ${err.message}`);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }) => rejectSalaryAdjustment(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries(['salary-adjustments']);
    },
    onError: (err) => {
      alert(`Rejection error: ${err.message}`);
    },
  });

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!createForm.employee_id) {
      setCreateError('Please select an employee');
      return;
    }
    if (!createForm.total_amount || Number(createForm.total_amount) <= 0) {
      setCreateError('Total amount must be greater than zero');
      return;
    }
    setCreateError('');
    createMutation.mutate({
      ...createForm,
      total_amount: Number(createForm.total_amount),
      monthly_amount: Number(createForm.monthly_amount || createForm.total_amount),
    });
  };

  // Metrics
  const activeLoans = adjustments.filter((a) => a.type === 'Loan' && ['Approved', 'Active'].includes(a.status));
  const loanBalanceTotal = activeLoans.reduce((sum, a) => sum + Number(a.balance || 0), 0);
  const pendingCount = adjustments.filter((a) => a.status === 'Pending').length;

  return (
    <div className="space-y-6">
      {/* Title & Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href="/payroll"
              className="p-2 rounded-xl bg-surface-raised border border-border text-text-muted hover:text-text transition-colors"
              title="Return to Pay Runs"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-2xl font-black text-text dark:gold-heading tracking-tight">
                {language === 'ar' ? 'تعديلات الرواتب والقروض' : 'Salary Adjustments & Loans'}
              </h1>
              <p className="text-xs text-text-muted mt-0.5">
                {language === 'ar' ? 'سلف وقروض الموظفين وأقساط الخصم الشهرية والتسويات' : 'سلف وقروض الموظفين • Scheduled monthly instalment deductions, advances, and payroll corrections'}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            if (employees.length && !createForm.employee_id) {
              setCreateForm((prev) => ({ ...prev, employee_id: employees[0].id }));
            }
            setIsCreateModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-primary text-black hover:opacity-95 transition-all shadow-md active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>{language === 'ar' ? 'إضافة تسوية جديدة' : 'Create Adjustment'}</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <GlassCard className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center text-primary shrink-0">
            <SlidersHorizontal className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-text-muted font-medium">{language === 'ar' ? 'سلف وقروض الموظفين النشطة' : 'Active Company Loans'}</span>
            <div className="text-lg font-bold text-text mt-0.5">{activeLoans.length} {language === 'ar' ? 'سلفة' : 'Loans'}</div>
            <span className="text-[11px] text-primary font-semibold">{language === 'ar' ? 'مجدولة في مسير الرواتب' : 'Scheduled in Payroll'}</span>
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-secondary/15 flex items-center justify-center text-secondary shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-text-muted font-medium">{language === 'ar' ? 'الرصيد المتبقي للقروض' : 'Outstanding Loan Balance'}</span>
            <div className="text-lg font-bold text-text dark:text-gold mt-0.5">
              AED {loanBalanceTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-text-muted">{language === 'ar' ? 'رصيد قابل للتحصيل' : 'Recoverable balance'}</span>
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-500 shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-text-muted font-medium">{language === 'ar' ? 'طلبات بانتظار الاعتماد' : 'Pending Approvals'}</span>
            <div className="text-lg font-bold text-text mt-0.5">{pendingCount} {language === 'ar' ? 'طلب' : 'Requests'}</div>
            <span className="text-[11px] text-amber-500 font-semibold">{language === 'ar' ? 'بانتظار توقيع المدير' : 'Awaiting Manager Signoff'}</span>
          </div>
        </GlassCard>
      </div>

      {/* Filter Bar */}
      <GlassCard className="p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Type Filter */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-raised/80 border border-border/40 text-xs">
            {['', 'Loan', 'Advance', 'Correction'].map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  typeFilter === t
                    ? 'bg-primary text-black shadow-sm'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                {t
                  ? (language === 'ar' ? ({ Loan: 'قرض', Advance: 'سلفة', Correction: 'تسوية' }[t] || t) : t)
                  : (language === 'ar' ? 'جميع الأنواع' : 'All Types')}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="min-w-[160px]">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              placeholder={language === 'ar' ? 'جميع الحالات' : 'All Statuses'}
              options={[
                { value: '', label: language === 'ar' ? 'جميع الحالات' : 'All Statuses' },
                { value: 'Pending', label: language === 'ar' ? 'قيد الموافقة' : 'Pending Approval' },
                { value: 'Approved', label: language === 'ar' ? 'معتمد' : 'Approved' },
                { value: 'Active', label: language === 'ar' ? 'نشط / قيد الخصم' : 'Active Deducting' },
                { value: 'Completed', label: language === 'ar' ? 'مكتمل' : 'Completed' },
                { value: 'Rejected', label: language === 'ar' ? 'مرفوض' : 'Rejected' },
              ]}
            />
          </div>
        </div>

        <div className="text-xs text-text-muted">
          Found <strong className="text-text">{adjustments.length}</strong> record(s)
        </div>
      </GlassCard>

      {/* Adjustments Table */}
      <GlassCard className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border/80 bg-surface-raised/50 text-text-muted font-bold tracking-wider uppercase text-[10px]">
                <th className="py-3.5 px-4">{language === 'ar' ? 'الموظف' : 'Employee'}</th>
                <th className="py-3.5 px-4">{language === 'ar' ? 'النوع' : 'Type'}</th>
                <th className="py-3.5 px-4 text-right">{language === 'ar' ? 'إجمالي المبلغ' : 'Total Amount'}</th>
                <th className="py-3.5 px-4 text-right">{language === 'ar' ? 'الخصم الشهري' : 'Monthly Deduction'}</th>
                <th className="py-3.5 px-4 text-right">{language === 'ar' ? 'الرصيد المتبقي' : 'Remaining Balance'}</th>
                <th className="py-3.5 px-4">{language === 'ar' ? 'شهر البدء' : 'Start Month'}</th>
                <th className="py-3.5 px-4">{language === 'ar' ? 'السبب / الملاحظات' : 'Reason / Notes'}</th>
                <th className="py-3.5 px-4 text-center">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                <th className="py-3.5 px-4 text-right">{language === 'ar' ? 'الإجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-text-muted italic">
                    Loading salary adjustments...
                  </td>
                </tr>
              ) : adjustments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-text-muted">
                    <SlidersHorizontal className="w-10 h-10 mx-auto text-text-muted/40 mb-2" />
                    <p className="font-semibold text-text">No salary adjustments found</p>
                    <p className="text-[11px] mt-0.5">Click &ldquo;Create Adjustment&rdquo; to add a loan or advance.</p>
                  </td>
                </tr>
              ) : (
                adjustments.map((adj) => {
                  const emp = adj.employee || {};
                  const startMonthStr = adj.start_month
                    ? new Date(adj.start_month).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
                    : '---';

                  return (
                    <tr key={adj.id} className="hover:bg-surface-raised/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-text">{emp.name || '---'}</span>
                        <span className="block text-[10px] text-text-muted font-mono">{emp.employee_code}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          adj.type === 'Loan'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : adj.type === 'Advance'
                            ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                            : 'bg-primary/10 text-primary border border-primary/20'
                        }`}>
                          {adj.type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-text">
                        AED {Number(adj.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-red-500">
                        -AED {Number(adj.monthly_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-text dark:text-gold">
                        AED {Number(adj.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-text-muted">{startMonthStr}</td>
                      <td className="py-3.5 px-4 text-text-muted max-w-xs truncate" title={adj.reason}>
                        {adj.reason || '---'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <StatusPill status={adj.status} />
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {adj.status === 'Pending' ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => approveMutation.mutate(adj.id)}
                              disabled={approveMutation.isPending}
                              className="px-2 py-1 rounded-lg text-[11px] font-bold bg-secondary text-white hover:opacity-90 transition-all shadow-sm"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                const r = prompt('Enter rejection reason:');
                                if (r) rejectMutation.mutate({ id: adj.id, reason: r });
                              }}
                              disabled={rejectMutation.isPending}
                              className="px-2 py-1 rounded-lg text-[11px] font-bold bg-surface-raised border border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white transition-all"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-text-muted italic">Locked</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Create Adjustment Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Salary Adjustment / تسوية راتب أو سلفة"
        subtitle="Schedule a recurring loan recovery or one-time advance deduction"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {createError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{createError}</span>
            </div>
          )}

          <div>
            <Select
              label="Employee / الموظف"
              required
              placeholder="Select Employee..."
              value={createForm.employee_id}
              onChange={(e) => setCreateForm({ ...createForm, employee_id: e.target.value })}
              options={employees.map((emp) => ({
                value: emp.id,
                label: `${emp.name} (${emp.employee_code})`,
                meta: emp.department?.name || 'Operations',
              }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Select
                label="Adjustment Type / النوع"
                value={createForm.type}
                onChange={(e) => setCreateForm({ ...createForm, type: e.target.value })}
                options={[
                  { value: 'Loan', label: 'Company Loan' },
                  { value: 'Advance', label: 'Salary Advance' },
                  { value: 'Correction', label: 'Payroll Correction' },
                ]}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-text mb-1">
                Start Month / شهر البداية <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={createForm.start_month}
                onChange={(e) => setCreateForm({ ...createForm, start_month: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-surface-raised border border-border/80 text-text text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-text mb-1">
                Total Amount (AED) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="1"
                required
                placeholder="e.g. 5000.00"
                value={createForm.total_amount}
                onChange={(e) => setCreateForm({ ...createForm, total_amount: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-surface-raised border border-border/80 text-text text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-text mb-1">
                Monthly Instalment (AED)
              </label>
              <input
                type="number"
                step="0.01"
                min="1"
                placeholder="e.g. 500.00"
                value={createForm.monthly_amount}
                onChange={(e) => setCreateForm({ ...createForm, monthly_amount: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-surface-raised border border-border/80 text-text text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-text mb-1">Reason / Notes / السبب</label>
            <textarea
              rows={2}
              placeholder="e.g. Emergency medical advance, personal home renovation loan..."
              value={createForm.reason}
              onChange={(e) => setCreateForm({ ...createForm, reason: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-surface-raised border border-border/80 text-text text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <div className="pt-3 border-t border-border/60 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-text-muted hover:text-text"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-primary text-black hover:opacity-95 transition-all shadow-md disabled:opacity-50"
            >
              {createMutation.isPending ? 'Submitting...' : 'Submit Adjustment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
