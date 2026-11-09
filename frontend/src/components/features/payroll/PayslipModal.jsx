'use client';

import React from 'react';
import { Download, CreditCard, Building, ShieldAlert } from 'lucide-react';
import { Modal } from '../../primitives/Modal';
import { StatusPill } from '../../primitives/StatusPill';
import { downloadPayslipPdf } from '../../../services/payrollApi';
import { useLanguage } from '../../../context/LanguageContext';
import { formatCurrency } from '@nextal/shared';
import { getSalaryRuleNameAr } from '../../../i18n/enums';

function maskIban(iban) {
  if (!iban) return 'AE** **** **** **** ****';
  const clean = String(iban).replace(/[\s-]/g, '').toUpperCase();
  if (clean.length < 4) return clean;
  const last4 = clean.slice(-4);
  return `AE** **** **** **** ${last4}`;
}

export function PayslipModal({ isOpen, onClose, payslip }) {
  const { language } = useLanguage();
  if (!payslip) return null;

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
  const contributions = lines.filter((l) =>
    ['CompanyContribution'].includes(l.salary_rule?.category || l.category)
  );

  const handleDownloadPdf = async () => {
    try {
      await downloadPayslipPdf(payslip.id, `payslip-${emp.employee_code || payslip.id}.pdf`);
    } catch (err) {
      alert(`PDF Download failed: ${err.message}`);
    }
  };

  const periodStr = payslip.period_from
    ? new Date(payslip.period_from).toLocaleDateString(language === 'ar' ? 'ar-AE' : 'en-GB', { month: 'short', year: 'numeric' })
    : (language === 'ar' ? 'أكتوبر ٢٠٢٦' : 'October 2026');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={language === 'ar' ? `كشف الراتب - ${periodStr}` : `Payslip - ${periodStr}`}
      subtitle={`${(language === 'ar' ? (emp.arabic_name || emp.name) : emp.name) || (language === 'ar' ? 'الموظف' : 'Employee')} (${emp.employee_code || '---'})`}
      maxWidth="max-w-3xl"
    >
      <div className="space-y-6 overflow-y-auto max-h-[75vh] pr-1">
        {/* Header Metadata */}
        <div className="glass-card p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface/40 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg text-text dark:text-gold" data-i18n-skip>
                {language === 'ar' ? (emp.arabic_name || emp.name) : emp.name}
              </h3>
              {emp.arabic_name && language !== 'ar' && (
                <span className="text-sm text-text-muted font-arabic">({emp.arabic_name})</span>
              )}
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              {language === 'ar' ? (contract.job?.title_ar || contract.job?.title || 'عضو الفريق') : (contract.job?.title || 'Team Member')} &bull; {language === 'ar' ? (emp.department?.name_ar || (emp.department?.name === 'Operations' ? 'العمليات اللوجستية' : emp.department?.name) || 'العمليات') : (emp.department?.name || 'General Operations')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StatusPill status={payslip.status || 'Draft'} />
            <button
              id="btn-download-payslip-pdf"
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-black hover:opacity-90 transition-all shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              {language === 'ar' ? 'تحميل PDF' : 'Download PDF'}
            </button>
          </div>
        </div>

        {payslip.corrects_payslip_id && (
          <div id="correction-payslip-link" className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs flex items-center justify-between">
            <span className="font-semibold text-text">
              {language === 'ar' ? 'تسوية تصحيحية لقسيمة الراتب السابقة' : 'Correction adjustment for original payslip'}
            </span>
            <span className="font-mono font-bold text-primary" data-i18n-skip>
              {String(payslip.corrects_payslip_id).slice(-8).toUpperCase()}
            </span>
          </div>
        )}

        {/* Banking and WPS Details */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-surface-raised/40 border border-slate-200 dark:border-slate-700">
            <span className="text-text-muted flex items-center gap-1">
              <CreditCard className="w-3.5 h-3.5 text-primary" /> {language === 'ar' ? 'اسم المصرف' : 'Bank Name'}
            </span>
            <p className="font-semibold text-text mt-1" data-i18n-skip>{bank.bank_name || 'Emirates NBD'}</p>
          </div>
          <div className="p-3 rounded-xl bg-surface-raised/40 border border-slate-200 dark:border-slate-700">
            <span className="text-text-muted flex items-center gap-1">
              <CreditCard className="w-3.5 h-3.5 text-secondary" /> {language === 'ar' ? 'الآيبان الإماراتي' : 'UAE IBAN'}
            </span>
            <p className="font-mono font-medium text-text mt-1" data-i18n-skip>
              {maskIban(bank.iban)}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-surface-raised/40 border border-slate-200 dark:border-slate-700">
            <span className="text-text-muted flex items-center gap-1">
              <Building className="w-3.5 h-3.5 text-amber-500" /> {language === 'ar' ? 'رمز التوجيه / المنشأة' : 'Establishment / Routing'}
            </span>
            <p className="font-mono font-medium text-text mt-1" data-i18n-skip>{bank.routing_code || payRun.company_visa?.bank_routing_code || 'ENBD001'}</p>
          </div>
        </div>

        {/* Earnings & Deductions Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Earnings Column */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-secondary/5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-secondary mb-3 flex items-center justify-between">
              <span>{language === 'ar' ? 'المستحقات' : 'Earnings'}</span>
              <span className="text-[10px] text-text-muted">{language === 'ar' ? 'د.إ' : 'AED'}</span>
            </h4>
            <div className="space-y-2 text-xs">
              {earnings.length > 0 ? (
                earnings.map((line, idx) => (
                  <div key={idx} className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700/60 last:border-0">
                    <span className="text-text-muted">{language === 'ar' ? getSalaryRuleNameAr(line.code, line.name) : line.name}</span>
                    <span className="font-medium text-text">{formatCurrency(line.amount, 'AED', language)}</span>
                  </div>
                ))
              ) : (
                <>
                  <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700/60">
                    <span className="text-text-muted">{language === 'ar' ? 'الراتب الأساسي' : 'Basic Salary'}</span>
                    <span className="font-medium text-text">{formatCurrency(payslip.basic || 0, 'AED', language)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700/60">
                    <span className="text-text-muted">{language === 'ar' ? 'البدلات' : 'Allowances'}</span>
                    <span className="font-medium text-text">{formatCurrency(Number(payslip.gross || 0) - Number(payslip.basic || 0), 'AED', language)}</span>
                  </div>
                </>
              )}
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between font-bold text-sm text-text">
              <span>{language === 'ar' ? 'إجمالي الراتب' : 'Total Gross Salary'}</span>
              <span className="text-secondary">{formatCurrency(payslip.gross, 'AED', language)}</span>
            </div>
          </div>

          {/* Deductions Column */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-white/5 bg-red-500/5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-red-500 mb-3 flex items-center justify-between">
              <span>{language === 'ar' ? 'الاستقطاعات' : 'Deductions'}</span>
              <span className="text-[10px] text-text-muted">{language === 'ar' ? 'د.إ' : 'AED'}</span>
            </h4>
            <div className="space-y-2 text-xs">
              {deductions.length > 0 ? (
                deductions.map((line, idx) => (
                  <div key={idx} className="flex justify-between py-1 border-b border-slate-200 dark:border-white/5 last:border-0">
                    <span className="text-text-muted">{language === 'ar' ? getSalaryRuleNameAr(line.code, line.name) : line.name}</span>
                    <span className="font-medium text-red-500">
                      {Number(line.amount) > 0
                        ? `-${formatCurrency(Number(line.amount), 'AED', language)}`
                        : formatCurrency(0, 'AED', language)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-text-muted text-xs italic">
                  {language === 'ar' ? 'لا توجد استقطاعات مطبقة لهذه الفترة.' : 'No deductions applied for this period.'}
                </div>
              )}
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-white/5 flex justify-between font-bold text-sm text-text">
              <span>{language === 'ar' ? 'إجمالي الاستقطاعات' : 'Total Deductions'}</span>
              <span className="text-red-500">{formatCurrency(payslip.total_deductions, 'AED', language)}</span>
            </div>
          </div>
        </div>

        {/* Company Pension Contribution (if applicable) */}
        {contributions.length > 0 && (
          <div className="p-3 rounded-xl border border-slate-200 dark:border-white/5 bg-amber-500/5 text-xs">
            <div className="flex justify-between items-center text-amber-500 dark:text-amber-400 font-semibold mb-1">
              <span>{language === 'ar' ? 'مساهمة التقاعد للمواطنين (الهيئة العامة للمعاشات)' : 'Employer Pension Contribution (GPSSA)'}</span>
              <span>{formatCurrency(contributions[0]?.amount || 0, 'AED', language)}</span>
            </div>
            <p className="text-[11px] text-text-muted">
              {language === 'ar'
                ? 'مدفوعة مباشرة إلى الهيئة العامة للمعاشات والتأمينات الاجتماعية نيابة عن الموظف المواطن.'
                : 'Paid directly to the General Pension & Social Security Authority on behalf of UAE National.'}
            </p>
          </div>
        )}

        {/* Net Pay Banner */}
        <div className="glass-panel p-5 rounded-2xl border-2 border-primary/40 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs uppercase tracking-wider font-bold text-text-muted">
              {language === 'ar' ? 'صافي الراتب المستحق (حماية الأجور)' : 'Net Disbursed Pay (WPS)'}
            </span>
            <div className="text-3xl font-black text-text dark:text-gold mt-1">
              {formatCurrency(payslip.net, 'AED', language)}
            </div>
          </div>
          {payslip.variance_pct && Math.abs(Number(payslip.variance_pct)) >= 10 && (
            <div className="text-right">
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <ShieldAlert className="w-3.5 h-3.5" />
                {language === 'ar' ? 'الفارق:' : 'Variance:'} {Number(payslip.variance_pct) > 0 ? '+' : ''}{Number(payslip.variance_pct).toFixed(1)}%
              </span>
              {payslip.variance_reason && (
                <p className="text-xs text-text-muted mt-1 max-w-xs truncate" title={payslip.variance_reason}>
                  {payslip.variance_reason}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
