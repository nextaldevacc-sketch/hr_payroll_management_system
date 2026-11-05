'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  Calendar,
  Search,
  Filter,
  Check,
  Info,
  ShieldCheck,
} from 'lucide-react';
import { GlassCard } from '../../primitives/GlassCard';
import { Modal } from '../../primitives/Modal';
import { getMissingPunchQueue, resolveMissingPunch } from '../../../services/attendanceApi';

export default function MissingPunchQueueFeature({ onResolved }) {
  const { user, language } = useAuth();
  const isAr = language === 'ar';

  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Resolve Modal State
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [checkInTime, setCheckInTime] = useState('');
  const [checkOutTime, setCheckOutTime] = useState('');
  const [resolveReason, setResolveReason] = useState('');
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState('');

  const loadQueue = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMissingPunchQueue();
      const items = Array.isArray(data) ? data : (data?.data || data?.items || []);
      setQueue(items);
    } catch (err) {
      console.error('Failed to load missing punch queue:', err);
      setError(err.message || 'Failed to load missing punch queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const handleOpenResolve = (item) => {
    setSelectedItem(item);
    // Suggest times from existing punch or shift
    const defaultIn = item.check_in ? item.check_in.substring(11, 16) : (item.shift?.start_time ? item.shift.start_time.substring(0, 5) : '08:00');
    const defaultOut = item.check_out ? item.check_out.substring(11, 16) : (item.shift?.end_time ? item.shift.end_time.substring(0, 5) : '17:00');
    setCheckInTime(defaultIn);
    setCheckOutTime(defaultOut);
    setResolveReason('');
    setResolveError('');
    setResolveModalOpen(true);
  };

  const handleConfirmResolve = async (e) => {
    e.preventDefault();
    if (!resolveReason || resolveReason.trim().length < 5) {
      setResolveError(isAr ? 'سبب المعالجة إلزامي للتدقيق والامتثال (5 أحرف على الأقل)' : 'Mandatory reason required for audit compliance (min 5 chars)');
      return;
    }

    if (!checkInTime || !checkOutTime) {
      setResolveError(isAr ? 'يجب تحديد وقتي الحضور والانصراف معاً' : 'Both check-in and check-out times are required');
      return;
    }

    setResolving(true);
    setResolveError('');
    try {
      const datePrefix = new Date(selectedItem.work_date).toISOString().substring(0, 10);
      const inIso = `${datePrefix}T${checkInTime}:00.000Z`;
      const outIso = `${datePrefix}T${checkOutTime}:00.000Z`;

      await resolveMissingPunch(selectedItem.id, {
        check_in: inIso,
        check_out: outIso,
        reason: resolveReason.trim(),
      });

      setResolveModalOpen(false);
      loadQueue();
      if (onResolved) onResolved();
    } catch (err) {
      setResolveError(err.message || (isAr ? 'فشلت معالجة البصمة المفقودة' : 'Failed to resolve missing punch'));
    } finally {
      setResolving(false);
    }
  };

  const filteredQueue = queue.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const nameMatch = item.employee?.name?.toLowerCase().includes(q);
    const codeMatch = item.employee?.employee_number?.toLowerCase().includes(q);
    return nameMatch || codeMatch;
  });

  return (
    <div className="space-y-4" data-testid="missing-punch-queue-container">
      {/* Top Banner / Counter */}
      <GlassCard className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/15 text-orange-400 flex items-center justify-center font-bold">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text flex items-center gap-2">
                <span>{isAr ? 'طابور استثناءات البصمات المفقودة' : 'Missing Punch Exception Queue'}</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  {queue.length}
                </span>
              </h3>
              <p className="text-xs text-text-muted">
                {isAr
                  ? 'أيام تتضمن بصمة دخول بدون خروج أو العكس، تتطلب معالجة مع تسجيل سبب التدقيق الإلزامي'
                  : 'Days with check-in without check-out or vice-versa. Requires resolution with mandatory audit reason.'}
              </p>
            </div>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isAr ? 'بحث بالاسم أو الرقم...' : 'Filter employee...'}
              className="bg-surface/60 border border-border pl-9 pr-3 py-1.5 rounded-xl text-xs text-text placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary w-52"
            />
          </div>
        </div>
      </GlassCard>

      {/* Queue Table */}
      <GlassCard className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-text-muted flex flex-col items-center gap-2">
            <Clock className="w-6 h-6 animate-spin text-primary" />
            <p className="text-xs">{isAr ? 'جاري تحميل قائمة البصمات المفقودة...' : 'Loading exceptions queue...'}</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-400 text-xs">{error}</div>
        ) : filteredQueue.length === 0 ? (
          <div className="p-12 text-center text-text-muted flex flex-col items-center gap-2">
            <ShieldCheck className="w-10 h-10 text-emerald-400" />
            <p className="text-sm font-bold text-text">
              {isAr ? 'لا توجد بصمات مفقودة بانتظار المعالجة!' : 'All clear! No missing punch exceptions.'}
            </p>
            <p className="text-xs text-text-muted">
              {isAr ? 'تم استيفاء جميع بصمات الدخول والخروج بنجاح.' : 'Every scheduled work day has complete in/out punch pairs.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-surface/70 border-b border-border text-text-muted">
                  <th className="p-3.5 font-bold">{isAr ? 'الموظف' : 'Employee'}</th>
                  <th className="p-3.5 font-bold">{isAr ? 'التاريخ' : 'Work Date'}</th>
                  <th className="p-3.5 font-bold">{isAr ? 'الوردية' : 'Scheduled Shift'}</th>
                  <th className="p-3.5 font-bold">{isAr ? 'البصمة المسجلة' : 'Recorded Punch'}</th>
                  <th className="p-3.5 font-bold">{isAr ? 'البصمة المفقودة' : 'Missing Punch'}</th>
                  <th className="p-3.5 font-bold text-center">{isAr ? 'الإجراء' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 font-mono">
                {filteredQueue.map((item) => {
                  const dateStr = new Date(item.work_date).toLocaleDateString(isAr ? 'ar-AE' : 'en-US', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    timeZone: 'Asia/Dubai',
                  });

                  const hasCheckIn = !!item.check_in;
                  const hasCheckOut = !!item.check_out;

                  return (
                    <tr key={item.id} className="hover:bg-surface/30">
                      <td className="p-3.5 font-sans">
                        <div className="font-semibold text-text" data-i18n-skip>{item.employee?.name}</div>
                        <div className="text-[11px] text-text-muted" data-i18n-skip>{item.employee?.employee_number}</div>
                      </td>
                      <td className="p-3.5 font-sans text-text">{dateStr}</td>
                      <td className="p-3.5 font-sans">
                        <div className="text-text font-medium">{item.shift?.name || 'Standard'}</div>
                        <div className="text-[11px] text-text-muted font-mono">
                          {item.shift ? `${item.shift.start_time.substring(0, 5)} - ${item.shift.end_time.substring(0, 5)}` : '08:00 - 17:00'}
                        </div>
                      </td>
                      <td className="p-3.5">
                        {hasCheckIn ? (
                          <span className="px-2 py-0.5 rounded text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                            IN: {item.check_in.substring(11, 16)}
                          </span>
                        ) : hasCheckOut ? (
                          <span className="px-2 py-0.5 rounded text-blue-400 bg-blue-500/10 border border-blue-500/20">
                            OUT: {item.check_out.substring(11, 16)}
                          </span>
                        ) : (
                          <span className="text-text-muted">-</span>
                        )}
                      </td>
                      <td className="p-3.5">
                        {!hasCheckIn ? (
                          <span className="px-2 py-0.5 rounded text-rose-400 bg-rose-500/15 border border-rose-500/30 font-bold">
                            Missing Check-In
                          </span>
                        ) : !hasCheckOut ? (
                          <span className="px-2 py-0.5 rounded text-rose-400 bg-rose-500/15 border border-rose-500/30 font-bold">
                            Missing Check-Out
                          </span>
                        ) : null}
                      </td>
                      <td className="p-3.5 text-center font-sans">
                        <button
                          type="button"
                          id={`resolve-btn-${item.id}`}
                          data-testid={`resolve-btn-${item.id}`}
                          onClick={() => handleOpenResolve(item)}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-colors shadow-sm"
                        >
                          {isAr ? 'معالجة البصمة' : 'Resolve'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* Quick Resolve Modal */}
      <Modal
        isOpen={resolveModalOpen}
        onClose={() => setResolveModalOpen(false)}
        title={isAr ? 'معالجة البصمة المفقودة (التدقيق الإلزامي)' : 'Resolve Missing Punch (Mandatory Audit)'}
        subtitle={
          selectedItem
            ? `${selectedItem.employee?.name} (${selectedItem.employee?.employee_number}) • ${new Date(selectedItem.work_date).toISOString().substring(0, 10)}`
            : ''
        }
      >
        <form onSubmit={handleConfirmResolve} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-muted mb-1">
                {isAr ? 'وقت الحضور (دبي UTC+4)' : 'Check-In Time (Dubai UTC+4)'}
              </label>
              <input
                type="time"
                id="resolve-checkin-input"
                data-testid="resolve-checkin-input"
                value={checkInTime}
                onChange={(e) => setCheckInTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-text font-mono focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-muted mb-1">
                {isAr ? 'وقت الانصراف (دبي UTC+4)' : 'Check-Out Time (Dubai UTC+4)'}
              </label>
              <input
                type="time"
                id="resolve-checkout-input"
                data-testid="resolve-checkout-input"
                value={checkOutTime}
                onChange={(e) => setCheckOutTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-text font-mono focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text mb-1 flex items-center justify-between">
              <span>{isAr ? 'سبب المعالجة الإلزامي للتدقيق' : 'Mandatory Resolution Reason'}</span>
              <span className="text-rose-400 text-[11px]">*</span>
            </label>
            <textarea
              id="resolve-reason-input"
              data-testid="resolve-reason-input"
              rows={3}
              value={resolveReason}
              onChange={(e) => setResolveReason(e.target.value)}
              placeholder={isAr ? 'مثال: نسيان البصمة عند الانصراف مع تأكيد المسؤول، عطل قارئ البصمة...' : 'Example: Employee forgot to punch out; verified presence on floor with manager...'}
              className="w-full p-2.5 rounded-xl bg-surface border border-border text-xs text-text placeholder:text-text-muted focus:ring-1 focus:ring-primary focus:outline-none"
            />
          </div>

          {resolveError && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{resolveError}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
            <button
              type="button"
              onClick={() => setResolveModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-surface border border-border text-text hover:bg-surface-hover"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              id="confirm-resolve-btn"
              data-testid="confirm-resolve-btn"
              disabled={resolving}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-primary text-on-primary hover:opacity-90 transition-opacity shadow-md disabled:opacity-50 flex items-center gap-1.5"
            >
              {resolving && <Clock className="w-3.5 h-3.5 animate-spin" />}
              <span>{isAr ? 'تأكيد وحفظ المعالجة' : 'Confirm & Clear Exception'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
