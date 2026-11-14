'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Drawer } from '../../../primitives/Drawer';
import { Mail, RefreshCw, CheckCircle2, Clock, AlertTriangle, XCircle, ShieldAlert } from 'lucide-react';
import { useLanguage } from '../../../../context/LanguageContext';
import { request } from '../../../../services/apiClient';

export function EmailDeliveryDrawer({ isOpen, onClose }) {
  const { isRTL, language } = useLanguage();

  const {
    data: deliveryLogs = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['settings', 'email-delivery'],
    queryFn: async () => {
      const res = await request('/settings/email-delivery');
      return res?.data || res || [];
    },
    enabled: isOpen,
    refetchInterval: isOpen ? 10000 : false,
  });

  const totalSent = deliveryLogs.filter((l) => l.status === 'sent').length;
  const totalFailed = deliveryLogs.filter((l) => l.status === 'failed').length;
  const totalQueued = deliveryLogs.filter((l) => l.status === 'queued').length;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={language === 'ar' ? 'سجل تسليم البريد الإلكتروني الصادر' : 'Email Delivery & Outbox'}
      description={
        language === 'ar'
          ? 'مراقبة الرسائل الصادرة، حالة إرسال خادم SMTP، وأسباب الإخفاق ومحاولات الإعادة'
          : 'Monitor persistent outbox delivery, SMTP transmission status, failure causes, and retry attempts'
      }
      size="xl"
    >
      <div className="space-y-4">
        {/* Summary Metrics */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted">{language === 'ar' ? 'تم التسليم' : 'Delivered'}</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1">{totalSent}</div>
          </div>

          <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted">{language === 'ar' ? 'قيد الانتظار' : 'Queued'}</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-1">{totalQueued}</div>
          </div>

          <div className="p-3 rounded-xl border border-rose-500/20 bg-rose-500/5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted">{language === 'ar' ? 'تعذر الإرسال' : 'Failed'}</span>
              <XCircle className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-lg font-bold text-rose-600 dark:text-rose-400 mt-1">{totalFailed}</div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-text">
            {language === 'ar' ? 'سجل المراسلات الأخيرة (50 رسالة)' : 'Recent Outbox Activity (Latest 50)'}
          </span>
          <button
            type="button"
            id="btn-refresh-email-delivery"
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-surface border border-border hover:bg-surface-hover text-text flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
            <span>{language === 'ar' ? 'تحديث' : 'Refresh'}</span>
          </button>
        </div>

        {/* Outbox Table */}
        {isLoading ? (
          <div className="p-8 text-center text-xs text-text-muted">
            {language === 'ar' ? 'جاري تحميل سجلات البريد...' : 'Loading email delivery logs...'}
          </div>
        ) : deliveryLogs.length === 0 ? (
          <div className="p-8 text-center rounded-xl border border-dashed border-border text-xs text-text-muted">
            <Mail className="w-8 h-8 mx-auto text-text-muted mb-2 opacity-50" />
            {language === 'ar' ? 'لا توجد رسائل مسجلة في صندوق الإرسال حتى الآن' : 'No email dispatches recorded in the outbox yet.'}
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead className="bg-surface border-b border-border text-text-muted font-semibold">
                <tr>
                  <th className="p-2.5 text-start">{language === 'ar' ? 'المستلم' : 'Recipient'}</th>
                  <th className="p-2.5 text-start">{language === 'ar' ? 'الموضوع' : 'Subject'}</th>
                  <th className="p-2.5 text-start">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="p-2.5 text-start">{language === 'ar' ? 'المحاولات' : 'Attempts'}</th>
                  <th className="p-2.5 text-start">{language === 'ar' ? 'التاريخ والوقت' : 'Timestamp'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface/50">
                {deliveryLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-surface-hover/50">
                    <td className="p-2.5 font-mono text-text">{log.recipient}</td>
                    <td className="p-2.5 text-text">
                      <div className="max-w-[240px] truncate" title={log.subject}>
                        {log.subject}
                      </div>
                      {log.last_error && (
                        <div className="text-[11px] text-rose-500 flex items-center gap-1 mt-0.5" title={log.last_error}>
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                          <span className="truncate">{log.last_error}</span>
                        </div>
                      )}
                    </td>
                    <td className="p-2.5">
                      {log.status === 'sent' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          {language === 'ar' ? 'تم الإرسال' : 'Sent'}
                        </span>
                      )}
                      {log.status === 'queued' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          <Clock className="w-2.5 h-2.5" />
                          {language === 'ar' ? 'في الانتظار' : 'Queued'}
                        </span>
                      )}
                      {log.status === 'failed' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                          <XCircle className="w-2.5 h-2.5" />
                          {language === 'ar' ? 'تعذر' : 'Failed'}
                        </span>
                      )}
                    </td>
                    <td className="p-2.5 font-mono text-text-muted">{log.attempts}</td>
                    <td className="p-2.5 text-text-muted text-[11px]">
                      {new Date(log.created_at).toLocaleString(language === 'ar' ? 'ar-AE' : 'en-GB')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Drawer>
  );
}
