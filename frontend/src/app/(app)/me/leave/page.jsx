'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  CalendarDays,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  CalendarCheck,
} from 'lucide-react';
import { IconWell } from '@/components/primitives/IconWell';
import { Button } from '@/components/primitives/form/Button';
import { Select } from '@/components/primitives/form/Select';
import { Modal } from '@/components/primitives/Modal';
import { useLanguage } from '@/context/LanguageContext';
import { getMyLeave, submitMyRequest } from '@/services/meApi';

export default function MyLeavePage() {
  const { language } = useLanguage();
  const searchParams = useSearchParams();
  const isAr = language === 'ar';

  const [data, setData] = useState({ balances: [], request_history: [] });
  const [loading, setLoading] = useState(true);
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await getMyLeave();
        if (res) {
          setData(res);
          if (res.balances?.length > 0 && !leaveTypeId) {
            setLeaveTypeId(res.balances[0].leave_type_id || res.balances[0].id || '');
          }
        }
      } catch (err) {
        console.warn('Failed to load leave data:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (searchParams?.get('action') === 'apply') {
      setApplyModalOpen(true);
    }
  }, [searchParams]);

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await submitMyRequest({
        type: 'Leave',
        leave_type_id: leaveTypeId,
        date_from: dateFrom,
        date_to: dateTo,
        reason,
      });
      alert(isAr ? 'تم تقديم طلب الإجازة بنجاح' : 'Leave request submitted successfully');
      setApplyModalOpen(false);
      // Reload
      const res = await getMyLeave();
      if (res) setData(res);
    } catch (err) {
      alert((isAr ? 'فشل تقديم طلب الإجازة: ' : 'Failed to submit leave request: ') + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const balances = data.balances || [];
  const history = data.request_history || [];

  return (
    <div id="my-leave-container" className="space-y-6 animate-fadeIn pb-12 max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text gold-page-title">
            {isAr ? 'رصيد إجازاتي وسجل الاستحقاق' : 'My Leave Balances & Accruals'}
          </h1>
          <p className="text-xs sm:text-sm text-text-muted mt-0.5">
            {isAr
              ? 'متابعة رصيد الإجازات السنوية والمرضية، سجل الاستحقاق الشهري، وتقديم طلب إجازة جديد'
              : 'Track statutory annual & sick leave entitlements, accrual history, and request time off'}
          </p>
        </div>

        <Button
          id="btn-open-apply-leave"
          size="sm"
          variant="primary"
          icon={<Plus className="w-3.5 h-3.5" />}
          onClick={() => {
            if (balances[0]) setLeaveTypeId(balances[0].leave_type_id || balances[0].id || '');
            setApplyModalOpen(true);
          }}
        >
          {isAr ? 'تقديم طلب إجازة' : 'Apply for Leave'}
        </Button>
      </div>

      {/* Balances Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {balances.map((b) => (
          <div key={b.leave_type_id || b.id} className="glass-panel p-4 rounded-xl border border-border">
            <span className="text-xs font-bold text-text-muted uppercase">
              {isAr ? (b.name_ar || b.name) : b.name}
            </span>
            <div className="text-2xl font-black text-text dark:text-gold mt-1">
              {Number(b.remaining_balance ?? b.balance ?? 0).toFixed(1)} {isAr ? 'يوم' : 'days'}
            </div>
          </div>
        ))}
      </div>

      {/* Leave Request History */}
      <div className="glass-panel rounded-2xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border font-bold text-sm text-text">
          {isAr ? 'سجل طلبات الإجازة' : 'Leave Requests History'}
        </div>
        {loading ? (
          <div className="p-8 text-center text-xs text-text-muted">
            {isAr ? 'جارٍ تحميل البيانات...' : 'Loading leave data...'}
          </div>
        ) : history.length === 0 ? (
          <div className="p-8 text-center text-xs text-text-muted">
            {isAr ? 'لا توجد طلبات إجازة سابقة' : 'No previous leave requests found'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start border-collapse min-w-[500px]">
              <thead>
                <tr className="border-b border-border bg-black/[0.02] dark:bg-white/[0.02]">
                  <th className="py-2.5 px-3 font-bold text-text-muted uppercase text-start">
                    {isAr ? 'نوع الإجازة' : 'Type'}
                  </th>
                  <th className="py-2.5 px-3 font-bold text-text-muted uppercase text-start">
                    {isAr ? 'من تاريخ' : 'From'}
                  </th>
                  <th className="py-2.5 px-3 font-bold text-text-muted uppercase text-start">
                    {isAr ? 'إلى تاريخ' : 'To'}
                  </th>
                  <th className="py-2.5 px-3 font-bold text-text-muted uppercase text-start">
                    {isAr ? 'الأيام' : 'Days'}
                  </th>
                  <th className="py-2.5 px-3 font-bold text-text-muted uppercase text-start">
                    {isAr ? 'الحالة' : 'Status'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {history.map((h) => (
                  <tr key={h.id}>
                    <td className="py-2.5 px-3 font-semibold text-text">
                      {isAr ? (h.leave_type?.name_ar || h.leave_type?.name || 'إجازة') : (h.leave_type?.name || 'Leave')}
                    </td>
                    <td className="py-2.5 px-3 tabular-nums">{String(h.date_from).slice(0, 10)}</td>
                    <td className="py-2.5 px-3 tabular-nums">{String(h.date_to).slice(0, 10)}</td>
                    <td className="py-2.5 px-3 font-bold tabular-nums">
                      {h.days} {isAr ? 'يوم' : 'd'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        h.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-600' :
                        h.status === 'Rejected' ? 'bg-rose-500/10 text-rose-600' :
                        'bg-amber-500/10 text-amber-600'
                      }`}>
                        {isAr
                          ? (h.status === 'Approved' ? 'معتمد' : h.status === 'Rejected' ? 'مرفوض' : 'قيد الانتظار')
                          : h.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Apply Leave Modal */}
      <Modal
        isOpen={applyModalOpen}
        onClose={() => setApplyModalOpen(false)}
        title={isAr ? 'تقديم طلب إجازة' : 'Apply for Leave'}
        subtitle={isAr ? 'إرسال طلب الإجازة للمدير المباشر للاعتماد' : 'Submit leave request for Line Manager approval'}
        maxWidth="max-w-md"
      >
        <form id="leave-apply-form" onSubmit={handleApplyLeave} className="space-y-4 text-xs">
          <div>
            <Select
              label={isAr ? 'نوع الإجازة' : 'Leave Type'}
              required
              value={leaveTypeId}
              onChange={(e) => setLeaveTypeId(e.target.value)}
              options={balances.map((b) => ({
                value: b.leave_type_id || b.id,
                label: isAr ? (b.name_ar || b.name) : b.name,
                meta: isAr ? `${Number(b.remaining_balance ?? b.balance ?? 0).toFixed(1)} يوم متاح` : `${Number(b.remaining_balance ?? b.balance ?? 0).toFixed(1)} days available`,
              }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-text block mb-1">
                {isAr ? 'تاريخ البدء' : 'Start Date'}
              </label>
              <input
                id="apply-leave-date-from"
                type="date"
                required
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="topbar-field w-full px-3 py-2 rounded-lg border border-border"
              />
            </div>
            <div>
              <label className="font-bold text-text block mb-1">
                {isAr ? 'تاريخ الانتهاء' : 'End Date'}
              </label>
              <input
                id="apply-leave-date-to"
                type="date"
                required
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="topbar-field w-full px-3 py-2 rounded-lg border border-border"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-text block mb-1">
              {isAr ? 'سبب الإجازة' : 'Reason'}
            </label>
            <textarea
              id="apply-leave-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={isAr ? 'اذكر سبب الإجازة...' : 'Optional notes or reason for leave'}
              className="topbar-field w-full px-3 py-2 rounded-lg border border-border"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-border/40">
            <Button type="button" variant="outline" size="sm" onClick={() => setApplyModalOpen(false)}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button id="btn-submit-apply-leave" type="submit" variant="primary" size="sm" loading={submitting}>
              {isAr ? 'إرسال الطلب' : 'Submit Application'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
