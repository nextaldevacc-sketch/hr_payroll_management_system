'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Banknote,
  ArrowLeft,
  Calculator,
  CheckCircle2,
  Lock,
  DollarSign,
  Download,
  AlertTriangle,
  AlertCircle,
  FileSpreadsheet,
  FileText,
  Search,
  Building,
  UserCheck,
  ShieldCheck,
  Calendar,
  Clock,
  ChevronRight,
  ExternalLink,
  Save,
  Check,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchPayRun,
  calculatePayRun,
  validatePayRun,
  lockPayRun,
  markPayRunPaid,
  fetchPayRunPayslips,
  fetchPayRunIssues,
  updateVarianceReason,
  downloadWpsSif,
  downloadPayrollRegisterExcel,
  downloadVarianceReportExcel,
  downloadPayslipPdf,
} from '../../../services/payrollApi';
import { GlassCard } from '../../primitives/GlassCard';
import { StatusPill } from '../../primitives/StatusPill';
import { Stepper } from '../../primitives/Stepper';
import { PayslipModal } from './PayslipModal';
import { useLanguage } from '../../../context/LanguageContext';

export function PayRunDetailFeature() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { language } = useLanguage();
  const payRunId = params?.id;

  const [activeTab, setActiveTab] = useState('summary');
  const [payslipSearch, setPayslipSearch] = useState('');
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [isPayslipModalOpen, setIsPayslipModalOpen] = useState(false);
  const [editingVarianceId, setEditingVarianceId] = useState(null);
  const [varianceReasonText, setVarianceReasonText] = useState('');
  const [actionMessage, setActionMessage] = useState({ type: '', text: '' });

  // Fetch pay run header & summary
  const {
    data: payRun,
    isLoading: isRunLoading,
    refetch: refetchRun,
  } = useQuery({
    queryKey: ['pay-run', payRunId],
    queryFn: () => fetchPayRun(payRunId),
    enabled: !!payRunId,
  });

  // Fetch payslips for this run
  const { data: payslipsData, isLoading: isPayslipsLoading, refetch: refetchPayslips } = useQuery({
    queryKey: ['pay-run-payslips', payRunId, payslipSearch],
    queryFn: () =>
      fetchPayRunPayslips(payRunId, {
        search: payslipSearch || undefined,
        limit: 100,
      }),
    enabled: !!payRunId && (activeTab === 'payslips' || activeTab === 'variances'),
  });

  // Fetch issues for this run
  const { data: issuesData, isLoading: isIssuesLoading } = useQuery({
    queryKey: ['pay-run-issues', payRunId],
    queryFn: () => fetchPayRunIssues(payRunId),
    enabled: !!payRunId && (activeTab === 'validation' || activeTab === 'summary'),
  });

  const payslips = Array.isArray(payslipsData)
    ? payslipsData
    : payslipsData?.items || [];
  const issues = Array.isArray(issuesData) ? issuesData : [];

  const blockingIssues = issues.filter((i) => i.severity === 'Blocking' && !i.resolved_at);
  const warningIssues = issues.filter((i) => i.severity === 'Warning' && !i.resolved_at);
  const variancePayslips = payslips.filter(
    (p) => p.variance_pct && Math.abs(Number(p.variance_pct)) >= 10.0
  );

  // Mutations
  const calcMutation = useMutation({
    mutationFn: () => calculatePayRun(payRunId),
    onSuccess: () => {
      setActionMessage({ type: 'success', text: 'Pay run calculation engine executed successfully.' });
      queryClient.invalidateQueries(['pay-run', payRunId]);
      queryClient.invalidateQueries(['pay-run-payslips', payRunId]);
      queryClient.invalidateQueries(['pay-run-issues', payRunId]);
    },
    onError: (err) => {
      setActionMessage({ type: 'error', text: err.message || 'Calculation failed' });
    },
  });

  const validateMutation = useMutation({
    mutationFn: () => validatePayRun(payRunId),
    onSuccess: () => {
      setActionMessage({ type: 'success', text: 'Pay run validated. All statutory requirements checked.' });
      queryClient.invalidateQueries(['pay-run', payRunId]);
    },
    onError: (err) => {
      setActionMessage({ type: 'error', text: err.message || 'Validation failed' });
    },
  });

  const lockMutation = useMutation({
    mutationFn: () => lockPayRun(payRunId),
    onSuccess: () => {
      setActionMessage({ type: 'success', text: 'Pay run has been locked. PostgreSQL triggers now protect payslip lines.' });
      queryClient.invalidateQueries(['pay-run', payRunId]);
    },
    onError: (err) => {
      setActionMessage({ type: 'error', text: err.message || 'Locking failed' });
    },
  });

  const payMutation = useMutation({
    mutationFn: () => markPayRunPaid(payRunId),
    onSuccess: () => {
      setActionMessage({ type: 'success', text: 'Pay run marked as Paid. Bank disbursement confirmed.' });
      queryClient.invalidateQueries(['pay-run', payRunId]);
    },
    onError: (err) => {
      setActionMessage({ type: 'error', text: err.message || 'Payment update failed' });
    },
  });

  const varianceMutation = useMutation({
    mutationFn: ({ payslipId, reason }) => updateVarianceReason(payslipId, reason),
    onSuccess: () => {
      setEditingVarianceId(null);
      setVarianceReasonText('');
      queryClient.invalidateQueries(['pay-run-payslips', payRunId]);
      queryClient.invalidateQueries(['pay-run', payRunId]);
      setActionMessage({ type: 'success', text: 'Variance justification saved.' });
    },
    onError: (err) => {
      setActionMessage({ type: 'error', text: err.message || 'Failed to save variance reason' });
    },
  });

  const handleOpenPayslipModal = (ps) => {
    setSelectedPayslip({ ...ps, pay_run: payRun });
    setIsPayslipModalOpen(true);
  };

  const handleSaveVariance = (payslipId) => {
    if (!varianceReasonText.trim()) return;
    varianceMutation.mutate({ payslipId, reason: varianceReasonText.trim() });
  };

  if (isRunLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-xs text-text-muted">Loading Pay Run details...</p>
        </div>
      </div>
    );
  }

  if (!payRun) {
    return (
      <div className="p-8 text-center glass-card rounded-2xl">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-text">Pay run not found</h2>
        <p className="text-xs text-text-muted mt-1">The requested pay run ID could not be located.</p>
        <Link href="/payroll" className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-black">
          <ArrowLeft className="w-4 h-4" /> Return to Pay Runs
        </Link>
      </div>
    );
  }

  const periodName = payRun.period_month
    ? new Date(payRun.period_month).toLocaleDateString(language === 'ar' ? 'ar-AE' : 'en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    : (language === 'ar' ? 'أكتوبر 2026' : 'October 2026');

  const isLockedOrPaid = ['Locked', 'Paid'].includes(payRun.status);

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/payroll"
          className="inline-flex items-center gap-2 text-xs font-semibold text-text-muted hover:text-text transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{language === 'ar' ? 'العودة إلى مسيرات الرواتب' : 'Back to Pay Runs'}</span>
        </Link>
        <span className="text-[11px] text-text-muted font-mono" data-i18n-skip>ID: PR-{payRun?.id ? String(payRun.id).slice(-6).toUpperCase() : '---'}</span>
      </div>

      {/* Main Header Banner */}
      <GlassCard className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-black text-text dark:gold-heading tracking-tight">
                {language === 'ar' ? `مسير رواتب ${periodName}` : `${periodName} Pay Run`}
              </h1>
              <StatusPill status={payRun.status} />
              <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-surface-raised border border-border text-text-muted">
                {payRun.run_type || 'Regular'}
              </span>
            </div>
            <p className="text-xs text-text-muted flex items-center gap-2">
              <Building className="w-3.5 h-3.5 text-primary" />
              <span>{language === 'ar' ? (payRun.company_visa?.name_ar || payRun.company_visa?.name || 'MOHRE Dubai') : (payRun.company_visa?.name || 'MOHRE Dubai')}</span>
              &bull;
              <span>MOL ID: <strong className="text-text font-mono">{payRun.company_visa?.mol_establishment_id}</strong></span>
              &bull;
              <span>Cut-Off: <strong>{new Date(payRun.cutoff_date).toLocaleDateString('en-GB')}</strong></span>
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Calculation Button */}
            {!isLockedOrPaid && (
              <button
                onClick={() => calcMutation.mutate()}
                disabled={calcMutation.isPending}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-surface-raised border border-border text-text hover:bg-surface-raised/80 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                title={language === 'ar' ? 'تنفيذ 17 قاعدة راتب نظامية والتناسبات' : 'Execute 17 statutory salary rules and prorations'}
              >
                <Calculator className="w-4 h-4 text-primary" />
                {calcMutation.isPending ? (language === 'ar' ? 'جارٍ الحساب...' : 'Calculating...') : (language === 'ar' ? 'حساب المسيرة' : 'Calculate Run')}
              </button>
            )}

            {/* Validation Button */}
            {payRun.status === 'Calculated' && (
              <button
                onClick={() => validateMutation.mutate()}
                disabled={validateMutation.isPending}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-sm active:scale-95 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                {validateMutation.isPending ? (language === 'ar' ? 'جارٍ التحقق...' : 'Validating...') : (language === 'ar' ? 'اعتماد المسيرة' : 'Validate Run')}
              </button>
            )}

            {/* Lock Button */}
            {payRun.status === 'Validated' && (
              <button
                onClick={() => lockMutation.mutate()}
                disabled={lockMutation.isPending || blockingIssues.length > 0}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 text-black hover:bg-amber-400 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                title={blockingIssues.length > 0 ? (language === 'ar' ? 'يجب حل المشكلات المعطلة أولاً' : 'Resolve blocking issues first') : (language === 'ar' ? 'إقفال مسيرة الرواتب لمنع التعديلات' : 'Lock pay run to prevent modifications')}
              >
                <Lock className="w-4 h-4" />
                {lockMutation.isPending ? (language === 'ar' ? 'جارٍ الإقفال...' : 'Locking...') : (language === 'ar' ? 'إقفال المسيرة' : 'Lock Pay Run')}
              </button>
            )}

            {/* Mark as Paid Button */}
            {payRun.status === 'Locked' && (
              <button
                onClick={() => payMutation.mutate()}
                disabled={payMutation.isPending}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-secondary text-white hover:bg-secondary/90 transition-all shadow-sm active:scale-95 disabled:opacity-50"
              >
                <DollarSign className="w-4 h-4" />
                {payMutation.isPending ? (language === 'ar' ? 'جارٍ المعالجة...' : 'Processing...') : (language === 'ar' ? 'تحديد كمدفوع' : 'Mark as Paid')}
              </button>
            )}

            {/* Export Dropdown / Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => downloadWpsSif(payRun.id, `wps-${payRun.company_visa?.mol_establishment_id || 'sif'}.sif`)}
                disabled={!isLockedOrPaid}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                  isLockedOrPaid
                    ? 'bg-primary text-black hover:opacity-90 active:scale-95'
                    : 'bg-surface-raised border border-border text-text-muted opacity-50 cursor-not-allowed'
                }`}
                title={!isLockedOrPaid ? 'SIF generation requires Locked status' : 'Download UAE WPS SIF file'}
              >
                <Download className="w-4 h-4" />
                <span>{language === 'ar' ? 'تصدير ملف WPS SIF' : 'Export WPS SIF'}</span>
              </button>

              <button
                onClick={() => downloadPayrollRegisterExcel(payRun.id)}
                className="p-2 rounded-xl bg-surface-raised border border-border text-text-muted hover:text-text hover:bg-surface-raised/80 transition-all shadow-sm"
                title="Download Payroll Register (Excel)"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
              </button>

              <button
                onClick={() => downloadVarianceReportExcel(payRun.id)}
                className="p-2 rounded-xl bg-surface-raised border border-border text-text-muted hover:text-text hover:bg-surface-raised/80 transition-all shadow-sm"
                title="Download Variance Report (Excel)"
              >
                <FileText className="w-4 h-4 text-primary" />
              </button>
            </div>
          </div>
        </div>

        {/* Status Stepper Progression */}
        <div className="mt-6 pt-5 border-t border-border/60">
          <Stepper
            steps={['Draft', 'Calculated', 'Validated', 'Locked', 'Paid']}
            currentStep={payRun.status}
          />
        </div>
      </GlassCard>

      {/* Action Notice */}
      {actionMessage.text && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between gap-3 ${
            actionMessage.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
              : 'bg-red-500/10 border border-red-500/30 text-red-400'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === 'success' ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span>{actionMessage.text}</span>
          </div>
          <button onClick={() => setActionMessage({ type: '', text: '' })} className="hover:opacity-75">
            &times;
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border/60 pb-1 text-xs font-bold overflow-x-auto max-w-full">
        {[
          { key: 'summary', label: language === 'ar' ? 'الملخص والمؤشرات' : 'Summary & KPIs', icon: Banknote },
          {
            key: 'validation',
            label: language === 'ar' ? `الملاحظات (${issues.length})` : `Validation Issues (${issues.length})`,
            icon: AlertCircle,
            badge: blockingIssues.length > 0 ? (language === 'ar' ? `${blockingIssues.length} معطلة` : `${blockingIssues.length} Blocking`) : null,
          },
          { key: 'payslips', label: language === 'ar' ? `قسائم الرواتب (${payRun.employee_count || 0})` : `Payslips (${payRun.employee_count || 0})`, icon: FileText },
          {
            key: 'variances',
            label: language === 'ar' ? `الفروقات (${variancePayslips.length})` : `Variances > ${payRun.variance_threshold_pct || payRun.company?.variance_threshold_pct || 10}% (${variancePayslips.length})`,
            icon: AlertTriangle,
            badge: payRun.pending_variance_count > 0 ? (language === 'ar' ? `${payRun.pending_variance_count} معلقة` : `${payRun.pending_variance_count} Pending`) : null,
          },
          { key: 'audit', label: language === 'ar' ? 'الاعتماد والتدقيق' : 'Signoff & Audit', icon: ShieldCheck },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
                isActive
                  ? 'bg-primary text-black shadow-md'
                  : 'text-text-muted hover:text-text hover:bg-surface-raised/60'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${
                  isActive ? 'bg-black text-white' : 'bg-red-500 text-white'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: SUMMARY */}
      {/* ========================================================================= */}
      {activeTab === 'summary' && (
        <div className="space-y-6">
          {/* Bento Headline Figures */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <GlassCard className="p-5">
              <span className="text-xs uppercase tracking-wider text-text-muted font-bold">Total Headcount</span>
              <div className="text-3xl font-black text-text mt-2">{payRun.employee_count || 0}</div>
              <span className="text-[11px] text-text-muted mt-1 block">Active under establishment</span>
            </GlassCard>

            <GlassCard className="p-5">
              <span className="text-xs uppercase tracking-wider text-text-muted font-bold">Total Gross Earnings</span>
              <div className="text-3xl font-black text-secondary mt-2">
                AED {Number(payRun.total_gross || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-[11px] text-text-muted mt-1 block">Basic + HRA + Transport + OT</span>
            </GlassCard>

            <GlassCard className="p-5">
              <span className="text-xs uppercase tracking-wider text-text-muted font-bold">Total Deductions</span>
              <div className="text-3xl font-black text-red-500 mt-2">
                AED {Number(payRun.total_deductions || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-[11px] text-text-muted mt-1 block">Loans, Advances & Pension</span>
            </GlassCard>

            <GlassCard className="p-5 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/30">
              <span className="text-xs uppercase tracking-wider text-primary font-bold">Net WPS Disbursement</span>
              <div className="text-3xl font-black text-text dark:text-gold mt-2">
                AED {Number(payRun.total_net || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-[11px] text-primary/80 mt-1 block font-semibold">Strict SIF Checksum Parity</span>
            </GlassCard>
          </div>

          {/* Quick Status / Guidance Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Blocking issues card */}
            <GlassCard className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text flex items-center gap-1.5">
                  <AlertCircle className={`w-4 h-4 ${blockingIssues.length > 0 ? 'text-red-500' : 'text-secondary'}`} />
                  Pre-Run Validation
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  blockingIssues.length > 0 ? 'bg-red-500/10 text-red-500' : 'bg-secondary/10 text-secondary'
                }`}>
                  {blockingIssues.length > 0 ? `${blockingIssues.length} Blocking` : 'Passed'}
                </span>
              </div>
              <p className="text-xs text-text-muted">
                {blockingIssues.length > 0
                  ? 'There are critical errors (missing IBANs or negative salaries) preventing this run from locking.'
                  : 'All employee bank accounts and salary inputs satisfy statutory requirements.'}
              </p>
              <button
                onClick={() => setActiveTab('validation')}
                className="text-xs font-bold text-primary flex items-center gap-1 hover:underline"
              >
                <span>{language === 'ar' ? 'فحص الملاحظات' : 'Inspect Issues'}</span> <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </GlassCard>

            {/* Variances card */}
            <GlassCard className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text flex items-center gap-1.5">
                  <AlertTriangle className={`w-4 h-4 ${payRun.pending_variance_count > 0 ? 'text-amber-500' : 'text-secondary'}`} />
                  Variance Threshold (10%)
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  payRun.pending_variance_count > 0 ? 'bg-amber-500/10 text-amber-500' : 'bg-secondary/10 text-secondary'
                }`}>
                  {payRun.pending_variance_count > 0 ? `${payRun.pending_variance_count} Unjustified` : 'Clear'}
                </span>
              </div>
              <p className="text-xs text-text-muted">
                {payRun.pending_variance_count > 0
                  ? 'Employees with net salary variance > 10% vs last month require justification notes before validation.'
                  : 'All salary changes are either within threshold or have documented explanations.'}
              </p>
              <button
                onClick={() => setActiveTab('variances')}
                className="text-xs font-bold text-primary flex items-center gap-1 hover:underline"
              >
                <span>{language === 'ar' ? 'مراجعة الفروقات' : 'Review Variances'}</span> <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </GlassCard>

            {/* Compliance / WPS card */}
            <GlassCard className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  MOHRE WPS Compliance
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                  Dual-Currency Ready
                </span>
              </div>
              <p className="text-xs text-text-muted">
                WPS SIF generator strictly verifies <code className="text-primary font-mono text-[11px]">SCR.totalSalaries === sum(EDR.net)</code> and formats 13-digit fixed widths.
              </p>
              <button
                onClick={() => isLockedOrPaid && downloadWpsSif(payRun.id)}
                disabled={!isLockedOrPaid}
                className="text-xs font-bold text-primary flex items-center gap-1 hover:underline disabled:opacity-40"
              >
                <span>
                  {isLockedOrPaid
                    ? (language === 'ar' ? 'تنزيل ملف SIF' : 'Download SIF File')
                    : (language === 'ar' ? 'يتطلب الإقفال لتفعيل التحميل' : 'Locks to enable SIF')}
                </span>{' '}
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </GlassCard>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: VALIDATION ISSUES */}
      {/* ========================================================================= */}
      {activeTab === 'validation' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs">
            <p className="text-text-muted">
              Pre-run validation identifies missing bank details, unconfirmed attendance holds, and negative salary conditions.
            </p>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-red-500/10 text-red-500 border border-red-500/20">
                {blockingIssues.length} Blocking (Prevents Lock)
              </span>
              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                {warningIssues.length} Warnings (Held inputs)
              </span>
            </div>
          </div>

          <GlassCard className="overflow-hidden p-0">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border/80 bg-surface-raised/50 text-text-muted font-bold tracking-wider uppercase text-[10px]">
                  <th className="py-3 px-4">{language === 'ar' ? 'الخطورة' : 'Severity'}</th>
                  <th className="py-3 px-4">{language === 'ar' ? 'رمز الملاحظة' : 'Issue Code'}</th>
                  <th className="py-3 px-4">{language === 'ar' ? 'الموظف' : 'Employee'}</th>
                  <th className="py-3 px-4">{language === 'ar' ? 'الوصف' : 'Issue Description'}</th>
                  <th className="py-3 px-4">{language === 'ar' ? 'الإجراء / الحل' : 'Action / Resolution'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {issues.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-text-muted">
                      <CheckCircle2 className="w-8 h-8 text-secondary mx-auto mb-2" />
                      <p className="font-bold text-text">No validation issues found</p>
                      <p className="text-[11px]">All employee inputs are complete and ready for sign-off.</p>
                    </td>
                  </tr>
                ) : (
                  issues.map((iss) => (
                    <tr key={iss.id} className="hover:bg-surface-raised/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            iss.severity === 'Blocking'
                              ? 'bg-red-500/15 text-red-500 border border-red-500/30'
                              : 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                          }`}
                        >
                          {iss.severity}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-text">{iss.issue_code}</td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-text">{iss.employee?.name || 'General Run'}</span>
                        {iss.employee?.employee_code && (
                          <span className="block text-[10px] text-text-muted font-mono">{iss.employee.employee_code}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-text-muted max-w-md">{iss.message}</td>
                      <td className="py-3.5 px-4 text-[11px] font-medium text-text">
                        {iss.issue_code === 'MISSING_IBAN' && (
                          <span className="text-red-400">Add primary UAE IBAN in Employee Master</span>
                        )}
                        {iss.issue_code === 'UNCONFIRMED_ATTENDANCE_HELD' && (
                          <span className="text-amber-400">Days held for next month&apos;s inputs</span>
                        )}
                        {iss.issue_code === 'VARIANCE_EXCEEDED_THRESHOLD' && (
                          <button
                            onClick={() => setActiveTab('variances')}
                            className="text-primary underline font-bold"
                          >
                            Enter explanation in Variances tab
                          </button>
                        )}
                        {!['MISSING_IBAN', 'UNCONFIRMED_ATTENDANCE_HELD', 'VARIANCE_EXCEEDED_THRESHOLD'].includes(iss.issue_code) && (
                          <span className="text-text-muted">Review employee profile</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </GlassCard>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PAYSLIPS */}
      {/* ========================================================================= */}
      {activeTab === 'payslips' && (
        <div className="space-y-4">
          <GlassCard className="p-3 flex items-center justify-between gap-4">
            <div className="relative w-full max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Search by employee name or code..."
                value={payslipSearch}
                onChange={(e) => setPayslipSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-surface-raised border border-border/80 text-text focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div className="text-xs text-text-muted">
              Total Payslips: <strong className="text-text">{payslips.length}</strong>
            </div>
          </GlassCard>

          <GlassCard className="overflow-hidden p-0">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border/80 bg-surface-raised/50 text-text-muted font-bold tracking-wider uppercase text-[10px]">
                  <th className="py-3 px-4">{language === 'ar' ? 'الرمز' : 'Code'}</th>
                  <th className="py-3 px-4">{language === 'ar' ? 'الموظف' : 'Employee'}</th>
                  <th className="py-3 px-4">{language === 'ar' ? 'القسم' : 'Department'}</th>
                  <th className="py-3 px-4 text-right">{language === 'ar' ? 'الأساسي' : 'Basic'}</th>
                  <th className="py-3 px-4 text-right">{language === 'ar' ? 'الإجمالي' : 'Gross'}</th>
                  <th className="py-3 px-4 text-right">{language === 'ar' ? 'الاستقطاعات' : 'Deductions'}</th>
                  <th className="py-3 px-4 text-right">{language === 'ar' ? 'صافي الراتب' : 'Net Pay'} (AED)</th>
                  <th className="py-3 px-4 text-center">{language === 'ar' ? 'الفرق' : 'Variance'}</th>
                  <th className="py-3 px-4 text-center">{language === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {isPayslipsLoading ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-text-muted italic">
                      Loading payslips...
                    </td>
                  </tr>
                ) : payslips.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-text-muted">
                      No payslips found for this search criteria.
                    </td>
                  </tr>
                ) : (
                  payslips.map((ps) => {
                    const emp = ps.employee || {};
                    const vPct = ps.variance_pct ? Number(ps.variance_pct) : 0;
                    const isHighVariance = Math.abs(vPct) >= 10.0;

                    return (
                      <tr key={ps.id} className="hover:bg-surface-raised/30 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-text">{emp.employee_code || '---'}</td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-text" data-i18n-skip>
                            {language === 'ar' ? (emp.arabic_name || emp.name) : emp.name}
                          </span>
                          {emp.arabic_name && (
                            <span className="block text-[10px] text-text-muted font-arabic">{emp.arabic_name}</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-text-muted">{emp.department?.name || 'Operations'}</td>
                        <td className="py-3.5 px-4 text-right font-medium text-text">
                          {Number(ps.basic || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 text-right font-semibold text-secondary">
                          {Number(ps.gross || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 text-right font-medium text-red-500">
                          {Number(ps.total_deductions || 0) > 0 ? `-${Number(ps.total_deductions).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '0.00'}
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-text dark:text-gold">
                          {Number(ps.net || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {isHighVariance ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                              {vPct > 0 ? '+' : ''}{vPct.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-[11px] text-text-muted">
                              {vPct !== 0 ? `${vPct > 0 ? '+' : ''}${vPct.toFixed(1)}%` : '0.0%'}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenPayslipModal(ps)}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-surface-raised border border-border hover:bg-primary hover:text-black transition-all"
                            >
                              {language === 'ar' ? 'تفاصيل' : 'Breakdown'}
                            </button>
                            <button
                              onClick={() => downloadPayslipPdf(ps.id, `payslip-${emp.employee_code}.pdf`)}
                              className="p-1 rounded-lg text-text-muted hover:text-primary transition-colors"
                              title="Download PDF Payslip"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </GlassCard>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: VARIANCES REVIEW (> 10%) */}
      {/* ========================================================================= */}
      {activeTab === 'variances' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-text flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-500 text-sm">Monthly Variance Control (Threshold: 10%)</p>
              <p className="text-text-muted mt-0.5">
                In compliance with statutory audit controls, any employee whose net disbursement deviates by more than 10% compared to the prior period requires a documented justification before this pay run can be validated.
              </p>
            </div>
          </div>

          <GlassCard className="overflow-hidden p-0">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border/80 bg-surface-raised/50 text-text-muted font-bold tracking-wider uppercase text-[10px]">
                  <th className="py-3 px-4">{language === 'ar' ? 'الموظف' : 'Employee'}</th>
                  <th className="py-3 px-4 text-right">{language === 'ar' ? 'الصافي السابق' : 'Previous Net'}</th>
                  <th className="py-3 px-4 text-right">{language === 'ar' ? 'الصافي الحالي' : 'Current Net'}</th>
                  <th className="py-3 px-4 text-right">{language === 'ar' ? 'الفرق' : 'Difference'}</th>
                  <th className="py-3 px-4 text-center">{language === 'ar' ? 'نسبة الفرق %' : 'Variance %'}</th>
                  <th className="py-3 px-4">{language === 'ar' ? 'سبب التبرير' : 'Justification Reason'}</th>
                  <th className="py-3 px-4 text-center">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {variancePayslips.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-text-muted">
                      <CheckCircle2 className="w-8 h-8 text-secondary mx-auto mb-2" />
                      <p className="font-bold text-text">No significant variances flagged</p>
                      <p className="text-[11px]">All employee net salaries are within the 10% threshold.</p>
                    </td>
                  </tr>
                ) : (
                  variancePayslips.map((ps) => {
                    const emp = ps.employee || {};
                    const prevNet = Number(ps.previous_net || 0);
                    const currNet = Number(ps.net || 0);
                    const diff = currNet - prevNet;
                    const vPct = Number(ps.variance_pct || 0);
                    const isEditing = editingVarianceId === ps.id;

                    return (
                      <tr key={ps.id} className="hover:bg-surface-raised/30 transition-colors">
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-text" data-i18n-skip>
                            {language === 'ar' ? (emp.arabic_name || emp.name) : emp.name}
                          </span>
                          <span className="block text-[10px] text-text-muted font-mono">{emp.employee_code}</span>
                        </td>
                        <td className="py-3.5 px-4 text-right text-text-muted font-medium">
                          AED {prevNet.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-text dark:text-gold">
                          AED {currNet.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-text">
                          {diff > 0 ? `+AED ${diff.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `-AED ${Math.abs(diff).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/15 text-amber-500 border border-amber-500/30">
                            {vPct > 0 ? '+' : ''}{vPct.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-3.5 px-4 max-w-sm">
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                autoFocus
                                value={varianceReasonText}
                                onChange={(e) => setVarianceReasonText(e.target.value)}
                                placeholder="Enter justification (e.g. Approved Overtime, Contract Raise)..."
                                className="w-full px-2.5 py-1 text-xs rounded-lg bg-surface-raised border border-primary text-text focus:outline-none"
                              />
                              <button
                                onClick={() => handleSaveVariance(ps.id)}
                                disabled={varianceMutation.isPending}
                                className="p-1 rounded-lg bg-primary text-black hover:opacity-90 transition-all shrink-0"
                                title="Save"
                              >
                                <Save className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setEditingVarianceId(null)}
                                className="p-1 text-text-muted hover:text-text shrink-0"
                              >
                                &times;
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-2">
                              <span className={ps.variance_reason ? 'text-text font-medium' : 'text-text-muted italic'}>
                                {ps.variance_reason || 'No justification entered yet.'}
                              </span>
                              {!isLockedOrPaid && (
                                <button
                                  onClick={() => {
                                    setEditingVarianceId(ps.id);
                                    setVarianceReasonText(ps.variance_reason || '');
                                  }}
                                  className="text-[11px] font-bold text-primary hover:underline shrink-0"
                                >
                                  {ps.variance_reason ? (language === 'ar' ? 'تعديل' : 'Edit') : (language === 'ar' ? 'تبرير' : 'Justify')}
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {ps.variance_reason ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-secondary font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Justified
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-amber-500 font-bold">
                              <AlertTriangle className="w-3.5 h-3.5" /> Required
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </GlassCard>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: SIGNOFF & AUDIT */}
      {/* ========================================================================= */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <GlassCard className="p-6">
            <h3 className="text-sm font-bold text-text dark:gold-heading mb-4 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              Pay Run Execution & Signoff Log
            </h3>

            <div className="space-y-4 text-xs">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-surface-raised/40 border border-border/40">
                <Calendar className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-text">Draft Initialization</p>
                  <p className="text-text-muted mt-0.5">Pay run created for period {periodName} under visa {payRun.company_visa?.name}.</p>
                  <span className="text-[10px] text-text-muted font-mono">{new Date(payRun.created_at).toLocaleString('en-GB')}</span>
                </div>
              </div>

              {payRun.calculated_at && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-surface-raised/40 border border-border/40">
                  <Calculator className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-text">Payroll Engine Calculated</p>
                    <p className="text-text-muted mt-0.5">Evaluated all 17 statutory salary rules, biometric attendance, and overtime inputs.</p>
                    <span className="text-[10px] text-text-muted font-mono">{new Date(payRun.calculated_at).toLocaleString('en-GB')}</span>
                  </div>
                </div>
              )}

              {payRun.validated_at && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-surface-raised/40 border border-border/40">
                  <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-text">Pre-Run Validation Completed</p>
                    <p className="text-text-muted mt-0.5">Validated by {payRun.validator?.employee?.name || payRun.validator?.email || 'HR Manager'}.</p>
                    <span className="text-[10px] text-text-muted font-mono">{new Date(payRun.validated_at).toLocaleString('en-GB')}</span>
                  </div>
                </div>
              )}

              {payRun.locked_at && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-surface-raised/40 border border-border/40">
                  <Lock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-text">Pay Run Locked (PostgreSQL Trigger Protected)</p>
                    <p className="text-text-muted mt-0.5">Locked by {payRun.locker?.employee?.name || payRun.locker?.email || 'Finance Manager'}. Modifications blocked.</p>
                    <span className="text-[10px] text-text-muted font-mono">{new Date(payRun.locked_at).toLocaleString('en-GB')}</span>
                  </div>
                </div>
              )}

              {payRun.paid_at && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-surface-raised/40 border border-border/40">
                  <DollarSign className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-text">WPS Disbursement Dispatched</p>
                    <p className="text-text-muted mt-0.5">Final payment dispatched to central bank via WPS routing code {payRun.company_visa?.bank_routing_code}.</p>
                    <span className="text-[10px] text-text-muted font-mono">{new Date(payRun.paid_at).toLocaleString('en-GB')}</span>
                  </div>
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      )}

      {/* Payslip View Modal */}
      {selectedPayslip && (
        <PayslipModal
          isOpen={isPayslipModalOpen}
          onClose={() => {
            setIsPayslipModalOpen(false);
            setSelectedPayslip(null);
          }}
          payslip={selectedPayslip}
        />
      )}
    </div>
  );
}
