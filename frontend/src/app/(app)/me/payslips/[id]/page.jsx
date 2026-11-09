'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Download,
  CreditCard,
  Building,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { StatusPill } from '@/components/primitives/StatusPill';
import { Button } from '@/components/primitives/form/Button';
import { useLanguage } from '@/context/LanguageContext';
import { formatCurrency } from '@nextal/shared';
import { getSalaryRuleNameAr } from '@/i18n/enums';
import { getMyPayslip, getMyPayslipPdfUrl } from '@/services/meApi';

function maskIban(iban) {
  if (!iban) return 'AE** **** **** **** ****';
  const clean = String(iban).replace(/[\s-]/g, '').toUpperCase();
  if (clean.length < 4) return clean;
  const last4 = clean.slice(-4);
  return `AE** **** **** **** ${last4}`;
}

function formatPeriodMonth(monthStr, lang) {
  if (!monthStr) return '';
  const parts = String(monthStr).split('-');
  if (parts.length >= 2) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const d = new Date(Date.UTC(year, month, 1));
    return d.toLocaleDateString(lang === 'ar' ? 'ar-AE' : 'en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  }
  return monthStr;
}

export default function MyPayslipDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const payslipId = params?.id;

  const [payslip, setPayslip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    async function load() {
      if (!payslipId) return;
      setLoading(true);
      setError(null);
      try {
        const data = await getMyPayslip(payslipId);
        setPayslip(data);
      } catch (err) {
        setError(err.message || 'Failed to load payslip');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [payslipId]);

  const handleDownloadPdf = async () => {
    try {
      setDownloading(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('nextal_token') : null;
      const url = getMyPayslipPdfUrl(payslipId);
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('PDF download failed');
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `payslip-${payslipId.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      alert((isAr ? 'فشل تحميل ملف PDF: ' : 'Failed to download payslip PDF: ') + err.message);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-text-muted flex flex-col items-center gap-2">
        <Clock className="w-6 h-6 animate-spin text-primary" />
        <p>{isAr ? 'جارٍ تحميل كشف الراتب...' : 'Loading payslip details...'}</p>
      </div>
    );
  }

  if (error || !payslip) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-sm font-semibold text-rose-500">{error || (isAr ? 'كشف الراتب غير موجود' : 'Payslip not found')}</p>
        <Button variant="outline" size="sm" onClick={() => router.push('/me/payslips')}>
          {isAr ? 'العودة إلى قسائم الرواتب' : 'Back to Payslips'}
        </Button>
      </div>
    );
  }

  const emp = payslip.employee || {};
  const contract = payslip.contract || {};
  const payRun = payslip.pay_run || {};
  const bank = payslip.bankAccount || emp.bank_accounts?.find((b) => b.is_primary) || emp.bank_accounts?.[0] || {};
  const lines = payslip.lines || [];

  const earnings = lines.filter((l) =>
    ['Basic', 'Allowance', 'Addition', 'Gross'].includes(l.salary_rule?.category || l.category) &&
    l.code !== 'GROSS' &&
    l.code !== 'NET'
  );
  const deductions = lines.filter((l) =>
    ['Deduction'].includes(l.salary_rule?.category || l.category)
  );

  const periodStr = formatPeriodMonth(payRun.period_month?.slice(0, 7) || '2026-10', language);

  return (
    <div id="me-payslip-detail-container" className="space-y-6 animate-fadeIn pb-12 max-w-4xl mx-auto overflow-x-hidden">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between gap-3 pb-2">
        <button
          onClick={() => router.push('/me/payslips')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-text transition-colors"
        >
          <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
          <span>{isAr ? 'العودة إلى قائمة قسائمي' : 'Back to Payslips'}</span>
        </button>

        <Button
          id="btn-download-payslip-pdf"
          size="sm"
          variant="primary"
          icon={<Download className="w-3.5 h-3.5" />}
          loading={downloading}
          onClick={handleDownloadPdf}
        >
          {isAr ? 'تحميل كشف الراتب (PDF)' : 'Download PDF'}
        </Button>
      </div>

      {/* Main Payslip Card */}
      <div className="glass-panel p-6 rounded-2xl border border-border space-y-6">
        {/* Header Metadata */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border/60">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              <h1 className="text-xl sm:text-2xl font-black text-text dark:text-gold" data-i18n-skip>
                {isAr ? `كشف الراتب - ${periodStr}` : `Salary Payslip - ${periodStr}`}
              </h1>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-bold text-sm text-text" data-i18n-skip>
                {isAr ? (emp.arabic_name || emp.name) : emp.name}
              </span>
              <span className="font-mono text-xs text-text-muted" data-i18n-skip>
                ({emp.employee_code || '---'})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {isAr ? 'تم الصرف (WPS)' : 'Paid (WPS)'}
            </span>
          </div>
        </div>

        {/* Banking and Routing Info */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-surface-raised/40 border border-border">
            <span className="text-text-muted flex items-center gap-1">
              <CreditCard className="w-3.5 h-3.5 text-primary" /> {isAr ? 'اسم المصرف' : 'Bank Name'}
            </span>
            <p className="font-semibold text-text mt-1" data-i18n-skip>{bank.bank_name || 'Emirates NBD'}</p>
          </div>
          <div className="p-3.5 rounded-xl bg-surface-raised/40 border border-border">
            <span className="text-text-muted flex items-center gap-1">
              <CreditCard className="w-3.5 h-3.5 text-secondary" /> {isAr ? 'الآيبان الإماراتي' : 'UAE IBAN'}
            </span>
            <p className="font-mono font-medium text-text mt-1" data-i18n-skip>
              {maskIban(bank.iban)}
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-surface-raised/40 border border-border">
            <span className="text-text-muted flex items-center gap-1">
              <Building className="w-3.5 h-3.5 text-amber-500" /> {isAr ? 'رمز التوجيه' : 'Routing Code'}
            </span>
            <p className="font-mono font-medium text-text mt-1" data-i18n-skip>{bank.routing_code || payRun.company_visa?.bank_routing_code || 'ENBD001'}</p>
          </div>
        </div>

        {/* Earnings & Deductions Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Earnings */}
          <div className="p-4 rounded-xl border border-border bg-secondary/5 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-secondary">
              <span>{isAr ? 'الاستحقاقات' : 'Earnings'}</span>
              <span className="text-[10px] text-text-muted">{isAr ? 'د.إ' : 'AED'}</span>
            </div>
            <div className="space-y-2 text-xs">
              {earnings.length > 0 ? (
                earnings.map((line, idx) => (
                  <div key={idx} className="flex justify-between py-1 border-b border-border/40 last:border-0">
                    <span className="text-text-muted">{isAr ? getSalaryRuleNameAr(line.code, line.name) : line.name}</span>
                    <span className="font-semibold text-text">{formatCurrency(line.amount, 'AED', language)}</span>
                  </div>
                ))
              ) : (
                <div className="flex justify-between py-1">
                  <span className="text-text-muted">{isAr ? 'الراتب الأساسي' : 'Basic Salary'}</span>
                  <span className="font-semibold text-text">{formatCurrency(payslip.basic || 0, 'AED', language)}</span>
                </div>
              )}
            </div>
            <div className="pt-3 border-t border-border flex justify-between font-bold text-sm text-text">
              <span>{isAr ? 'إجمالي الراتب' : 'Total Gross Salary'}</span>
              <span className="text-secondary">{formatCurrency(payslip.gross, 'AED', language)}</span>
            </div>
          </div>

          {/* Deductions */}
          <div className="p-4 rounded-xl border border-border bg-rose-500/5 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-rose-500">
              <span>{isAr ? 'الاستقطاعات' : 'Deductions'}</span>
              <span className="text-[10px] text-text-muted">{isAr ? 'د.إ' : 'AED'}</span>
            </div>
            <div className="space-y-2 text-xs">
              {deductions.length > 0 ? (
                deductions.map((line, idx) => (
                  <div key={idx} className="flex justify-between py-1 border-b border-border/40 last:border-0">
                    <span className="text-text-muted">{isAr ? getSalaryRuleNameAr(line.code, line.name) : line.name}</span>
                    <span className="font-semibold text-rose-500">
                      {Number(line.amount) > 0
                        ? `-${formatCurrency(Number(line.amount), 'AED', language)}`
                        : formatCurrency(0, 'AED', language)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-text-muted text-xs italic">
                  {isAr ? 'لا توجد استقطاعات لهذه الفترة.' : 'No deductions applied.'}
                </div>
              )}
            </div>
            <div className="pt-3 border-t border-border flex justify-between font-bold text-sm text-text">
              <span>{isAr ? 'إجمالي الاستقطاعات' : 'Total Deductions'}</span>
              <span className="text-rose-500">
                {Number(payslip.total_deductions) > 0
                  ? `-${formatCurrency(Number(payslip.total_deductions), 'AED', language)}`
                  : formatCurrency(0, 'AED', language)}
              </span>
            </div>
          </div>
        </div>

        {/* Net WPS Banner */}
        <div className="glass-panel p-5 rounded-2xl border-2 border-primary/40 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs uppercase tracking-wider font-bold text-text-muted">
              {isAr ? 'صافي الراتب المحول (نظام حماية الأجور)' : 'Net Disbursed Pay (WPS)'}
            </span>
            <div className="text-3xl font-black text-text dark:text-gold mt-1">
              {formatCurrency(payslip.net, 'AED', language)}
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>{isAr ? 'موثق ومعتمد بنكياً' : 'Verified & Bank Disbursed'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

