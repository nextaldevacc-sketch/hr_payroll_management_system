'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Download,
  AlertOctagon,
  Calendar,
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  RefreshCw,
  FileSpreadsheet,
} from 'lucide-react';
import { GlassCard } from '../../primitives/GlassCard';
import { StatusPill } from '../../primitives/StatusPill';
import { Modal } from '../../primitives/Modal';
import { useLanguage } from '../../../context/LanguageContext';
import { fetchRejections, fetchMyRejections, downloadRejectionsCsv } from '../../../services/approvalApi';
import { Skeleton } from '../../ui/skeleton/Skeleton';

const REQUEST_TYPES = [
  { value: '', labelEn: 'All Request Types', labelAr: 'جميع أنواع الطلبات' },
  { value: 'LEAVE', labelEn: 'Leave Request', labelAr: 'طلب إجازة' },
  { value: 'OVERTIME', labelEn: 'Overtime Request', labelAr: 'طلب عمل إضافي' },
  { value: 'SEPARATION', labelEn: 'Separation / Exit', labelAr: 'إنهاء خدمة / استقالة' },
  { value: 'BANK_ACCOUNT_CHANGE', labelEn: 'Bank Account / IBAN Change', labelAr: 'تعديل الحساب البنكي' },
  { value: 'EMPLOYEE_BRANCH_CHANGE', labelEn: 'Branch Transfer', labelAr: 'نقل فرع الموظف' },
  { value: 'SALARY_ADJUSTMENT', labelEn: 'Salary Adjustment', labelAr: 'تسوية راتب' },
];

