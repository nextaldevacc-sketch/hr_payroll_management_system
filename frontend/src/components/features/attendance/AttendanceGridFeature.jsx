'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import {
  Calendar,
  Clock,
  Filter,
  CheckCircle,
  AlertTriangle,
  XCircle,
  User,
  Search,
  ChevronLeft,
  ChevronRight,
  Edit2,
  FileSpreadsheet,
  Download,
  Info,
  ShieldAlert,
} from 'lucide-react';
import { GlassCard } from '../../primitives/GlassCard';
import { StatusPill } from '../../primitives/StatusPill';
import { Modal } from '../../primitives/Modal';
import { Select } from '../../primitives/form/Select';
import { useVisa } from '../../../context/VisaContext';
import { withVisa } from '../../../lib/visaQuery';
import { getAttendanceGrid, editAttendanceDay } from '../../../services/attendanceApi';

const DAY_STATUS_CONFIG = {
  Present: { labelEn: 'Present', labelAr: 'حاضر', color: 'emerald', bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  Late: { labelEn: 'Late', labelAr: 'متأخر', color: 'amber', bg: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  Absent: { labelEn: 'Absent', labelAr: 'غائب', color: 'rose', bg: 'bg-rose-500/15 text-rose-400 border-rose-500/30' },
  Leave: { labelEn: 'Leave', labelAr: 'إجازة', color: 'blue', bg: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  PublicHoliday: { labelEn: 'Holiday', labelAr: 'عطلة رسمية', color: 'purple', bg: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
  HolidayWork: { labelEn: 'Holiday Work', labelAr: 'عمل بعطلة', color: 'purple', bg: 'bg-purple-500/20 text-purple-300 border-purple-400/40' },
  WeeklyOff: { labelEn: 'Rest Day', labelAr: 'راحة أسبوعية', color: 'slate', bg: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
  RestDayWork: { labelEn: 'Rest Work', labelAr: 'عمل براحة', color: 'indigo', bg: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30' },
  WorkDay: { labelEn: 'Work Day', labelAr: 'يوم عمل', color: 'teal', bg: 'bg-teal-500/10 text-teal-300 border-teal-500/20' },
};

export default function AttendanceGridFeature() {
  const { user, language } = useAuth();
  const { selectedVisaId } = useVisa();
  const isAr = language === 'ar';

  const [periodFrom, setPeriodFrom] = useState('2026-10-01');
  const [periodTo, setPeriodTo] = useState('2026-10-31');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');

  const [gridData, setGridData] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [daysHeader, setDaysHeader] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Edit Cell Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [activeCell, setActiveCell] = useState(null);
  const [editCheckIn, setEditCheckIn] = useState('');
  const [editCheckOut, setEditCheckOut] = useState('');
  const [editReason, setEditReason] = useState('');
  const [editError, setEditError] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Load Grid
  const loadGrid = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAttendanceGrid(
        withVisa(
          {
            from: periodFrom,
            to: periodTo,
            departmentId: selectedDept !== 'all' ? selectedDept : undefined,
          },
          selectedVisaId
        )
      );

      if (res) {
        setGridData(res.grid || []);
        setDepartments(res.departments || []);
        setDaysHeader(res.days || []);
      }
    } catch (err) {
      console.error('Failed to load attendance grid:', err);
      setError(err.message || 'Failed to load grid');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGrid();
  }, [periodFrom, periodTo, selectedDept, selectedVisaId]);

  // Open Edit Modal for a cell
  const handleCellClick = (emp, dayRecord, dateStr) => {
    setActiveCell({
      employee: emp,
      day: dayRecord,
      dateStr,
    });
    setEditCheckIn(dayRecord?.check_in ? dayRecord.check_in.substring(11, 16) : '08:00');
    setEditCheckOut(dayRecord?.check_out ? dayRecord.check_out.substring(11, 16) : '17:00');
    setEditReason('');
    setEditError('');
    setEditModalOpen(true);
  };

  const handleSaveCell = async (e) => {
    e.preventDefault();
    if (!editReason || editReason.trim().length < 5) {
      setEditError(isAr ? 'سبب التعديل إلزامي للتدقيق والامتثال (5 أحرف على الأقل)' : 'Mandatory reason required for audit compliance (min 5 chars)');
      return;
    }

    if (!activeCell?.day?.id) {
      setEditError(isAr ? 'تعذر العثور على سجل اليوم للتعديل' : 'No attendance record found for this day');
      return;
    }

    if (activeCell.day.review_status === 'HRConfirmed') {
      setEditError(isAr ? 'لا يمكن تعديل سجل حضور معتمد نهائياً من الموارد البشرية' : 'Cannot edit an HR-confirmed attendance day');
      return;
    }

    setSavingEdit(true);
    setEditError('');
    try {
      const datePrefix = activeCell.dateStr;
      const inIso = editCheckIn ? `${datePrefix}T${editCheckIn}:00.000Z` : null;
      const outIso = editCheckOut ? `${datePrefix}T${editCheckOut}:00.000Z` : null;

      await editAttendanceDay(activeCell.day.id, {
        check_in: inIso,
        check_out: outIso,
        reason: editReason.trim(),
      });

      setEditModalOpen(false);
      loadGrid();
    } catch (err) {
      setEditError(err.message || (isAr ? 'فشل حفظ التعديل' : 'Failed to save edit'));
    } finally {
      setSavingEdit(false);
    }
  };

  // Filter employees by search query
  const filteredGrid = gridData.filter((row) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const nameMatch = row.employee?.name?.toLowerCase().includes(q);
    const codeMatch = row.employee?.employee_number?.toLowerCase().includes(q);
    return nameMatch || codeMatch;
  });

  return (
    <div className="space-y-6" data-testid="attendance-grid-container">
      {/* Controls Bar */}
      <GlassCard className="p-4" role="region" aria-label="Attendance Grid Controls">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-surface/60 border border-border/80 px-3 py-1.5 rounded-xl">
              <Calendar className="w-4 h-4 text-primary shrink-0" />
              <span className="text-xs font-semibold text-text-muted">{isAr ? 'الفترة:' : 'Period:'}</span>
              <input
                type="date"
                id="grid-from-date"
                value={periodFrom}
                onChange={(e) => setPeriodFrom(e.target.value)}
                className="bg-transparent text-xs text-text font-mono border-none focus:outline-none"
              />
              <span className="text-xs text-text-muted">→</span>
              <input
                type="date"
                id="grid-to-date"
                value={periodTo}
                onChange={(e) => setPeriodTo(e.target.value)}
                className="bg-transparent text-xs text-text font-mono border-none focus:outline-none"
              />
            </div>

            {/* Department Filter */}
            {departments.length > 0 && (
              <div className="min-w-[180px]">
                <Select
                  id="grid-dept-filter"
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  options={[
                    { value: 'all', label: isAr ? 'جميع الأقسام' : 'All Departments' },
                    ...departments.map((d) => ({
                      value: d.id,
                      label: isAr ? (d.name_ar || d.name) : d.name,
                    })),
                  ]}
                />
              </div>
            )}

            {/* Employee Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                id="grid-employee-search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isAr ? 'بحث بالاسم أو الرقم...' : 'Search employee or ID...'}
                className="bg-surface/60 border border-border/80 pl-9 pr-3 py-1.5 rounded-xl text-xs text-text placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary w-48"
              />
            </div>
          </div>

          {/* Legend Badges */}
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              {isAr ? 'حاضر' : 'Present'}
            </span>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              {isAr ? 'متأخر' : 'Late'}
            </span>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-400 border border-rose-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
              {isAr ? 'غائب' : 'Absent'}
            </span>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-400 border border-blue-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
              {isAr ? 'إجازة' : 'Leave'}
            </span>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-400 border border-purple-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
              {isAr ? 'عطلة رسمية' : 'Holiday'}
            </span>
          </div>
        </div>
      </GlassCard>

      {/* Grid Table */}
      <GlassCard className="p-0 overflow-hidden" role="region" aria-label="Daily Attendance Grid">
        {loading ? (
          <div className="p-12 text-center text-text-muted flex flex-col items-center gap-3">
            <Clock className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm">{isAr ? 'جاري تحميل شبكة الحضور...' : 'Loading attendance grid...'}</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-400 flex flex-col items-center gap-2">
            <AlertTriangle className="w-8 h-8" />
            <p className="text-sm font-semibold">{error}</p>
          </div>
        ) : filteredGrid.length === 0 ? (
          <div className="p-12 text-center text-text-muted">
            <Info className="w-8 h-8 mx-auto mb-2 opacity-60" />
            <p className="text-sm font-medium">{isAr ? 'لا توجد بيانات حضور للفترة المحددة' : 'No attendance records found for this period'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[600px]">
            <table className="w-full text-left text-xs border-collapse" id="attendance-daily-grid">
              <thead>
                <tr className="bg-surface/80 border-b border-border sticky top-0 z-20 backdrop-blur-md">
                  <th className="p-3 font-bold text-text-muted min-w-[200px] sticky left-0 bg-surface/90 backdrop-blur-md z-30 border-r border-border/60">
                    {isAr ? 'الموظف' : 'Employee'}
                  </th>
                  {daysHeader.map((d) => {
                    const dateObj = new Date(d);
                    const dayNum = dateObj.getUTCDate();
                    const dayName = dateObj.toLocaleDateString(isAr ? 'ar-AE' : 'en-US', { weekday: 'narrow', timeZone: 'Asia/Dubai' });
                    const isFriOrSat = dateObj.getUTCDay() === 5 || dateObj.getUTCDay() === 6;

                    return (
                      <th
                        key={d}
                        className={`p-2 text-center font-mono font-bold min-w-[44px] max-w-[48px] border-r border-border/30 ${
                          isFriOrSat ? 'bg-surface-active/30 text-text-muted' : 'text-text'
                        }`}
                      >
                        <div className="text-[10px] text-text-muted font-sans uppercase">{dayName}</div>
                        <div className="text-xs">{dayNum}</div>
                      </th>
                    );
                  })}
                  <th className="p-3 font-bold text-text-muted text-center min-w-[90px]">
                    {isAr ? 'الإجمالي (س)' : 'Total (hrs)'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredGrid.map((row) => {
                  let totalWorked = 0;
                  return (
                    <tr key={row.employee.id} className="hover:bg-surface/40 transition-colors">
                      {/* Sticky Employee Info */}
                      <td className="p-3 sticky left-0 bg-surface/95 backdrop-blur-md z-10 border-r border-border/60">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                            {row.employee.name.charAt(0)}
                          </div>
                          <div className="truncate">
                            <span className="font-semibold text-text block truncate leading-tight" data-i18n-skip>
                              {row.employee.name}
                            </span>
                            <span className="text-[11px] font-mono text-text-muted" data-i18n-skip>
                              {row.employee.employee_number}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Day Cells */}
                      {daysHeader.map((d) => {
                        const dayRecord = row.days ? row.days[d] : null;
                        if (dayRecord && dayRecord.worked_hours) {
                          totalWorked += Number(dayRecord.worked_hours);
                        }

                        const dayType = dayRecord?.day_type || 'WorkDay';
                        const config = DAY_STATUS_CONFIG[dayType] || DAY_STATUS_CONFIG.WorkDay;
                        const hasMissingPunch = dayRecord?.exception_codes?.includes('MISSING_PUNCH');
                        const isLate = dayRecord?.late_minutes > 0;
                        const isHRConfirmed = dayRecord?.review_status === 'HRConfirmed';

                        return (
                          <td
                            key={d}
                            className="p-1 text-center border-r border-border/30 relative"
                          >
                            <button
                              type="button"
                              data-testid={`grid-cell-${row.employee.id}-${d}`}
                              onClick={() => handleCellClick(row.employee, dayRecord, d)}
                              title={`${row.employee.name} - ${d}: ${config.labelEn} (${dayRecord?.worked_hours || 0}h)`}
                              className={`w-full py-1.5 px-0.5 rounded text-[10px] font-mono font-bold transition-transform hover:scale-105 active:scale-95 border flex flex-col items-center justify-center ${
                                hasMissingPunch
                                  ? 'bg-orange-500/20 text-orange-400 border-orange-500/40 ring-1 ring-orange-500/50'
                                  : isLate
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                  : config.bg
                              }`}
                            >
                              <span>{dayRecord?.worked_hours ? `${Number(dayRecord.worked_hours).toFixed(0)}h` : '-'}</span>
                              {isHRConfirmed && (
                                <span className="w-1 h-1 rounded-full bg-emerald-400 absolute bottom-0.5 right-0.5"></span>
                              )}
                            </button>
                          </td>
                        );
                      })}

                      {/* Total Net Hours */}
                      <td className="p-3 text-center font-mono font-bold text-xs text-primary bg-primary/5">
                        {totalWorked.toFixed(1)}h
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* Mandatory Reason Cell Edit Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={isAr ? 'تعديل سجل الحضور اليومي (التدقيق الإلزامي)' : 'Edit Daily Attendance Day (Audit Enforced)'}
        subtitle={
          activeCell
            ? `${activeCell.employee.name} (${activeCell.employee.employee_number}) • ${activeCell.dateStr}`
            : ''
        }
      >
        <form onSubmit={handleSaveCell} className="space-y-4">
          {activeCell?.day?.review_status === 'HRConfirmed' && (
            <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>
                {isAr
                  ? 'هذا اليوم معتمد نهائياً من الموارد البشرية ومقفل ضد التعديل.'
                  : 'This day is confirmed by HR and strictly locked against manual modifications.'}
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-muted mb-1">
                {isAr ? 'وقت الحضور (دبي UTC+4)' : 'Check-In Time (Dubai UTC+4)'}
              </label>
              <input
                type="time"
                id="edit-checkin-input"
                data-testid="edit-checkin-input"
                disabled={activeCell?.day?.review_status === 'HRConfirmed'}
                value={editCheckIn}
                onChange={(e) => setEditCheckIn(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-text font-mono focus:ring-1 focus:ring-primary focus:outline-none disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-muted mb-1">
                {isAr ? 'وقت الانصراف (دبي UTC+4)' : 'Check-Out Time (Dubai UTC+4)'}
              </label>
              <input
                type="time"
                id="edit-checkout-input"
                data-testid="edit-checkout-input"
                disabled={activeCell?.day?.review_status === 'HRConfirmed'}
                value={editCheckOut}
                onChange={(e) => setEditCheckOut(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-text font-mono focus:ring-1 focus:ring-primary focus:outline-none disabled:opacity-50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text mb-1 flex items-center justify-between">
              <span>{isAr ? 'سبب التعديل الإلزامي (مطلوب للتدقيق)' : 'Mandatory Adjustment Reason (Audit Required)'}</span>
              <span className="text-rose-400 text-[11px]">*</span>
            </label>
            <textarea
              id="edit-reason-input"
              data-testid="edit-reason-input"
              rows={3}
              disabled={activeCell?.day?.review_status === 'HRConfirmed'}
              value={editReason}
              onChange={(e) => setEditReason(e.target.value)}
              placeholder={isAr ? 'اذكر سبب التعديل اليدوي، مثلاً: عطل بجهاز البصمة، مهمة عمل خارجية موثقة...' : 'Explain the reason, e.g. Biometric device malfunction, off-site client duty approved...'}
              className="w-full p-2.5 rounded-xl bg-surface border border-border text-xs text-text placeholder:text-text-muted focus:ring-1 focus:ring-primary focus:outline-none disabled:opacity-50"
            />
          </div>

          {editError && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{editError}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
            <button
              type="button"
              onClick={() => setEditModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-surface border border-border text-text hover:bg-surface-hover"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              id="save-cell-edit-btn"
              data-testid="save-cell-edit-btn"
              disabled={savingEdit || activeCell?.day?.review_status === 'HRConfirmed'}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-primary text-on-primary hover:opacity-90 transition-opacity shadow-md disabled:opacity-50 flex items-center gap-1.5"
            >
              {savingEdit && <Clock className="w-3.5 h-3.5 animate-spin" />}
              <span>{isAr ? 'حفظ التعديل والتدقيق' : 'Save Adjustment & Audit'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
