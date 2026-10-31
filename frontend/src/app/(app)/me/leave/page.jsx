'use client';

import React, { useState, useEffect } from 'react';
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
import { Modal } from '@/components/primitives/Modal';
import { useLanguage } from '@/context/LanguageContext';
import { getMyLeave, submitMyRequest } from '@/services/meApi';

export default function MyLeavePage() {
  const { language } = useLanguage();
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
        if (res) setData(res);
      } catch (err) {
        console.warn('Failed to load leave data:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

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
      alert(language === 'ar' ? 'تم تقديم طلب الإجازة بنجاح' : 'Leave request submitted successfully');
      setApplyModalOpen(false);
      // Reload
      const res = await getMyLeave();
      if (res) setData(res);
    } catch (err) {
      alert('Failed to submit leave request: ' + err.message);
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
            {language === 'ar' ? 'رصيد إجازاتي وسجل الاستحقاق' : 'My Leave Balances & Accruals'}
          </h1>
          <p className="text-xs sm:text-sm text-text-muted mt-0.5">
            {language === 'ar'
              ? 'متابعة رصيد الإجازات السنوية والمرضية، سجل الاستحقاق الشهري، وتقديم طلب إجازة جديد'
              : 'Track statutory annual & sick leave entitlements, accrual history, and request time off'}
          </p>
        </div>

        <Button
          size="sm"
          variant="primary"
          icon={<Plus className="w-3.5 h-3.5" />}
          onClick={() => {
            if (balances[0]) setLeaveTypeId(balances[0].leave_type_id || balances[0].id || '');
            setApplyModalOpen(true);
          }}
        >
          {language === 'ar' ? 'تقديم طلب إجازة' : 'Apply for Leave'}
        </Button>
      </div>

      {/* Balances Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {balances.map((b) => (
          <div key={b.code} className="glass-panel p-5 rounded-2xl border border-border space-y-3 hover:border-primary/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-text-muted uppercase">{b.name}</span>
              <IconWell size="sm" shape="square" color="primary">
                <CalendarDays className="w-4 h-4" />
              </IconWell>
            </div>
            <div>
              <span className="text-3xl font-black text-text tabular-nums">{b.balance}</span>
              <span className="text-xs text-text-muted font-semibold ms-1">
                {language === 'ar' ? 'أيام متبقية' : 'days left'}
              </span>
            </div>
            <div className="text-[11px] text-text-muted space-y-1 pt-2 border-t border-border/40">
              <div className="flex justify-between">
                <span>Allocated:</span>
                <span className="font-bold text-text tabular-nums">{b.allocated}d</span>
              </div>
              <div className="flex justify-between">
                <span>Taken:</span>
                <span className="font-bold text-rose-500 tabular-nums">-{b.taken}d</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Leave Request History */}
      <div className="glass-panel rounded-2xl border border-border p-5 space-y-4">
        <h2 className="text-sm font-bold text-text">
          {language === 'ar' ? 'سجل طلبات الإجازة السابقة' : 'Leave Request History'}
        </h2>

        {history.length === 0 ? (
          <p className="text-xs text-text-muted py-6 text-center">
            {language === 'ar' ? 'لا توجد طلبات إجازة سابقة' : 'No previous leave requests found'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start border-collapse">
              <thead>
                <tr className="border-b border-border bg-black/[0.02] dark:bg-white/[0.02]">
                  <th className="py-2.5 px-3 text-start font-bold text-text-muted">Type</th>
                  <th className="py-2.5 px-3 text-start font-bold text-text-muted">From</th>
                  <th className="py-2.5 px-3 text-start font-bold text-text-muted">To</th>
                  <th className="py-2.5 px-3 text-start font-bold text-text-muted">Days</th>
                  <th className="py-2.5 px-3 text-start font-bold text-text-muted">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {history.map((h) => (
                  <tr key={h.id}>
                    <td className="py-2.5 px-3 font-semibold text-text">{h.leave_type?.name || 'Leave'}</td>
                    <td className="py-2.5 px-3 tabular-nums">{String(h.date_from).slice(0, 10)}</td>
                    <td className="py-2.5 px-3 tabular-nums">{String(h.date_to).slice(0, 10)}</td>
                    <td className="py-2.5 px-3 font-bold tabular-nums">{h.days}d</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        h.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-600' :
                        h.status === 'Rejected' ? 'bg-rose-500/10 text-rose-600' :
                        'bg-amber-500/10 text-amber-600'
                      }`}>
                        {h.status}
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
        title="Apply for Leave"
        subtitle="Submit leave request for Line Manager approval"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleApplyLeave} className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-text block mb-1">Leave Type</label>
            <select
              required
              value={leaveTypeId}
              onChange={(e) => setLeaveTypeId(e.target.value)}
              className="topbar-field w-full px-3 py-2 rounded-lg border border-border"
            >
              {balances.map((b) => (
                <option key={b.code} value={b.leave_type_id || b.id}>
                  {b.name} ({b.balance} days available)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-text block mb-1">Start Date</label>
              <input
                type="date"
                required
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="topbar-field w-full px-3 py-2 rounded-lg border border-border"
              />
            </div>
            <div>
              <label className="font-bold text-text block mb-1">End Date</label>
              <input
                type="date"
                required
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="topbar-field w-full px-3 py-2 rounded-lg border border-border"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-text block mb-1">Reason</label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Optional notes or reason for leave"
              className="topbar-field w-full px-3 py-2 rounded-lg border border-border"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-border/40">
            <Button type="button" variant="outline" size="sm" onClick={() => setApplyModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={submitting}>
              Submit Application
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
