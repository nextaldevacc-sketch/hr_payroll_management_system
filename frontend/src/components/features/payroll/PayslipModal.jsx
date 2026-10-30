'use client';

import React from 'react';
import { Download, FileText, CheckCircle2, ShieldAlert, Building, CreditCard } from 'lucide-react';
import { Modal } from '../../primitives/Modal';
import { StatusPill } from '../../primitives/StatusPill';
import { downloadPayslipPdf } from '../../../services/payrollApi';

function maskIban(iban) {
  if (!iban) return 'AE** **** **** **** ****';
  const clean = String(iban).replace(/[\s-]/g, '').toUpperCase();
  if (clean.length < 4) return clean;
  const last4 = clean.slice(-4);
  return `AE** **** **** **** ${last4}`;
}

export function PayslipModal({ isOpen, onClose, payslip }) {
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
    ? new Date(payslip.period_from).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
    : 'October 2026';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Payslip / كشف الراتب - ${periodStr}`}
      subtitle={`${emp.name || 'Employee'} (${emp.employee_code || '---'})`}
      maxWidth="max-w-3xl"
    >
      <div className="space-y-6 overflow-y-auto max-h-[75vh] pr-1">
        {/* Header Metadata */}
        <div className="glass-card p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface/40 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg text-text dark:text-gold">{emp.name}</h3>
              {emp.arabic_name && (
                <span className="text-sm text-text-muted font-arabic">({emp.arabic_name})</span>
              )}
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              {contract.job?.title || 'Team Member'} &bull; {emp.department?.name || 'General Operations'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StatusPill status={payslip.status || 'Draft'} />
            <button
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-black hover:opacity-90 transition-all shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              Download PDF
            </button>
          </div>
        </div>

        {/* Banking and WPS Details */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-surface-raised/40 border border-slate-200 dark:border-slate-700">
            <span className="text-text-muted flex items-center gap-1">
              <CreditCard className="w-3.5 h-3.5 text-primary" /> Bank Name
            </span>
            <p className="font-semibold text-text mt-1">{bank.bank_name || 'Emirates NBD'}</p>
          </div>
          <div className="p-3 rounded-xl bg-surface-raised/40 border border-slate-200 dark:border-slate-700">
            <span className="text-text-muted flex items-center gap-1">
              <CreditCard className="w-3.5 h-3.5 text-secondary" /> UAE IBAN
            </span>
            <p className="font-mono font-medium text-text mt-1">
              {maskIban(bank.iban)}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-surface-raised/40 border border-slate-200 dark:border-slate-700">
            <span className="text-text-muted flex items-center gap-1">
              <Building className="w-3.5 h-3.5 text-amber-500" /> Establishment / Routing
            </span>
            <p className="font-mono font-medium text-text mt-1">{bank.routing_code || payRun.company_visa?.bank_routing_code || 'ENBD001'}</p>
          </div>
        </div>

        {/* Earnings & Deductions Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Earnings Column */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-secondary/5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-secondary mb-3 flex items-center justify-between">
              <span>Earnings / المستحقات</span>
              <span className="text-[10px] text-text-muted">AED</span>
            </h4>
            <div className="space-y-2 text-xs">
              {earnings.length > 0 ? (
                earnings.map((line, idx) => (
                  <div key={idx} className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700/60 last:border-0">
                    <span className="text-text-muted">{line.name}</span>
                    <span className="font-medium text-text">{Number(line.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                ))
              ) : (
                <>
                  <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700/60">
                    <span className="text-text-muted">Basic Salary</span>
                    <span className="font-medium text-text">{Number(payslip.basic || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700/60">
                    <span className="text-text-muted">Allowances</span>
                    <span className="font-medium text-text">{(Number(payslip.gross || 0) - Number(payslip.basic || 0)).toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between font-bold text-sm text-text">
              <span>Total Gross Salary</span>
              <span className="text-secondary">AED {Number(payslip.gross || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Deductions Column */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-red-500/5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-red-500 mb-3 flex items-center justify-between">
              <span>Deductions / الاستقطاعات</span>
              <span className="text-[10px] text-text-muted">AED</span>
            </h4>
            <div className="space-y-2 text-xs">
              {deductions.length > 0 ? (
                deductions.map((line, idx) => (
                  <div key={idx} className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700/60 last:border-0">
                    <span className="text-text-muted">{line.name}</span>
                    <span className="font-medium text-red-500">-{Number(line.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-text-muted text-xs italic">
                  No deductions applied for this period.
                </div>
              )}
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between font-bold text-sm text-text">
              <span>Total Deductions</span>
              <span className="text-red-500">AED {Number(payslip.total_deductions || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {/* Company Pension Contribution (if applicable) */}
        {contributions.length > 0 && (
          <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-blue-500/5 text-xs">
            <div className="flex justify-between items-center text-blue-400 font-semibold mb-1">
              <span>Employer Pension Contribution (GPSSA)</span>
              <span>AED {Number(contributions[0].amount || 0).toFixed(2)}</span>
            </div>
            <p className="text-[11px] text-text-muted">Paid directly to the General Pension & Social Security Authority on behalf of UAE National.</p>
          </div>
        )}

        {/* Net Pay Banner */}
        <div className="glass-panel p-5 rounded-2xl border-2 border-primary/40 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs uppercase tracking-wider font-bold text-text-muted">Net Disbursed Pay (WPS) / صافي الراتب المستحق</span>
            <div className="text-3xl font-black text-text dark:text-gold mt-1">
              AED {Number(payslip.net || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          {payslip.variance_pct && Math.abs(Number(payslip.variance_pct)) >= 10 && (
            <div className="text-right">
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <ShieldAlert className="w-3.5 h-3.5" />
                Variance: {Number(payslip.variance_pct) > 0 ? '+' : ''}{Number(payslip.variance_pct).toFixed(1)}%
              </span>
              {payslip.variance_reason && (
                <p className="text-[11px] text-text-muted mt-1 max-w-xs truncate" title={payslip.variance_reason}>
                  Reason: &ldquo;{payslip.variance_reason}&rdquo;
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
