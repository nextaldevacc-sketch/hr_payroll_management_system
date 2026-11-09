'use client';

import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Download,
  Eye,
  Calendar,
  CheckCircle2,
  FileText,
  DollarSign,
  ArrowDownRight,
  ArrowUpRight,
} from 'lucide-react';
import { IconWell } from '@/components/primitives/IconWell';
import { Button } from '@/components/primitives/form/Button';
import { Modal } from '@/components/primitives/Modal';
import { useLanguage } from '@/context/LanguageContext';
import { useVisa } from '@/context/VisaContext';
import { getMyPayslips, getMyPayslip, getMyPayslipPdfUrl } from '@/services/meApi';
import { formatCurrency } from '@nextal/shared';

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

export default function MyPayslipsPage() {
  const { language } = useLanguage();
  const { companyName } = useVisa();
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const list = await getMyPayslips();
        setPayslips(list || []);
      } catch (err) {
        console.warn('Failed to load payslips:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleOpenBreakdown = async (id) => {
    try {
      const full = await getMyPayslip(id);
      setSelectedPayslip(full);
      setDetailModalOpen(true);
    } catch (err) {
      console.warn('Failed to fetch payslip detail:', err);
    }
  };

  const handleDownloadPdf = async (id) => {
    try {
      setDownloadingId(id);
      const token = typeof window !== 'undefined' ? localStorage.getItem('nextal_token') : null;
      const url = getMyPayslipPdfUrl(id);
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('PDF download failed');
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `payslip-${id.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      alert('Failed to download payslip PDF: ' + err.message);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div id="my-payslips-container" className="space-y-6 animate-fadeIn pb-12 max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text gold-page-title">
            {language === 'ar' ? 'قسائم رواتبي' : 'My Payslips'}
          </h1>
          <p className="text-xs sm:text-sm text-text-muted mt-0.5">
            {language === 'ar'
              ? 'سجل القسائم الصادرة والمودعة في الحساب البنكي عبر نظام حماية الأجور (WPS)'
              : 'Official records of released salary slips processed via UAE WPS'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">
            {language === 'ar' ? `المجموع: ${payslips.length} قسيمة` : `Total: ${payslips.length} slips`}
          </span>
        </div>
      </div>

      {/* Payslips Table / Card Container */}
      <div className="glass-panel rounded-2xl border border-border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-text-muted">
            {language === 'ar' ? 'جارٍ تحميل قسائم الرواتب...' : 'Loading released payslips...'}
          </div>
        ) : payslips.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <IconWell size="lg" shape="circle" color="default" className="mx-auto">
              <Wallet className="w-6 h-6 text-text-muted" />
            </IconWell>
            <p className="text-sm font-semibold text-text">
              {language === 'ar' ? 'لا توجد قسائم رواتب صادرة بعد' : 'No released payslips yet'}
            </p>
            <p className="text-xs text-text-muted max-w-md mx-auto">
              {language === 'ar'
                ? 'تظهر قسائم الرواتب هنا تلقائياً بمجرد اعتمادها وصرفها رسمياً من قبل الإدارة المالية.'
                : 'Payslips appear here automatically once approved and marked Paid by Finance.'}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Cards View (< 640px) */}
            <div className="block sm:hidden divide-y divide-border/40 p-3 space-y-3">
              {payslips.map((ps) => (
                <div key={ps.id} className="pt-3 first:pt-0 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-text text-sm">
                      <Calendar className="w-4 h-4 text-primary" />
                      <span>{formatPeriodMonth(ps.period_month, language)}</span>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                      <CheckCircle2 className="w-3 h-3" />
                      {language === 'ar' ? 'تم الصرف' : 'Paid'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-black/[0.02] dark:bg-white/[0.02] p-2.5 rounded-xl text-xs">
                    <div>
                      <span className="text-[10px] text-text-muted block">{language === 'ar' ? 'الراتب الإجمالي' : 'Gross'}</span>
                      <span className="font-semibold text-text tabular-nums text-[11px]">
                        {formatCurrency(ps.gross, 'AED', language)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-text-muted block">{language === 'ar' ? 'الاستقطاعات' : 'Deductions'}</span>
                      <span className="font-semibold text-rose-500 tabular-nums text-[11px]">
                        {Number(ps.total_deductions) > 0 ? '-' : ''}{formatCurrency(ps.total_deductions, 'AED', language)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-text-muted block">{language === 'ar' ? 'صافي الراتب' : 'Net'}</span>
                      <span className="font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums text-[11px]">
                        {formatCurrency(ps.net, 'AED', language)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <Button
                      size="xs"
                      variant="outline"
                      icon={<Eye className="w-3 h-3" />}
                      onClick={() => handleOpenBreakdown(ps.id)}
                    >
                      {language === 'ar' ? 'التفاصيل' : 'Breakdown'}
                    </Button>
                    <Button
                      size="xs"
                      variant="primary"
                      icon={<Download className="w-3 h-3" />}
                      loading={downloadingId === ps.id}
                      onClick={() => handleDownloadPdf(ps.id)}
                    >
                      {language === 'ar' ? 'تحميل PDF' : 'PDF'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View (>= 640px) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-xs text-start border-collapse min-w-[600px]">
                <thead>
                  <tr className="border-b border-border bg-black/[0.02] dark:bg-white/[0.02]">
                    <th className="py-3 px-4 font-bold text-text-muted uppercase text-start">
                      {language === 'ar' ? 'الشهر / الفترة' : 'Month / Period'}
                    </th>
                    <th className="py-3 px-4 font-bold text-text-muted uppercase text-start">
                      {language === 'ar' ? 'الراتب الإجمالي' : 'Gross Pay'}
                    </th>
                    <th className="py-3 px-4 font-bold text-text-muted uppercase text-start">
                      {language === 'ar' ? 'الاستقطاعات' : 'Deductions'}
                    </th>
                    <th className="py-3 px-4 font-bold text-text-muted uppercase text-start">
                      {language === 'ar' ? 'صافي الراتب المحول' : 'Net Salary'}
                    </th>
                    <th className="py-3 px-4 font-bold text-text-muted uppercase text-start">
                      {language === 'ar' ? 'الحالة' : 'Status'}
                    </th>
                    <th className="py-3 px-4 font-bold text-text-muted uppercase text-end">
                      {language === 'ar' ? 'الإجراءات' : 'Actions'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {payslips.map((ps) => (
                    <tr key={ps.id} className="hover:bg-primary-wash/30 transition-colors">
                      <td className="py-3 px-4 font-bold text-text">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-primary" />
                          <span>{formatPeriodMonth(ps.period_month, language)}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-text font-semibold tabular-nums">
                        {formatCurrency(ps.gross, 'AED', language)}
                      </td>
                      <td className="py-3 px-4 text-rose-500 font-semibold tabular-nums">
                        {Number(ps.total_deductions) > 0 ? '-' : ''}{formatCurrency(ps.total_deductions, 'AED', language)}
                      </td>
                      <td className="py-3 px-4 font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {formatCurrency(ps.net, 'AED', language)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">
                          <CheckCircle2 className="w-3 h-3" />
                          {language === 'ar' ? 'تم الصرف' : 'Paid'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-end">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="xs"
                            variant="outline"
                            icon={<Eye className="w-3 h-3" />}
                            onClick={() => handleOpenBreakdown(ps.id)}
                          >
                            {language === 'ar' ? 'التفاصيل' : 'Breakdown'}
                          </Button>
                          <Button
                            size="xs"
                            variant="primary"
                            icon={<Download className="w-3 h-3" />}
                            loading={downloadingId === ps.id}
                            onClick={() => handleDownloadPdf(ps.id)}
                          >
                            {language === 'ar' ? 'تحميل PDF' : 'PDF'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Payslip Breakdown Modal */}
      {selectedPayslip && (
        <Modal
          isOpen={detailModalOpen}
          onClose={() => setDetailModalOpen(false)}
          title={`Payslip — ${selectedPayslip.pay_run?.period_month?.slice(0, 7) || 'October 2026'}`}
          subtitle={`Official Salary Slip Breakdown · ${companyName || 'Company'}`}
          maxWidth="max-w-xl"
        >
          <div className="space-y-4 text-xs">
            {/* Top Net Banner */}
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
              <div>
                <span className="text-text-muted text-[11px] font-semibold">{language === 'ar' ? 'صافي الراتب المحول للحساب البنكي' : 'Net Pay to Bank Account'}</span>
                <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {formatCurrency(selectedPayslip.net, 'AED', language)}
                </p>
              </div>
              <Button
                size="sm"
                variant="primary"
                icon={<Download className="w-3.5 h-3.5" />}
                onClick={() => handleDownloadPdf(selectedPayslip.id)}
              >
                {language === 'ar' ? 'تحميل كشف الراتب (PDF)' : 'Download PDF'}
              </Button>
            </div>

            {/* Lines List */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase text-text-muted">{language === 'ar' ? 'بنود الراتب' : 'Salary Components'}</span>
              <div className="rounded-xl border border-border divide-y divide-border/40 overflow-hidden">
                {selectedPayslip.lines?.map((l) => {
                  const isDeduction = l.line_type === 'Deduction' || Number(l.amount) < 0;
                  return (
                    <div key={l.id} className="p-2.5 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-semibold text-text">{l.salary_rule?.name || l.code}</span>
                        <span className="text-[10px] text-text-muted block">{l.code}</span>
                      </div>
                      <span className={`font-bold tabular-nums ${isDeduction ? 'text-rose-500' : 'text-text'}`}>
                        {isDeduction && Number(l.amount) !== 0 ? '-' : ''}{formatCurrency(Math.abs(Number(l.amount)), 'AED', language)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setDetailModalOpen(false)}>
                {language === 'ar' ? 'إغلاق' : 'Close'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
