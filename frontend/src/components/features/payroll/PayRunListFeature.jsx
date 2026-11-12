'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Banknote,
  Plus,
  Calendar,
  AlertCircle,
  FileCheck2,
  Lock,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Building,
  Clock,
  SlidersHorizontal,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useVisa } from '../../../context/VisaContext';
import { useLanguage } from '../../../context/LanguageContext';
import { useAuth } from '../../../hooks/useAuth';
import { fetchPayRuns, createPayRun } from '../../../services/payrollApi';
import { fetchEmployeeMetaOptions } from '../../../services/employeesApi';
import { GlassCard } from '../../primitives/GlassCard';
import { StatusPill } from '../../primitives/StatusPill';
import { Modal } from '../../primitives/Modal';
import { Select } from '../../primitives/form/Select';
import { formatMonthYear, getVisaNameAr } from '../../../i18n/enums';

export function PayRunListFeature() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { visas, selectedVisaId, setSelectedVisaId } = useVisa();
  const { language, isRTL } = useLanguage();
  const { canAccess } = useAuth();

  const [visaFilter, setVisaFilter] = useState(
    selectedVisaId === 'all' || !selectedVisaId ? '' : selectedVisaId
  );
  const [statusFilter, setStatusFilter] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    company_visa_id: (selectedVisaId && selectedVisaId !== 'all') ? selectedVisaId : '',
    period_month: '2026-11-01',
    cutoff_date: '2026-11-25',
    run_type: 'Regular',
  });
  const [createError, setCreateError] = useState('');

  // Sync visaFilter with top bar
  React.useEffect(() => {
    setVisaFilter(selectedVisaId === 'all' || !selectedVisaId ? '' : selectedVisaId);
  }, [selectedVisaId]);

  // Fetch pay runs list
  const { data: payRunsData, isLoading } = useQuery({
    queryKey: ['pay-runs', visaFilter, statusFilter],
    queryFn: () =>
      fetchPayRuns({
        companyVisaId: visaFilter || undefined,
        status: statusFilter || undefined,
        limit: 50,
      }),
  });

  // Fetch company visas for dropdowns (gated to avoid 403 for Finance role)
  const { data: metaOptions } = useQuery({
    queryKey: ['employee-meta-options'],
    queryFn: fetchEmployeeMetaOptions,
    enabled: canAccess('employees', 'view'),
  });
  const availableVisas = metaOptions?.visas || visas || [];

  const payRuns = Array.isArray(payRunsData)
    ? payRunsData
    : payRunsData?.items || [];

  // Create Pay Run Mutation
  const createMutation = useMutation({
    mutationFn: createPayRun,
    onSuccess: (newRun) => {
      queryClient.invalidateQueries(['pay-runs']);
      setIsCreateModalOpen(false);
      setCreateError('');
      if (newRun?.id) {
        router.push(`/payroll/${newRun.id}`);
      }
    },
    onError: (err) => {
      setCreateError(err.message || 'Failed to create pay run');
    },
  });

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!createForm.company_visa_id) {
      setCreateError('Please select a company visa establishment');
      return;
    }
    setCreateError('');
    createMutation.mutate(createForm);
  };

  // Metrics calculations
  const totalEmployees = payRuns.reduce((sum, r) => sum + (r.employee_count || 0), 0);
  const totalDisbursed = payRuns
    .filter((r) => ['Locked', 'Paid'].includes(r.status))
    .reduce((sum, r) => sum + Number(r.total_net || 0), 0);
  const pendingIssuesTotal = payRuns.reduce((sum, r) => sum + (r.issues_count || 0), 0);

  return (
    <div className="space-y-6">
      {/* Page Title & Top Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-text dark:gold-heading tracking-tight">
                {language === 'ar' ? 'مسيرات الرواتب ونظام حماية الأجور (WPS)' : 'Pay Runs & WPS Payroll'}
              </h1>
              <p className="text-xs text-text-muted mt-0.5">
                {language === 'ar' ? 'الحساب القانوني الشامل وإصدار ملفات حماية الأجور المصرفية' : 'مسيرات الرواتب ونظام حماية الأجور • End-to-end statutory calculation & bank SIF file generation'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/payroll/adjustments"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-surface-raised border border-border/80 text-text hover:bg-surface-raised/80 transition-all shadow-sm"
          >
            <SlidersHorizontal className="w-4 h-4 text-primary" />
            <span>{language === 'ar' ? 'تعديلات الرواتب' : 'Salary Adjustments'}</span>
          </Link>
          {canAccess('pay_runs', 'prepare') && (
            <button
              id="btn-open-create-pay-run"
              onClick={() => {
                const defaultVisaId = (selectedVisaId && selectedVisaId !== 'all')
                  ? selectedVisaId
                  : (availableVisas[0]?.id || '');
                setCreateForm((prev) => ({ ...prev, company_visa_id: defaultVisaId }));
                setIsCreateModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-primary text-black hover:opacity-95 transition-all shadow-md active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>{language === 'ar' ? 'إنشاء مسير رواتب' : 'Create Pay Run'}</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-secondary/15 flex items-center justify-center text-secondary shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-text-muted font-medium">{language === 'ar' ? 'تاريخ إغلاق الشهر' : 'Monthly Cut-Off'}</span>
            <div className="text-lg font-bold text-text mt-0.5">{language === 'ar' ? 'اليوم 25 من كل شهر' : '25th of Month'}</div>
            <span className="text-[11px] text-secondary font-semibold">
              {language === 'ar' ? 'الدورة الحالية: ' : 'Active Cycle: '}
              {formatMonthYear(payRuns[0]?.period_month || new Date().toISOString().slice(0, 7), language)}
            </span>
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center text-primary shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-text-muted font-medium">{language === 'ar' ? 'المبالغ المقفلة / المصروفة' : 'Locked / Paid Disbursement'}</span>
            <div className="text-lg font-bold text-text dark:text-gold mt-0.5">
              AED {totalDisbursed.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-text-muted">{language === 'ar' ? 'إجمالي تحويلات نظام حماية الأجور' : 'Total Disbursed WPS'}</span>
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/15 flex items-center justify-center text-blue-500 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-text-muted font-medium">
              {isRTL ? 'مسيرات الرواتب النشطة' : 'Active Pay Runs'}
            </span>
            <div className="text-lg font-bold text-text mt-0.5">{payRuns.length} {isRTL ? 'مسيرات' : 'Runs'}</div>
            <span className="text-[11px] text-blue-400 font-semibold">{totalEmployees} {isRTL ? 'قسيمة راتب إجمالية' : 'Total Payslips'}</span>
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-500 shrink-0">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-text-muted font-medium">
              {language === 'ar' ? 'ملاحظات التدقيق' : 'Validation Issues'}
            </span>
            <div className="text-lg font-bold text-text mt-0.5">
              {language === 'ar'
                ? (pendingIssuesTotal === 1 ? 'تنبيه واحد' : pendingIssuesTotal === 2 ? 'تنبيهان' : (pendingIssuesTotal >= 3 && pendingIssuesTotal <= 10) ? `${pendingIssuesTotal} تنبيهات` : `${pendingIssuesTotal} تنبيهاً`)
                : `${pendingIssuesTotal} Flags`}
            </div>
            <span className="text-[11px] text-amber-500 font-semibold">
              {language === 'ar' ? 'نقص الآيبان والحجوزات' : 'Missing IBANs & Holds'}
            </span>
          </div>
        </GlassCard>
      </div>

      {/* Filter Toolbar */}
      <GlassCard className="p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-raised/80 border border-border/40 text-xs">
            {['', 'Draft', 'Calculated', 'Validated', 'Locked', 'Paid'].map((st) => (
              <button
                key={st}
                aria-pressed={statusFilter === st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  statusFilter === st
                    ? 'bg-primary text-black shadow-sm'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                {language === 'ar'
                  ? ({ '': 'جميع الحالات', Draft: 'مسودة', Calculated: 'تم الحساب', Validated: 'تم التدقيق', Locked: 'مقفل', Paid: 'تم الصرف' }[st] || st)
                  : (st || 'All Statuses')}
              </button>
            ))}
          </div>

          {/* Visa Dropdown Filter */}
          <div className="min-w-[200px]">
            <Select
              value={visaFilter}
              onChange={(e) => {
                const val = e.target.value;
                setVisaFilter(val);
                setSelectedVisaId(val || 'all');
              }}
              placeholder={language === 'ar' ? 'جميع جهات التأشيرات' : 'All Visa Establishments'}
              options={[
                { value: '', label: language === 'ar' ? 'جميع جهات التأشيرات' : 'All Visa Establishments' },
                ...(availableVisas.map((v) => ({
                  value: v.id,
                  label: language === 'ar' ? (v.name_ar || v.name) : v.name,
                  meta: v.mol_establishment_id,
                }))),
              ]}
            />
          </div>
        </div>

        <div className="text-xs text-text-muted">
          Showing <span className="font-bold text-text">{payRuns.length}</span> pay run(s)
        </div>
      </GlassCard>

      {/* Pay Runs Table */}
      <GlassCard className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border/80 bg-surface-raised/50 text-text-muted font-bold tracking-wider uppercase text-[10px]">
                <th className="py-3.5 px-4">{language === 'ar' ? 'شهر الدورة' : 'Period Month'}</th>
                <th className="py-3.5 px-4">{language === 'ar' ? 'جهة التأشيرة' : 'Visa Establishment'}</th>
                <th className="py-3.5 px-4">{language === 'ar' ? 'النوع' : 'Type'}</th>
                <th className="py-3.5 px-4">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                <th className="py-3.5 px-4 text-center">{language === 'ar' ? 'الموظفون' : 'Employees'}</th>
                <th className="py-3.5 px-4 text-right">{language === 'ar' ? 'إجمالي الراتب' : 'Total Gross'}</th>
                <th className="py-3.5 px-4 text-right">{language === 'ar' ? 'الخصومات' : 'Deductions'}</th>
                <th className="py-3.5 px-4 text-right">{language === 'ar' ? 'صافي الأجور (WPS)' : 'Net Pay (WPS)'}</th>
                <th className="py-3.5 px-4 text-center">{language === 'ar' ? 'الملاحظات' : 'Issues'}</th>
                <th className="py-3.5 px-4 text-center">{language === 'ar' ? 'الإجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-text-muted italic">
                    Loading pay runs...
                  </td>
                </tr>
              ) : payRuns.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-text-muted">
                    <Banknote className="w-10 h-10 mx-auto text-text-muted/40 mb-2" />
                    <p className="font-semibold text-text">No pay runs found</p>
                    <p className="text-[11px] mt-0.5">Click &ldquo;Create Pay Run&rdquo; to launch a new payroll cycle.</p>
                  </td>
                </tr>
              ) : (
                payRuns.map((run) => {
                  const monthName = run.period_month
                    ? formatMonthYear(run.period_month, language)
                    : '---';

                  const visaDisplayName = language === 'ar'
                    ? (run.company_visa?.name_ar || getVisaNameAr(run.company_visa?.name) || 'تأشيرة 01')
                    : (run.company_visa?.name || 'Visa 01');

                  return (
                    <tr
                      key={run.id}
                      className="hover:bg-surface-raised/40 transition-colors group cursor-pointer"
                      onClick={() => router.push(`/payroll/${run.id}`)}
                    >
                      <td className="py-3.5 px-4 font-bold text-text group-hover:text-primary transition-colors flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-primary" />
                        {monthName}
                      </td>
                      <td className="py-3.5 px-4 text-text-muted">
                        <span className="font-semibold text-text">{visaDisplayName}</span>
                        <span className="block text-[10px] text-text-muted font-mono">{run.company_visa?.mol_establishment_id}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-surface-raised border border-border/60 text-text">
                          {language === 'ar' ? (run.run_type === 'OffCycle' ? 'دورة استثنائية' : 'دورية') : (run.run_type || 'Regular')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusPill status={run.status} />
                      </td>
                      <td className="py-3.5 px-4 text-center font-semibold text-text">
                        {run.employee_count ?? run._count?.payslips ?? 0}
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-text">
                        AED {Number(run.total_gross || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-red-500">
                        {Number(run.total_deductions || 0) > 0 ? `-AED ${Number(run.total_deductions).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'AED 0.00'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-text dark:text-gold">
                        AED {Number(run.total_net || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {Number(run.issues_count || 0) > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                            <AlertCircle className="w-3 h-3" />
                            {run.issues_count}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-secondary">
                            <FileCheck2 className="w-3.5 h-3.5" /> {language === 'ar' ? 'جاهز' : 'Ready'}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Link
                          href={`/payroll/${run.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold bg-primary/10 text-primary hover:bg-primary hover:text-black transition-all"
                        >
                          {language === 'ar' ? 'عرض المسير' : 'View Run'}
                          <ArrowRight className="w-3 h-3 rtl:-scale-x-100" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Create Pay Run Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Pay Run / إنشاء مسير رواتب جديد"
        subtitle="Initiate a monthly payroll run for a specific company visa establishment"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {createError && (
            <div id="pay-run-create-error" className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{createError}</span>
            </div>
          )}

          <div>
            <Select
              id="create-pay-run-visa"
              label="Visa Establishment / المنشأة"
              required
              placeholder="Select Visa Establishment..."
              value={createForm.company_visa_id}
              onChange={(e) => setCreateForm({ ...createForm, company_visa_id: e.target.value })}
              options={availableVisas.map((v) => ({
                value: v.id,
                label: v.name,
                meta: `${v.mol_establishment_id} · ${v.bank_routing_code}`,
              }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-text mb-1">
                Period Month / الشهر <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="create-pay-run-period"
                required
                value={createForm.period_month}
                onChange={(e) => setCreateForm({ ...createForm, period_month: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-surface-raised border border-border/80 text-text text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-text mb-1">
                Cut-off Date / تاريخ الإغلاق <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="create-pay-run-cutoff"
                required
                value={createForm.cutoff_date}
                onChange={(e) => setCreateForm({ ...createForm, cutoff_date: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-surface-raised border border-border/80 text-text text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>

          <div>
            <Select
              id="create-pay-run-type"
              label="Run Type / نوع المسير"
              value={createForm.run_type}
              onChange={(e) => setCreateForm({ ...createForm, run_type: e.target.value })}
              options={[
                { value: 'Regular', label: 'Regular (End-of-Month Payroll)' },
                { value: 'OffCycle', label: 'Off-Cycle (Ad-hoc / Intermittent)' },
                { value: 'Bonus', label: 'Bonus & Incentive Disbursement' },
              ]}
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
              id="btn-submit-pay-run"
              disabled={createMutation.isPending}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-primary text-black hover:opacity-95 transition-all shadow-md disabled:opacity-50"
            >
              {createMutation.isPending ? 'Creating...' : 'Initialize Draft Run'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
