'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Building,
  Users,
  TrendingUp,
  FileText,
  DollarSign,
  ShieldCheck,
  Clock,
  Layers,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  PieChart,
  BarChart3,
  Lock,
  X,
} from 'lucide-react';
import reportsApi, { getHeadcountReport } from '../../../services/reportsApi';
import { fetchPayRuns } from '../../../services/payrollApi';
import { Select } from '../../primitives/form/Select';
import { useVisa } from '../../../context/VisaContext';
import { withVisa } from '../../../lib/visaQuery';

export default function ReportsFeature() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { selectedVisaId } = useVisa();
  const isAr = language === 'ar';

  const [payRuns, setPayRuns] = useState([]);
  const [selectedPayRunId, setSelectedPayRunId] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('2026-10');
  const [selectedYear, setSelectedYear] = useState('2026');
  const [loading, setLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [message, setMessage] = useState(null);

  // Headcount dashboard stats
  const [headcountData, setHeadcountData] = useState(null);

  const canSeeSalary = useMemo(() => {
    const roles = user?.roles || [];
    return (
      roles.includes('COMPANY_ADMIN') ||
      roles.includes('HR_MANAGER') ||
      roles.includes('PAYROLL_OFFICER') ||
      roles.includes('GM') ||
      roles.includes('FINANCE')
    );
  }, [user]);

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        // Load pay runs for selectors
        if (canSeeSalary) {
          const runsRes = await fetchPayRuns(withVisa({}, selectedVisaId));
          const items = Array.isArray(runsRes) ? runsRes : (runsRes?.data || []);
          setPayRuns(items);
          const lockedRun = items.find((r) => r.status === 'Locked' || r.status === 'Paid') || items[0];
          if (lockedRun) setSelectedPayRunId(lockedRun.id);
        }

        // Load headcount dashboard
        const hcRes = await getHeadcountReport(withVisa({ year: selectedYear }, selectedVisaId));
        if (hcRes?.data) setHeadcountData(hcRes.data);
      } catch (err) {
        console.error('Failed to initialize reports hub:', err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [canSeeSalary, selectedYear, selectedVisaId]);

  const handleDownload = async (reportId, actionFn) => {
    setDownloadingId(reportId);
    setMessage(null);
    try {
      await actionFn();
      setMessage({
        type: 'success',
        text: isAr ? 'تم تصدير وتنزيل التقرير بنجاح' : 'Report generated and downloaded successfully',
      });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.message || (isAr ? 'فشل تنزيل التقرير' : 'Failed to download report'),
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const lockedRuns = useMemo(() => {
    return payRuns.filter((r) => r.status === 'Locked' || r.status === 'Paid');
  }, [payRuns]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-emerald-500" />
            {isAr ? 'مركز التقارير والتصدير المالي' : 'Reports & Financial Exports Hub'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isAr
              ? 'تقارير الحضور، الإجازات، القوى العاملة، وسجلات الرواتب والقيود المحاسبية'
              : 'Attendance registers, statutory leave, headcount analytics, payroll journals and ledger exports'}
          </p>
        </div>
      </div>

      {/* Toast Notification */}
      {message && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span className="text-sm font-medium">{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="p-1 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Global Filter Bar */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3">
          {/* Month selector */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
              {isAr ? 'الشهر:' : 'Period Month:'}
            </label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Pay run selector (for salary roles) */}
          {canSeeSalary && (
            <div className="min-w-[240px]">
              <Select
                label={isAr ? 'دورة الرواتب' : 'Pay Run'}
                value={selectedPayRunId}
                onChange={(e) => setSelectedPayRunId(e.target.value)}
                options={payRuns.map((r) => ({
                  value: r.id,
                  label: `${r.company_visa?.visa_name_ar || r.company_visa?.visa_name || (isAr ? 'التأشيرة' : 'Visa')} — ${r.period_month?.slice(0, 7)}`,
                  chip: isAr ? ({ Paid: 'تم الصرف', Locked: 'مقفل', Validated: 'تم التدقيق', Calculated: 'تم الحساب', Draft: 'مسودة' }[r.status] || r.status) : r.status,
                }))}
              />
            </div>
          )}
        </div>
      </div>

      {/* Headcount Dashboard Banner (if available) */}
      {headcountData && (
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-500" />
              {isAr ? 'مؤشرات القوى العاملة ودوران الموظفين' : 'Headcount & Attrition Overview'} ({headcountData.year})
            </h2>
            <button
              onClick={() => handleDownload('headcount', () => reportsApi.downloadHeadcountReport(withVisa({ year: selectedYear }, selectedVisaId)))}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              {isAr ? 'تصدير إكسل' : 'Download Excel'}
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-800/30">
              <span className="text-xs text-slate-500 dark:text-slate-400">{isAr ? 'الموظفون النشطون' : 'Active Headcount'}</span>
              <div className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{headcountData.activeHeadcount}</div>
            </div>
            <div className="p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/50 dark:bg-emerald-950/20">
              <span className="text-xs text-emerald-700 dark:text-emerald-400">{isAr ? 'المعينون الجدد' : 'Joiners This Year'}</span>
              <div className="text-xl font-bold text-emerald-900 dark:text-emerald-300 mt-0.5">{headcountData.joinersCount}</div>
            </div>
            <div className="p-3 rounded-xl border border-rose-100 dark:border-rose-900/30 bg-rose-50/50 dark:bg-rose-950/20">
              <span className="text-xs text-rose-700 dark:text-rose-400">{isAr ? 'المغادرون' : 'Leavers This Year'}</span>
              <div className="text-xl font-bold text-rose-900 dark:text-rose-300 mt-0.5">{headcountData.leaversCount}</div>
            </div>
            <div className="p-3 rounded-xl border border-amber-100 dark:border-amber-900/30 bg-amber-50/50 dark:bg-amber-950/20">
              <span className="text-xs text-amber-700 dark:text-amber-400">{isAr ? 'معدل الدوران' : 'Turnover Rate'}</span>
              <div className="text-xl font-bold text-amber-900 dark:text-amber-300 mt-0.5">{headcountData.turnoverRate}%</div>
            </div>
          </div>
        </div>
      )}

      {/* Bento Grid: Report Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 1. Attendance Report */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                <Clock className="w-5 h-5" />
              </div>
              <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                {isAr ? 'إكسل (.xlsx)' : 'Excel (.xlsx)'}
              </span>
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white text-base">
              {isAr ? 'تقرير الحضور والانصراف التفصيلي' : 'Monthly Attendance Report'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              {isAr
                ? 'سجل الحركات اليومية، التأخيرات، الانصراف المبكر، البصمات المفقودة وساعات العمل الإضافي'
                : 'Timesheet punches, late arrivals, early departures, missing biometric logs, and approved overtime hours'}
            </p>
          </div>
          <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-mono">{selectedMonth}</span>
            <button
              onClick={() => handleDownload('attendance', () => reportsApi.downloadAttendanceReport(withVisa({ month: selectedMonth }, selectedVisaId)))}
              disabled={downloadingId === 'attendance'}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50"
            >
              {downloadingId === 'attendance' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              {isAr ? 'تنزيل التقرير' : 'Download'}
            </button>
          </div>
        </div>

        {/* 2. Leave Report */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400">
                <Calendar className="w-5 h-5" />
              </div>
              <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                {isAr ? 'إكسل (.xlsx)' : 'Excel (.xlsx)'}
              </span>
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white text-base">
              {isAr ? 'تقرير الإجازات والأرصدة' : 'Annual Leave & Balances Report'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              {isAr
                ? 'استحقاقات الإجازات، الرصيد الافتتاحي، المستحق، المستهلك والأرصدة المتبقية'
                : 'Annual statutory allocations, opening balances, accrued days, taken leaves, and remaining balances'}
            </p>
          </div>
          <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-mono">{selectedYear}</span>
            <button
              onClick={() => handleDownload('leave', () => reportsApi.downloadLeaveReport(withVisa({ year: selectedYear }, selectedVisaId)))}
              disabled={downloadingId === 'leave'}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50"
            >
              {downloadingId === 'leave' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              {isAr ? 'تنزيل التقرير' : 'Download'}
            </button>
          </div>
        </div>

        {/* 3. Accounting Export (CSV) - SALARY ROLE */}
        {canSeeSalary && (
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-sm">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  {isAr ? 'دفتر اليومية للقيود المتوازنة (CSV)' : 'CSV Journal (Balanced)'}
                </span>
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white text-base">
                {isAr ? 'تصدير القيود المحاسبية' : 'Accounting Journal Export'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                {isAr
                  ? 'قيود اليومية المحاسبية (مدين ودائن) لكل مركز تكلفة وبند راتب؛ من الدورات المعتمدة فقط'
                  : 'Balanced General Ledger debit & credit lines grouped by cost centre and salary rule; locked runs only'}
              </p>
            </div>
            <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-mono truncate max-w-[140px]">
                {payRuns.find((r) => r.id === selectedPayRunId)?.period_month?.slice(0, 7) || 'Select Run'}
              </span>
              <button
                onClick={() => handleDownload('accounting', () => reportsApi.downloadAccountingExport(selectedPayRunId))}
                disabled={!selectedPayRunId || downloadingId === 'accounting'}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50"
              >
                {downloadingId === 'accounting' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                {isAr ? 'تصدير CSV' : 'Export CSV'}
              </button>
            </div>
          </div>
        )}

        {/* 4. Payroll Register - SALARY ROLE */}
        {canSeeSalary && (
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-sm">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400">
                  <DollarSign className="w-5 h-5" />
                </div>
                <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  {isAr ? 'إكسل (.xlsx)' : 'Excel (.xlsx)'}
                </span>
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white text-base">
                {isAr ? 'سجل الرواتب التنفيذي' : 'Executive Payroll Register'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                {isAr
                  ? 'كشف الرواتب الكامل لكل موظف مع تفصيل الراتب الأساسي والبدلات والخصومات وصافي الصرف'
                  : 'Complete employee payroll ledger with Basic, Allowances, Gross, Deductions, and Net Pay breakdown'}
              </p>
            </div>
            <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-mono">
                {(() => {
                  const run = payRuns.find((r) => r.id === selectedPayRunId);
                  const vName = run?.company_visa?.visa_name;
                  if (!vName) return isAr ? 'التأشيرة' : 'Visa';
                  return isAr ? (run?.company_visa?.visa_name_ar || vName.replace('Visa', 'تأشيرة')) : vName;
                })()}
              </span>
              <button
                onClick={() => handleDownload('register', () => reportsApi.downloadPayrollRegister(selectedPayRunId))}
                disabled={!selectedPayRunId || downloadingId === 'register'}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50"
              >
                {downloadingId === 'register' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                {isAr ? 'تنزيل السجل' : 'Download'}
              </button>
            </div>
          </div>
        )}

        {/* 5. Variance Report - SALARY ROLE */}
        {canSeeSalary && (
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-sm">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  {isAr ? 'إكسل (.xlsx)' : 'Excel (.xlsx)'}
                </span>
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white text-base">
                {isAr ? 'تقرير تباين الرواتب الشهري' : 'Payroll Variance Analytics'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                {isAr
                  ? 'مقارنة رواتب الشهر مع الشهر السابق وتوضيح أسباب الفروقات التي تتجاوز النسبة المحددة'
                  : 'Month-over-month variance analysis highlighting gross/net changes above threshold and justified reasons'}
              </p>
            </div>
            <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-mono">
                {payRuns.find((r) => r.id === selectedPayRunId)?.period_month?.slice(0, 7) || 'Current'}
              </span>
              <button
                onClick={() => handleDownload('variance', () => reportsApi.downloadVarianceReport(selectedPayRunId))}
                disabled={!selectedPayRunId || downloadingId === 'variance'}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50"
              >
                {downloadingId === 'variance' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                {isAr ? 'تنزيل التقرير' : 'Download'}
              </button>
            </div>
          </div>
        )}

        {/* 6. Gratuity Provision - SALARY ROLE */}
        {canSeeSalary && (
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-sm">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  Finance Excel
                </span>
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white text-base">
                {isAr ? 'مخصص مكافأة نهاية الخدمة' : 'Gratuity Provision (Finance)'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                {isAr
                  ? 'المخصص المحاسبي الشهري لمكافأة نهاية الخدمة للموظفين طبقاً للمادة 51 من قانون العمل الإماراتي'
                  : 'Statutory End-of-Service benefit monthly accrual calculation under UAE Labour Law Article 51'}
              </p>
            </div>
            <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-mono">Article 51</span>
              <button
                onClick={() => handleDownload('gratuity', () => reportsApi.downloadGratuityProvision())}
                disabled={downloadingId === 'gratuity'}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50"
              >
                {downloadingId === 'gratuity' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                {isAr ? 'تنزيل المخصص' : 'Download'}
              </button>
            </div>
          </div>
        )}

        {/* 7. Leave Liability - SALARY ROLE */}
        {canSeeSalary && (
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-sm">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400">
                  <Layers className="w-5 h-5" />
                </div>
                <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  Finance Excel
                </span>
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white text-base">
                {isAr ? 'مخصص التزام الإجازات السنوية' : 'Leave Liability Provision'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                {isAr
                  ? 'قيمة الالتزام المالي للإجازات غير المستخدمة (الرصيد المتبقي × الأجر اليومي الأساسي)'
                  : 'Unused accrued annual leave balance financial valuation (Unused Days × Daily Basic Rate)'}
              </p>
            </div>
            <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-mono">Unused × Daily Basic</span>
              <button
                onClick={() => handleDownload('liability', () => reportsApi.downloadLeaveLiability())}
                disabled={downloadingId === 'liability'}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50"
              >
                {downloadingId === 'liability' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                {isAr ? 'تنزيل المخصص' : 'Download'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