export function RejectionsTab({ isPersonal = false }) {
  const { language, isRTL } = useLanguage();
  const isAr = language === 'ar';

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [requestType, setRequestType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, limit: 15 });

  // Detail Modal
  const [selectedItem, setSelectedItem] = useState(null);

  const fetcher = isPersonal ? fetchMyRejections : fetchRejections;

  const loadData = async (targetPage = page) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetcher({
        search,
        requestType,
        startDate,
        endDate,
        page: targetPage,
        limit: pagination.limit,
      });
      setItems(res.data || []);
      setPagination(res.pagination || { total: 0, totalPages: 1, limit: 15 });
      setPage(targetPage);
    } catch (err) {
      console.error('Failed to load rejection log:', err);
      setError(err.message || 'Failed to load rejections log');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(1);
  }, [requestType]);

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    loadData(1);
  };

  const handleResetFilters = () => {
    setSearch('');
    setRequestType('');
    setStartDate('');
    setEndDate('');
    setPage(1);
    fetcher({ page: 1, limit: pagination.limit }).then((res) => {
      setItems(res.data || []);
      setPagination(res.pagination || { total: 0, totalPages: 1, limit: 15 });
    });
  };

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      await downloadRejectionsCsv({ search, requestType, startDate, endDate });
    } catch (err) {
      console.error('CSV export failed:', err);
      setError(err.message || 'CSV export failed');
    } finally {
      setExporting(false);
    }
  };

  const activeFiltersCount = (requestType ? 1 : 0) + (startDate ? 1 : 0) + (endDate ? 1 : 0);

  return (
    <div className="space-y-4">
      {/* Header Controls: Search, Filter Toggle, CSV Export, Refresh */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              isAr
                ? 'البحث في السجلات، الأسباب، أو نوع الطلب...'
                : 'Search records, reasons, or request types...'
            }
            className="w-full text-xs pl-9 pr-3 py-2 rounded-xl bg-surface border border-border text-text focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </form>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Filter Drawer Toggle */}
          <button
            type="button"
            onClick={() => setFilterDrawerOpen(!filterDrawerOpen)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
              activeFiltersCount > 0
                ? 'bg-primary/10 border-primary/40 text-primary'
                : 'bg-surface border-border text-text hover:bg-surface-raised'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>{isAr ? 'تصفية' : 'Filter'}</span>
            {activeFiltersCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-primary text-black text-[10px] flex items-center justify-center font-bold">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* CSV Export (Company Log only) */}
          {!isPersonal && (
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={exporting || items.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-surface border border-border text-text hover:bg-surface-raised transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{exporting ? (isAr ? 'جاري التصدير...' : 'Exporting...') : (isAr ? 'تصدير CSV' : 'Export CSV')}</span>
            </button>
          )}

          {/* Refresh */}
          <button
            type="button"
            onClick={() => loadData(page)}
            disabled={loading}
            className="p-2 rounded-xl bg-surface border border-border text-text hover:bg-surface-raised transition-colors"
            title={isAr ? 'تحديث' : 'Refresh'}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Drawer / Panel */}
      {filterDrawerOpen && (
        <div className="p-4 rounded-xl bg-surface-raised/80 border border-border/80 space-y-3 animate-in fade-in-50 duration-150">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text">
              {isAr ? 'خيارات التصفية المتقدمة' : 'Advanced Rejection Filters'}
            </span>
            <button
              onClick={() => setFilterDrawerOpen(false)}
              className="p-1 text-text-muted hover:text-text rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Request Type */}
            <div>
              <label className="block text-[11px] font-semibold text-text-muted mb-1">
                {isAr ? 'نوع الطلب' : 'Request Type'}
              </label>
              <select
                value={requestType}
                onChange={(e) => setRequestType(e.target.value)}
                className="w-full text-xs p-2 rounded-lg bg-surface border border-border text-text focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {REQUEST_TYPES.map((rt) => (
                  <option key={rt.value} value={rt.value}>
                    {isAr ? rt.labelAr : rt.labelEn}
                  </option>
                ))}
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-[11px] font-semibold text-text-muted mb-1">
                {isAr ? 'من تاريخ' : 'From Date'}
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full text-xs p-2 rounded-lg bg-surface border border-border text-text focus:outline-none focus:ring-1 focus:ring-primary"
              >
              </input>
            </div>

            {/* End Date */}
            <div>
              <label className="block text-[11px] font-semibold text-text-muted mb-1">
                {isAr ? 'إلى تاريخ' : 'To Date'}
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full text-xs p-2 rounded-lg bg-surface border border-border text-text focus:outline-none focus:ring-1 focus:ring-primary"
              >
              </input>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-text-muted hover:text-text border border-border"
            >
              {isAr ? 'إعادة ضبط' : 'Reset'}
            </button>
            <button
              type="button"
              onClick={() => {
                loadData(1);
                setFilterDrawerOpen(false);
              }}
              className="px-4 py-1.5 rounded-lg text-xs font-bold bg-primary text-black hover:opacity-90 transition-opacity"
            >
              {isAr ? 'تطبيق التصفية' : 'Apply Filters'}
            </button>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="p-1 hover:opacity-75">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Rejections Table */}
      <GlassCard className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border/80 bg-surface-raised/50 text-text-muted font-bold tracking-wider uppercase text-[10px]">
                <th className="py-3.5 px-4">{isAr ? 'التاريخ (دبي)' : 'Date (Dubai)'}</th>
                <th className="py-3.5 px-4">{isAr ? 'نوع الطلب' : 'Request Type'}</th>
                <th className="py-3.5 px-4">{isAr ? 'تفاصيل السجل' : 'Record Details'}</th>
                <th className="py-3.5 px-4">{isAr ? 'سبب الرفض' : 'Rejection Reason'}</th>
                <th className="py-3.5 px-4">{isAr ? 'رفض بواسطة' : 'Rejected By'}</th>
                <th className="py-3.5 px-4">{isAr ? 'النوع' : 'Type'}</th>
                <th className="py-3.5 px-4 text-center">{isAr ? 'تفاصيل' : 'Details'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i}>
                    <td className="p-3"><Skeleton className="h-4 w-28 rounded" /></td>
                    <td className="p-3"><Skeleton className="h-4 w-24 rounded" /></td>
                    <td className="p-3"><Skeleton className="h-4 w-32 rounded" /></td>
                    <td className="p-3"><Skeleton className="h-4 w-28 rounded" /></td>
                    <td className="p-3"><Skeleton className="h-4 w-44 rounded" /></td>
                    <td className="p-3"><Skeleton className="h-6 w-20 rounded-full" /></td>
                    <td className="p-3 text-end"><Skeleton className="h-8 w-16 rounded-lg ms-auto" /></td>
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-text-muted">
                    <AlertOctagon className="w-10 h-10 mx-auto text-text-muted/40 mb-2" />
                    <p className="font-semibold text-text">
                      {isAr ? 'لا توجد سجلات رفض مطابقة' : 'No rejection records found'}
                    </p>
                    <p className="text-[11px] text-text-muted mt-0.5">
                      {isAr
                        ? 'لم يتم تسجيل أي طلبات مرفوضة أو معادة وفقاً للشروط المحددة.'
                        : 'No rejected or returned items match your filter criteria.'}
                    </p>
                  </td>
                </tr>
              ) : (
                items.map((r) => {
                  const rejectedByName =
                    r.rejected_by?.employee?.name || r.rejected_by?.email || 'System';
                  const isSendBack = r.rejection_type === 'SEND_BACK';

                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-surface-raised/40 transition-colors"
                      data-rejection-id={r.id}
                    >
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px] text-text-muted">
                        {r.rejection_date_dubai || new Date(r.rejection_date || r.created_at).toISOString().slice(0, 10)}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap font-semibold text-text">
                        {r.request_type}
                      </td>
                      <td className="py-3.5 px-4 max-w-[200px] truncate" title={r.record_title || ''}>
                        {r.record_title || 'N/A'}
                      </td>
                      <td className="py-3.5 px-4 max-w-[280px]">
                        <p className="line-clamp-2 text-text/90 italic" title={r.reason}>
                          &ldquo;{r.reason}&rdquo;
                        </p>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-text-muted">
                        {rejectedByName}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isSendBack
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {isSendBack ? (isAr ? 'إعادة للمراجعة' : 'SEND BACK') : (isAr ? 'رفض' : 'REJECT')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          data-testid="btn-view-rejection"
                          onClick={() => setSelectedItem(r)}
                          className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface border border-transparent hover:border-border transition-colors"
                          title={isAr ? 'عرض التفاصيل' : 'View Full Details'}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="p-3 border-t border-border/60 flex items-center justify-between text-xs text-text-muted">
            <span>
              {isAr
                ? `صفحة ${page} من ${pagination.totalPages} (${pagination.total} إجمالي)`
                : `Page ${page} of ${pagination.totalPages} (${pagination.total} total)`}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => loadData(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-border hover:bg-surface disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => loadData(Math.min(pagination.totalPages, page + 1))}
                disabled={page >= pagination.totalPages}
                className="p-1.5 rounded-lg border border-border hover:bg-surface disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </GlassCard>

      {/* Full Detail Modal */}
      {selectedItem && (
        <Modal
          isOpen={Boolean(selectedItem)}
          onClose={() => setSelectedItem(null)}
          title={isAr ? 'تفاصيل سجل الرفض / الإعادة' : 'Rejection Audit Record Details'}
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-surface-raised border border-border/80">
              <div>
                <span className="text-text-muted block text-[10px] uppercase font-bold tracking-wider">
                  {isAr ? 'نوع الطلب' : 'Request Type'}
                </span>
                <span className="font-semibold text-text text-sm">{selectedItem.request_type}</span>
              </div>
              <div>
                <span className="text-text-muted block text-[10px] uppercase font-bold tracking-wider">
                  {isAr ? 'تاريخ الرفض (آسيا/دبي)' : 'Rejection Date (Dubai)'}
                </span>
                <span className="font-mono text-text">
                  {selectedItem.rejection_date_dubai || new Date(selectedItem.rejection_date || selectedItem.created_at).toISOString().slice(0, 10)}
                </span>
              </div>
              <div>
                <span className="text-text-muted block text-[10px] uppercase font-bold tracking-wider">
                  {isAr ? 'رفض بواسطة' : 'Rejected By'}
                </span>
                <span className="text-text font-medium">
                  {selectedItem.rejected_by?.employee?.name || selectedItem.rejected_by?.email || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-text-muted block text-[10px] uppercase font-bold tracking-wider">
                  {isAr ? 'مقدم الطلب' : 'Requester'}
                </span>
                <span className="text-text font-medium">
                  {selectedItem.requester?.employee?.name || selectedItem.requester?.email || 'N/A'}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-text-muted block text-[10px] uppercase font-bold tracking-wider">
                  {isAr ? 'عنوان أو سجل الطلب' : 'Record Title / Subject'}
                </span>
                <span className="text-text font-medium">{selectedItem.record_title || 'N/A'}</span>
              </div>
              <div>
                <span className="text-text-muted block text-[10px] uppercase font-bold tracking-wider">
                  {isAr ? 'رقم الخطوة' : 'Step Number'}
                </span>
                <span className="text-text">Step #{selectedItem.step_no}</span>
              </div>
              <div>
                <span className="text-text-muted block text-[10px] uppercase font-bold tracking-wider">
                  {isAr ? 'نوع الإجراء' : 'Action Type'}
                </span>
                <span className="font-bold text-rose-400">{selectedItem.rejection_type}</span>
              </div>
            </div>

            {/* Mandatory Reason */}
            <div>
              <span className="text-text-muted block text-[10px] uppercase font-bold tracking-wider mb-1">
                {isAr ? 'سبب الرفض الكامل (مسجل في سجل التدقيق):' : 'Mandatory Rejection Reason (Audit Trail):'}
              </span>
              <div className="p-3.5 rounded-xl bg-surface border border-border text-text whitespace-pre-wrap font-sans leading-relaxed">
                {selectedItem.reason}
              </div>
            </div>

            {/* Record & Request IDs */}
            <div className="p-2.5 rounded-lg bg-surface border border-border/50 text-[10px] font-mono text-text-muted space-y-1">
              <div>
                <span className="text-text-muted/60">Audit ID: </span>
                {selectedItem.id}
              </div>
              <div>
                <span className="text-text-muted/60">Record ID: </span>
                {selectedItem.record_id}
              </div>
              {selectedItem.approval_request_id && (
                <div>
                  <span className="text-text-muted/60">Approval Request ID: </span>
                  {selectedItem.approval_request_id}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-border/50">
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-surface border border-border hover:bg-surface-raised text-text transition-colors"
              >
                {isAr ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default RejectionsTab;
