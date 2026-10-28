'use client';

import React, { useState } from 'react';
import { Drawer } from '../../../primitives/Drawer';
import { Clock, ShieldAlert, Moon, Calendar, History, Plus, AlertCircle, Check } from 'lucide-react';
import { useLanguage } from '../../../../context/LanguageContext';

export function ShiftsPoliciesDrawer({
  isOpen,
  onClose,
  shifts = [],
  policy,
  canEdit = true,
  onSave,
  onViewHistory,
  onDeleteShift,
}) {
  const { isRTL, language } = useLanguage();
  const [activeTab, setActiveTab] = useState('shifts'); // 'shifts' | 'policy'
  const [shiftList, setShiftList] = useState(shifts);
  const [attendancePolicy, setAttendancePolicy] = useState(policy);
  const [effectiveFrom, setEffectiveFrom] = useState('2026-11-01'); // Default next unlocked pay period
  const [editingShiftId, setEditingShiftId] = useState(null);

  React.useEffect(() => {
    if (shifts && shifts.length > 0) {
      setShiftList(shifts);
    }
  }, [shifts]);

  React.useEffect(() => {
    if (policy) {
      setAttendancePolicy(policy);
    }
  }, [policy]);

  const handleUpdateShiftGrace = (shiftId, newGrace) => {
    setShiftList((prev) =>
      prev.map((s) => (s.id === shiftId ? { ...s, grace_minutes: Number(newGrace) } : s))
    );
  };

  const [isAddingShift, setIsAddingShift] = useState(false);
  const [newShift, setNewShift] = useState({
    name: '',
    name_ar: '',
    start_time: '08:00',
    end_time: '17:00',
    break_minutes: 60,
    grace_minutes: 15,
    weekly_off_days: ['Saturday', 'Sunday'],
    is_ramadan_reduced: true,
  });

  const handleAddShift = (e) => {
    e.preventDefault();
    if (!newShift.name) return;
    const created = {
      id: `s-custom-${Date.now()}`,
      name: newShift.name,
      name_ar: newShift.name_ar || newShift.name,
      start_time: newShift.start_time,
      end_time: newShift.end_time,
      break_minutes: Number(newShift.break_minutes),
      grace_minutes: Number(newShift.grace_minutes),
      weekly_off_days: newShift.weekly_off_days,
      is_ramadan_reduced: newShift.is_ramadan_reduced,
      effective_from: effectiveFrom,
      version: 1,
      is_active: true,
      assigned_count: 0,
      last_changed_by: 'Current User',
      last_changed_at: new Date().toISOString(),
    };
    setShiftList([...shiftList, created]);
    setIsAddingShift(false);
  };

  const handleDelete = (shift) => {
    if (shift.assigned_count > 0) {
      if (onDeleteShift) {
        onDeleteShift(
          shift,
          `Cannot delete Shift '${shift.name}': Assigned to ${shift.assigned_count} active employee contracts. Deactivate instead.`
        );
      }
      return;
    }
    setShiftList(shiftList.filter((s) => s.id !== shift.id));
  };

  const handleSave = () => {
    if (onSave) {
      onSave({ shifts: shiftList, policy: attendancePolicy, effective_from: effectiveFrom });
    }
    onClose();
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={language === 'ar' ? 'الورديات وسياسات الحضور والجزاءات' : 'Shifts & Attendance Policies'}
      subtitle={
        language === 'ar'
          ? 'مواعيد الورديات، ساعات شهر رمضان، تدرج جزاءات التأخير، وقواعد العمل الإضافي'
          : 'Work schedules, Ramadan hours, ordered penalty steps & overtime eligibility'
      }
      width="max-w-2xl"
    >
      <div className="space-y-4 pb-6">
        {/* Effective Dating Banner (Rule C) */}
        <div
          className="p-3 rounded-xl border text-xs flex items-center justify-between gap-3"
          style={{ background: 'var(--primary-wash)', borderColor: 'var(--glass-border)' }}
        >
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary shrink-0" />
            <span className="text-text-muted">
              {language === 'ar' ? 'التاريخ الفعّال للتغييرات (القاعدة C):' : 'Effective From Date (Rule C):'}
            </span>
          </div>
          <input
            type="date"
            value={effectiveFrom}
            onChange={(e) => setEffectiveFrom(e.target.value)}
            className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-surface border border-border text-text focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-border/60">
          <button
            type="button"
            onClick={() => setActiveTab('shifts')}
            className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'shifts'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? 'جداول الورديات' : 'Shift Schedules'}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-surface border border-border">
              {shiftList.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('policy')}
            className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'policy'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? 'سياسة التأخير والجزاءات التصاعدية' : 'Attendance & Penalty Policy'}</span>
          </button>
        </div>

        {/* Tab 1: Shifts */}
        {activeTab === 'shifts' && (
          <div className="space-y-4">
            <div className="space-y-3">
              {shiftList.map((shift) => (
                <div
                  key={shift.id}
                  data-testid={`shift-card-${shift.id}`}
                  className="p-3.5 rounded-xl border border-border/70 bg-surface/50 hover:border-border transition-colors space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-xs font-bold text-text">
                        {language === 'ar' ? shift.name_ar || shift.name : shift.name}
                      </span>
                      {shift.is_ramadan_reduced && (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/20 flex items-center gap-1">
                          <Moon className="w-3 h-3" />
                          <span>{language === 'ar' ? 'تخفيض رمضان (-2س)' : 'Ramadan -2h'}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-surface border border-border text-text">
                        {shift.assigned_count || 0} {language === 'ar' ? 'موظف' : 'assigned'}
                      </span>
                      {canEdit && (
                        <button
                          type="button"
                          data-testid={`shift-edit-btn-${shift.id}`}
                          onClick={() => setEditingShiftId(editingShiftId === shift.id ? null : shift.id)}
                          className="px-2 py-0.5 rounded text-[10px] font-bold border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                        >
                          {editingShiftId === shift.id
                            ? language === 'ar' ? 'إغلاق' : 'Done'
                            : language === 'ar' ? 'تعديل' : 'Edit'}
                        </button>
                      )}
                      {onViewHistory && (
                        <button
                          type="button"
                          onClick={() => onViewHistory('shift', shift.name)}
                          title="Version History"
                          className="p-1 rounded-lg text-text-muted hover:text-primary transition-colors"
                        >
                          <History className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-[11px] pt-1 border-t border-border/40">
                    <div>
                      <span className="text-text-muted block">{language === 'ar' ? 'البداية والنهاية' : 'Working Hours'}</span>
                      <span className="font-mono font-semibold text-text">{shift.start_time} - {shift.end_time}</span>
                    </div>
                    <div>
                      <span className="text-text-muted block">{language === 'ar' ? 'فترة الراحة' : 'Break'}</span>
                      <span className="font-mono font-semibold text-text">{shift.break_minutes}m</span>
                    </div>
                    <div>
                      <span className="text-text-muted block">{language === 'ar' ? 'فترة السماح' : 'Grace'}</span>
                      <span data-testid={`shift-grace-display-${shift.id}`} className="font-mono font-semibold text-text">{shift.grace_minutes}m</span>
                    </div>
                    <div>
                      <span className="text-text-muted block">{language === 'ar' ? 'العطلة الأسبوعية' : 'Off Days'}</span>
                      <span className="text-text truncate">{shift.weekly_off_days?.join(', ') || 'Sat, Sun'}</span>
                    </div>
                  </div>

                  {editingShiftId === shift.id && (
                    <div className="mt-2.5 p-3 rounded-xl bg-surface border border-primary/40 space-y-2 animate-in fade-in">
                      <div className="flex items-center justify-between gap-3">
                        <label htmlFor={`grace-input-${shift.id}`} className="text-xs font-semibold text-text">
                          {language === 'ar' ? 'تعديل فترة السماح (دقائق):' : 'Modify Grace Period (Minutes):'}
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input
                            id={`grace-input-${shift.id}`}
                            type="number"
                            data-testid="shift-grace-input"
                            data-shift-id={shift.id}
                            className="w-24 px-2 py-1 rounded-lg text-xs font-mono font-bold bg-background border border-primary text-text focus:ring-1 focus:ring-primary"
                            value={shift.grace_minutes}
                            onChange={(e) => handleUpdateShiftGrace(shift.id, e.target.value)}
                            min="0"
                            max="120"
                          />
                          <span className="text-xs font-semibold text-text-muted">min</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {canEdit && !isAddingShift && (
              <button
                type="button"
                onClick={() => setIsAddingShift(true)}
                className="w-full py-2.5 rounded-xl border border-dashed border-border hover:border-primary/50 text-xs font-bold text-text-muted hover:text-primary transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>{language === 'ar' ? 'إضافة وردية عمل جديدة' : 'Add New Work Shift'}</span>
              </button>
            )}

            {isAddingShift && (
              <form onSubmit={handleAddShift} className="p-4 rounded-xl border border-primary/40 bg-surface space-y-3">
                <span className="text-xs font-bold text-text block">
                  {language === 'ar' ? 'بيانات الوردية الجديدة' : 'New Shift Schedule'}
                </span>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Shift Name (English)"
                    required
                    value={newShift.name}
                    onChange={(e) => setNewShift({ ...newShift, name: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg text-xs bg-surface border border-border text-text focus:ring-1 focus:ring-primary"
                  />
                  <input
                    type="text"
                    dir="rtl"
                    placeholder="اسم الوردية بالعربية"
                    value={newShift.name_ar}
                    onChange={(e) => setNewShift({ ...newShift, name_ar: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg text-xs bg-surface border border-border text-text focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[10px] text-text-muted mb-1">{language === 'ar' ? 'وقت البدء' : 'Start Time'}</label>
                    <input
                      type="time"
                      value={newShift.start_time}
                      onChange={(e) => setNewShift({ ...newShift, start_time: e.target.value })}
                      className="w-full px-2 py-1 rounded-lg text-xs font-mono bg-surface border border-border text-text"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-text-muted mb-1">{language === 'ar' ? 'وقت الانتهاء' : 'End Time'}</label>
                    <input
                      type="time"
                      value={newShift.end_time}
                      onChange={(e) => setNewShift({ ...newShift, end_time: e.target.value })}
                      className="w-full px-2 py-1 rounded-lg text-xs font-mono bg-surface border border-border text-text"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-text-muted mb-1">{language === 'ar' ? 'الراحة (دقيقة)' : 'Break (min)'}</label>
                    <input
                      type="number"
                      value={newShift.break_minutes}
                      onChange={(e) => setNewShift({ ...newShift, break_minutes: e.target.value })}
                      className="w-full px-2 py-1 rounded-lg text-xs font-mono bg-surface border border-border text-text"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-text-muted mb-1">{language === 'ar' ? 'السماح (دقيقة)' : 'Grace (min)'}</label>
                    <input
                      type="number"
                      value={newShift.grace_minutes}
                      onChange={(e) => setNewShift({ ...newShift, grace_minutes: e.target.value })}
                      className="w-full px-2 py-1 rounded-lg text-xs font-mono bg-surface border border-border text-text"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="ramadanCheck"
                    checked={newShift.is_ramadan_reduced}
                    onChange={(e) => setNewShift({ ...newShift, is_ramadan_reduced: e.target.checked })}
                    className="rounded border-border text-primary focus:ring-primary"
                  />
                  <label htmlFor="ramadanCheck" className="text-xs text-text">
                    {language === 'ar' ? 'تطبيق ساعات شهر رمضان القانونية (تخفيض ساعتين)' : 'Apply statutory Ramadan hours (reduced 2 hours)'}
                  </label>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingShift(false)}
                    className="px-3 py-1 rounded-lg text-xs text-text-muted hover:text-text"
                  >
                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 rounded-lg text-xs font-bold bg-primary text-on-primary"
                  >
                    {language === 'ar' ? 'حفظ الوردية' : 'Save Shift'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Tab 2: Attendance & Penalty Policy */}
        {activeTab === 'policy' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-text mb-1">
                  {language === 'ar' ? 'فترة سماح التأخير (دقيقة)' : 'Late Grace Period (Minutes)'}
                </label>
                <input
                  type="number"
                  disabled={!canEdit}
                  value={attendancePolicy?.late_grace_minutes || 15}
                  onChange={(e) => setAttendancePolicy({ ...attendancePolicy, late_grace_minutes: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl text-xs font-mono bg-surface border border-border text-text focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text mb-1">
                  {language === 'ar' ? 'الحد الأدنى لاحتساب الإضافي (دقيقة)' : 'Min OT Threshold (Minutes)'}
                </label>
                <input
                  type="number"
                  disabled={!canEdit}
                  value={attendancePolicy?.min_ot_minutes || 30}
                  onChange={(e) => setAttendancePolicy({ ...attendancePolicy, min_ot_minutes: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl text-xs font-mono bg-surface border border-border text-text focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Progressive Penalties Steps Ordered Table */}
            <div className="border border-border/70 rounded-xl overflow-hidden bg-surface/40">
              <div className="p-3 bg-surface border-b border-border/60 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-text block">
                    {language === 'ar' ? 'جدول تدرج الجزاءات الشهرية (تصاعدي حسب التكرار)' : 'Progressive Monthly Penalty Steps (Ordered)'}
                  </span>
                  <span className="text-[11px] text-text-muted">
                    {language === 'ar' ? 'وفق المادة 39 من قانون العمل ولائحة الجزاءات' : 'Compliant with UAE Labor Law Progressive Disciplinary Table'}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {language === 'ar' ? 'الافتراضي التجريبي، حدد سياسة الشركة' : 'Demo default, set your company policy'}
                </span>
              </div>

              <div className="divide-y divide-border/40">
                {attendancePolicy?.penalty_steps?.map((step) => (
                  <div key={step.occurrence} className="p-3 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-primary/20 text-primary font-mono font-bold flex items-center justify-center text-[10px]">
                        #{step.occurrence}
                      </span>
                      <span className="font-semibold text-text">
                        {language === 'ar' ? step.descriptionAr : step.descriptionEn}
                      </span>
                    </div>

                    <span className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold bg-surface border border-border text-amber-400">
                      {step.deduction ? `${step.deduction}x Day Pay` : 'Warning Note'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-4 border-t border-border/60 flex items-center justify-between">
          <span className="text-[11px] text-text-muted">
            {language === 'ar' ? 'تسري التغييرات من الدورة غير المقفلة القادمة' : 'Changes effective from next unlocked run'}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-surface border border-border text-text hover:bg-surface-hover transition-colors"
            >
              {language === 'ar' ? 'إغلاق' : 'Close'}
            </button>
            {canEdit && (
              <button
                type="button"
                data-testid="save-shifts-btn"
                onClick={handleSave}
                className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-transform active:scale-95"
                style={{ background: 'var(--primary)', color: 'var(--on-primary)' }}
              >
                <Check className="w-3.5 h-3.5" />
                <span>{language === 'ar' ? 'حفظ السياسة والورديات' : 'Save Policies & Shifts'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </Drawer>
  );
}
