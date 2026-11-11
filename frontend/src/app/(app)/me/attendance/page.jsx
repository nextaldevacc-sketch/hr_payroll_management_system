'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  AlertCircle,
  CheckCircle2,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { IconWell } from '@/components/primitives/IconWell';
import { Button } from '@/components/primitives/form/Button';
import { Modal } from '@/components/primitives/Modal';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { formatErrorMessage } from '@/utils/formatError';
import { getMyAttendance, submitMyRequest } from '@/services/meApi';

export default function MyAttendancePage() {
  const { language } = useLanguage();
  const { showSuccess, showError } = useToast();
  const [currentMonth, setCurrentMonth] = useState('2026-10');
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [punchModalOpen, setPunchModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [punchTime, setPunchTime] = useState('09:00');
  const [punchReason, setPunchReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await getMyAttendance(currentMonth);
        setDays(res?.data || res || []);
      } catch (err) {
        console.warn('Failed to load attendance:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [currentMonth]);

  const handleOpenPunchModal = (day) => {
    setSelectedDay(day);
    setPunchTime(day?.shift?.start_time ? day.shift.start_time.slice(0, 5) : '09:00');
    setPunchReason('');
    setPunchModalOpen(true);
  };

  const handleSubmitMissingPunch = async (e) => {
    e.preventDefault();
    if (!selectedDay) return;
    setSubmitting(true);
    try {
      const workDateStr = String(selectedDay.work_date).slice(0, 10);
      const requestedDateTime = `${workDateStr}T${punchTime}:00Z`;
      await submitMyRequest({
        type: 'MissingPunch',
        work_date: workDateStr,
        requested_time: requestedDateTime,
        reason: punchReason || 'Employee submitted missing punch request',
      });
      showSuccess(language === 'ar' ? 'تم تقديم طلب تصحيح البصمة بنجاح' : 'Missing punch request submitted successfully');
      setPunchModalOpen(false);
    } catch (err) {
      showError(formatErrorMessage(err, language));
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (type, lateMin = 0) => {
    if (type === 'Present' && Number(lateMin) > 0) {
      return 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400';
    }
    switch (type) {
      case 'Present':
        return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400';
      case 'Absence':
        return 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400';
      case 'OnLeave':
        return 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400';
      case 'RestDay':
        return 'bg-slate-500/10 border-slate-500/20 text-slate-500';
      case 'PublicHoliday':
        return 'bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400';
      default:
        return 'bg-black/[0.02] border-border text-text-muted';
    }
  };

  return (
    <div id="my-attendance-container" className="space-y-6 animate-fadeIn pb-12 max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text gold-page-title">
            {language === 'ar' ? 'سجل حضوري ومناوباتي' : 'My Attendance & Shifts'}
          </h1>
          <p className="text-xs sm:text-sm text-text-muted mt-0.5">
            {language === 'ar'
              ? 'تقويم الحضور اليومي، التأخيرات، وتقديم طلبات تصحيح البصمة المفقودة'
              : 'Daily attendance calendar, check-in records, and missing punch requests'}
          </p>
        </div>

        {/* Month Selector */}
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={currentMonth}
            onChange={(e) => setCurrentMonth(e.target.value)}
            className="topbar-field text-xs font-semibold px-3 py-1.5 rounded-lg border border-border"
          />
        </div>
      </div>

      {/* Status Legend */}
      <div className="flex flex-wrap items-center gap-3 text-[11px] p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-border/60">
        <span className="font-bold text-text-muted">{language === 'ar' ? 'دليل الألوان:' : 'Legend:'}</span>
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-500" /> Present
        </span>
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 font-semibold">
          <span className="w-2 h-2 rounded-full bg-amber-500" /> Late Arrival
        </span>
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 font-semibold">
          <span className="w-2 h-2 rounded-full bg-rose-500" /> Absence
        </span>
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 font-semibold">
          <span className="w-2 h-2 rounded-full bg-blue-500" /> On Leave
        </span>
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 font-semibold">
          <span className="w-2 h-2 rounded-full bg-purple-500" /> Holiday
        </span>
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-500/10 text-slate-500 font-semibold">
          <span className="w-2 h-2 rounded-full bg-slate-400" /> Rest Day
        </span>
      </div>

      {/* Calendar Grid View */}
      <div className="glass-panel p-4 sm:p-6 rounded-2xl border border-border">
        {loading ? (
          <div className="py-12 text-center text-xs text-text-muted">Loading calendar...</div>
        ) : days.length === 0 ? (
          <div className="py-12 text-center text-xs text-text-muted">No attendance days for this month</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5 sm:gap-3">
            {days.map((day) => {
              const dateStr = String(day.work_date).slice(0, 10);
              const dayNum = dateStr.slice(8, 10);
              const lateMin = Number(day.late_minutes || 0);
              const colorClass = getStatusColor(day.day_type, lateMin);

              return (
                <div
                  key={day.id || dateStr}
                  onClick={() => handleOpenPunchModal(day)}
                  className={`p-3 rounded-xl border flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md min-h-[90px] ${colorClass}`}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-base font-black tabular-nums">{dayNum}</span>
                    <span className="text-[10px] font-bold uppercase">{day.day_type}</span>
                  </div>

                  <div className="text-[10px] space-y-0.5 mt-2">
                    {day.check_in ? (
                      <p className="tabular-nums">
                        In: {new Date(day.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    ) : (
                      <p className="italic opacity-70">No Check-in</p>
                    )}
                    {lateMin > 0 && (
                      <p className="font-bold text-amber-600 dark:text-amber-400">+{lateMin}m late</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Missing Punch Modal */}
      {selectedDay && (
        <Modal
          isOpen={punchModalOpen}
          onClose={() => setPunchModalOpen(false)}
          title={`Missing Punch Request — ${String(selectedDay.work_date).slice(0, 10)}`}
          subtitle="Submit missing check-in/out punch for Manager approval"
          maxWidth="max-w-md"
        >
          <form onSubmit={handleSubmitMissingPunch} className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-text block mb-1">Scheduled Date</label>
              <input
                type="text"
                disabled
                value={String(selectedDay.work_date).slice(0, 10)}
                className="topbar-field w-full px-3 py-2 rounded-lg border border-border bg-black/[0.03] dark:bg-white/[0.03]"
              />
            </div>

            <div>
              <label className="font-bold text-text block mb-1">Actual Punch Time</label>
              <input
                type="time"
                required
                value={punchTime}
                onChange={(e) => setPunchTime(e.target.value)}
                className="topbar-field w-full px-3 py-2 rounded-lg border border-border focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="font-bold text-text block mb-1">Reason / Explanation</label>
              <textarea
                rows={3}
                required
                value={punchReason}
                onChange={(e) => setPunchReason(e.target.value)}
                placeholder="e.g. Biometric device was offline or employee forgot badge"
                className="topbar-field w-full px-3 py-2 rounded-lg border border-border focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-border/40">
              <Button type="button" variant="outline" size="sm" onClick={() => setPunchModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" loading={submitting}>
                Submit Request
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
