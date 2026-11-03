'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import {
  History,
  Search,
  Filter,
  Download,
  Calendar,
  ChevronDown,
  ChevronRight,
  Shield,
  User,
  Clock,
  RefreshCw,
  FileText,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { listAuditLogs, exportAuditLogsCsv } from '../../../services/auditApi';
import { Select } from '../../primitives/form/Select';

export default function AuditFeature() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [tableFilter, setTableFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Expandable row state
  const [expandedLogId, setExpandedLogId] = useState(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await listAuditLogs({
        page,
        limit: 30,
        action: actionFilter || undefined,
        tableName: tableFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });

      if (res?.items) {
        setLogs(res.items);
        setTotal(res.total || 0);
        setTotalPages(res.totalPages || 1);
      } else if (Array.isArray(res)) {
        setLogs(res);
        setTotal(res.length);
        setTotalPages(1);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter, tableFilter, startDate, endDate]);

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      await exportAuditLogsCsv({
        action: actionFilter || undefined,
        tableName: tableFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
    } catch (err) {
      console.error('Failed to export audit logs:', err);
    } finally {
      setExporting(false);
    }
  };

  const toggleRow = (id) => {
    setExpandedLogId(expandedLogId === id ? null : id);
  };

  const getActionBadgeColor = (action) => {
    const act = String(action || '').toUpperCase();
    if (act.includes('CREATE') || act.includes('UPLOAD') || act.includes('ADD')) {
      return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800';
    }
    if (act.includes('UPDATE') || act.includes('CALCULATE') || act.includes('RENEW')) {
      return 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 border border-blue-200 dark:border-blue-800';
    }
    if (act.includes('DELETE') || act.includes('REVOKE') || act.includes('REJECT')) {
      return 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200 dark:border-rose-800';
    }
    if (act.includes('VALIDATE') || act.includes('APPROVE') || act.includes('VERIFY') || act.includes('LOCK')) {
      return 'bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-400 border border-violet-200 dark:border-violet-800';
    }
    return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <History className="w-7 h-7 text-emerald-500" />
            {isAr ? 'سجل التدقيق والرقابة المحاسبية' : 'Immutable Audit History'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isAr
              ? 'سجل غير قابل للتعديل يوثق كل تغيير واعتماد وحركة في النظام'
              : 'Tamper-proof, append-only ledger tracking every create, update, approval, and permission check'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchLogs}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {isAr ? 'تحديث' : 'Refresh'}
          </button>
          <button
            onClick={handleExportCsv}
            disabled={exporting}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50"
          >
            {exporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {isAr ? 'تصدير CSV' : 'Export CSV'}
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 flex flex-wrap gap-3 items-center">
        {/* Action filter */}
        <div className="min-w-[180px]">
          <Select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            placeholder={isAr ? 'جميع العمليات' : 'All Actions'}
            options={[
              { value: '', label: isAr ? 'جميع العمليات' : 'All Actions' },
              { value: 'Create', label: isAr ? 'إنشاء' : 'Create' },
              { value: 'Update', label: isAr ? 'تحديث' : 'Update' },
              { value: 'Validate', label: isAr ? 'تدقيق' : 'Validate' },
              { value: 'Lock', label: isAr ? 'إقفال' : 'Lock' },
              { value: 'Pay', label: isAr ? 'صرف' : 'Pay' },
              { value: 'Approve', label: isAr ? 'اعتماد' : 'Approve' },
              { value: 'Reject', label: isAr ? 'رفض' : 'Reject' },
              { value: 'UploadDocument', label: isAr ? 'رفع وثيقة' : 'Upload Document' },
              { value: 'RenewDocument', label: isAr ? 'تجديد وثيقة' : 'Renew Document' },
              { value: 'VerifyDocument', label: isAr ? 'التحقق من وثيقة' : 'Verify Document' },
              { value: 'GRANT_SUPPORT_ACCESS', label: isAr ? 'منح دعم فني' : 'Grant Support Access' },
              { value: 'REVOKE_SUPPORT_ACCESS', label: isAr ? 'إلغاء دعم فني' : 'Revoke Support Access' },
            ]}
          />
        </div>

        {/* Table filter */}
        <div className="min-w-[180px]">
          <Select
            value={tableFilter}
            onChange={(e) => {
              setTableFilter(e.target.value);
              setPage(1);
            }}
            placeholder={isAr ? 'جميع الكيانات والجداول' : 'All Entities / Tables'}
            options={[
              { value: '', label: isAr ? 'جميع الكيانات والجداول' : 'All Entities / Tables' },
              { value: 'employees', label: 'employees' },
              { value: 'contracts', label: 'contracts' },
              { value: 'pay_runs', label: 'pay_runs' },
              { value: 'attendance_days', label: 'attendance_days' },
              { value: 'leave_requests', label: 'leave_requests' },
              { value: 'employee_documents', label: 'employee_documents' },
              { value: 'support_access_grants', label: 'support_access_grants' },
            ]}
          />
        </div>

        {/* Date filters */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <span>{isAr ? 'من:' : 'From:'}</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(1);
            }}
            className="px-2 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <span>{isAr ? 'إلى:' : 'To:'}</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(1);
            }}
            className="px-2 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="ml-auto rtl:mr-auto text-xs text-slate-400">
          {isAr ? `إجمالي السجلات: ${total}` : `Total entries: ${total}`}
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left rtl:text-right border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
                <th className="py-3 px-4 w-8"></th>
                <th className="py-3 px-4">{isAr ? 'التاريخ والوقت' : 'Timestamp (UTC+4)'}</th>
                <th className="py-3 px-4">{isAr ? 'المستخدم الفاعل' : 'User / Actor'}</th>
                <th className="py-3 px-4">{isAr ? 'نوع الحركة' : 'Action'}</th>
                <th className="py-3 px-4">{isAr ? 'الجدول / الكيان' : 'Entity'}</th>
                <th className="py-3 px-4">{isAr ? 'معرف السجل' : 'Record ID'}</th>
                <th className="py-3 px-4">{isAr ? 'عنوان IP' : 'IP Address'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-500" />
                    {isAr ? 'جاري استرجاع سجل التدقيق...' : 'Loading audit log ledger...'}
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    {isAr ? 'لا توجد حركات تدقيق تطابق التصفية' : 'No audit entries found matching the filter'}
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  const hasDiff = Boolean(log.old_values || log.new_values);

                  return (
                    <React.Fragment key={log.id}>
                      <tr
                        onClick={() => hasDiff && toggleRow(log.id)}
                        className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${
                          hasDiff ? 'cursor-pointer' : ''
                        }`}
                      >
                        <td className="py-3 px-3 text-center text-slate-400">
                          {hasDiff && (
                            <span className="inline-block transition-transform duration-200">
                              {isExpanded ? <ChevronDown className="w-4 h-4 text-emerald-500" /> : <ChevronRight className="w-4 h-4" />}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-mono text-xs whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString('en-GB', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                          <div>{log.user?.name || log.user?.email || 'SYSTEM'}</div>
                          {log.user?.email && log.user?.name && (
                            <div className="text-xs text-slate-400">{log.user.email}</div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getActionBadgeColor(log.action)}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-slate-700 dark:text-slate-300">
                          {log.table_name}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-slate-400">
                          {log.record_id ? log.record_id.slice(0, 13) + '...' : '—'}
                        </td>
                        <td className="py-3 px-4 text-xs font-mono text-slate-500 dark:text-slate-400">
                          {log.ip_address || '—'}
                        </td>
                      </tr>

                      {/* Expandable Before vs After Diff View */}
                      {isExpanded && hasDiff && (
                        <tr className="bg-slate-50/90 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800">
                          <td colSpan={7} className="p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Old Values */}
                              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 text-xs">
                                <div className="text-rose-600 dark:text-rose-400 font-semibold mb-1 flex items-center gap-1.5">
                                  <span>{isAr ? 'القيم السابقة (Before):' : 'Before (Old Values):'}</span>
                                </div>
                                <pre className="font-mono text-slate-700 dark:text-slate-300 whitespace-pre-wrap overflow-x-auto max-h-48 text-[11px] p-2 rounded bg-slate-50 dark:bg-slate-800/40">
                                  {log.old_values ? JSON.stringify(log.old_values, null, 2) : 'null (Created)'}
                                </pre>
                              </div>

                              {/* New Values */}
                              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 text-xs">
                                <div className="text-emerald-600 dark:text-emerald-400 font-semibold mb-1 flex items-center gap-1.5">
                                  <span>{isAr ? 'القيم الجديدة (After):' : 'After (New Values):'}</span>
                                </div>
                                <pre className="font-mono text-slate-700 dark:text-slate-300 whitespace-pre-wrap overflow-x-auto max-h-48 text-[11px] p-2 rounded bg-slate-50 dark:bg-slate-800/40">
                                  {log.new_values ? JSON.stringify(log.new_values, null, 2) : 'null (Deleted)'}
                                </pre>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {isAr ? `صفحة ${page} من ${totalPages}` : `Page ${page} of ${totalPages}`}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                {isAr ? 'السابق' : 'Previous'}
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                {isAr ? 'التالي' : 'Next'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

