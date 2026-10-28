'use client';

import React, { useState } from 'react';
import { Drawer } from '../../../primitives/Drawer';
import { Calendar, Plus, RotateCcw, Filter, Check, MapPin, Edit3 } from 'lucide-react';
import { useLanguage } from '../../../../context/LanguageContext';

export function PublicHolidaysDrawer({
  isOpen,
  onClose,
  holidays = [],
  branches = [],
  canEdit = true,
  onSave,
  onResetDefaults,
}) {
  const { isRTL, language } = useLanguage();
  const [holidayList, setHolidayList] = useState(holidays);
  const [selectedBranch, setSelectedBranch] = useState('ALL');
  const [isAdding, setIsAdding] = useState(false);
  const [newHoliday, setNewHoliday] = useState({
    name: '',
    name_ar: '',
    date: '2026-07-01',
    days: 1,
    branch_scope: 'ALL',
  });

  const filteredHolidays = selectedBranch === 'ALL'
    ? holidayList
    : holidayList.filter((h) => h.branch_scope === 'ALL' || h.branch_scope === selectedBranch);

  const handleAddHoliday = (e) => {
    e.preventDefault();
    if (!newHoliday.name || !newHoliday.date) return;
    const created = {
      id: `h-custom-${Date.now()}`,
      name: newHoliday.name,
      name_ar: newHoliday.name_ar || newHoliday.name,
      date: newHoliday.date,
      days: Number(newHoliday.days),
      branch_scope: newHoliday.branch_scope,
    };
    setHolidayList([...holidayList, created]);
    setNewHoliday({ name: '', name_ar: '', date: '2026-07-01', days: 1, branch_scope: 'ALL' });
    setIsAdding(false);
  };

  const handleSave = () => {
    if (onSave) onSave(holidayList);
    onClose();
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={language === 'ar' ? 'العطلات الرسمية لدولة الإمارات (2026)' : 'UAE Public Holidays Calendar (2026)'}
      subtitle={
        language === 'ar'
          ? 'عرض سنوي، استهداف الفروع، تعديل وتحديث التواريخ عند الإعلان الحكومي'
          : 'Year view for 2026, branch-specific or all-company holidays, add/move dates'
      }
      width="max-w-2xl"
    >
      <div className="space-y-4 pb-6">
        {/* Controls Bar: Branch Filter & Reset Defaults Button */}
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border/70 bg-surface/50">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-text-muted" />
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="px-2.5 py-1 rounded-lg text-xs bg-surface border border-border text-text focus:ring-1 focus:ring-primary"
            >
              <option value="ALL">{language === 'ar' ? 'جميع الفروع (شامل)' : 'All Branches (Company-wide)'}</option>
              {branches.map((b) => (
                <option key={b.id} value={b.name}>{b.name}</option>
              ))}
            </select>
          </div>

          {canEdit && onResetDefaults && (
            <button
              type="button"
              onClick={onResetDefaults}
              className="px-3 py-1 rounded-lg text-xs font-semibold text-text-muted hover:text-primary bg-surface border border-border hover:border-primary/40 transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{language === 'ar' ? 'استعادة عطلات 2026 الرسمية' : 'Reset to UAE 2026 Defaults'}</span>
            </button>
          )}
        </div>

        {/* Holidays List */}
        <div className="space-y-2.5">
          {filteredHolidays.map((holiday) => (
            <div
              key={holiday.id}
              className="p-3.5 rounded-xl border border-border/70 bg-surface/50 hover:border-border transition-colors flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-10 h-10 rounded-xl flex flex-col items-center justify-center border font-mono shrink-0"
                  style={{ background: 'var(--primary-wash)', borderColor: 'var(--glass-border)', color: 'var(--primary)' }}
                >
                  <span className="text-[10px] uppercase font-bold leading-none">
                    {new Date(holiday.date).toLocaleDateString('en-US', { month: 'short' })}
                  </span>
                  <span className="text-sm font-extrabold leading-none mt-0.5">
                    {new Date(holiday.date).getDate()}
                  </span>
                </div>

                <div className="min-w-0">
                  <span className="text-xs font-bold text-text block truncate">
                    {language === 'ar' ? holiday.name_ar || holiday.name : holiday.name}
                  </span>
                  <div className="flex items-center gap-2 text-[11px] text-text-muted mt-0.5">
                    <span className="font-mono">{holiday.date}</span>
                    <span>·</span>
                    <span>{holiday.days} {holiday.days === 1 ? (language === 'ar' ? 'يوم' : 'day') : (language === 'ar' ? 'أيام' : 'days')}</span>
                    <span>·</span>
                    <span className="px-1.5 py-0.2 rounded bg-surface border border-border text-[10px]">
                      {holiday.branch_scope === 'ALL' ? (language === 'ar' ? 'جميع الفروع' : 'All Branches') : holiday.branch_scope}
                    </span>
                  </div>
                </div>
              </div>

              {canEdit && (
                <div className="flex items-center gap-1 shrink-0">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    STATUTORY
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        {canEdit && !isAdding && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="w-full py-2.5 rounded-xl border border-dashed border-border hover:border-primary/50 text-xs font-bold text-text-muted hover:text-primary transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>{language === 'ar' ? 'إضافة عطلة رسمية أو استثنائية' : 'Add Official Public Holiday'}</span>
          </button>
        )}

        {isAdding && (
          <form onSubmit={handleAddHoliday} className="p-4 rounded-xl border border-primary/40 bg-surface space-y-3">
            <span className="text-xs font-bold text-text block">
              {language === 'ar' ? 'بيانات العطلة الرسمية الجديدة' : 'Add Official Holiday'}
            </span>

            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Holiday Name (English)"
                required
                value={newHoliday.name}
                onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg text-xs bg-surface border border-border text-text focus:ring-1 focus:ring-primary"
              />
              <input
                type="text"
                dir="rtl"
                placeholder="اسم العطلة بالعربية"
                value={newHoliday.name_ar}
                onChange={(e) => setNewHoliday({ ...newHoliday, name_ar: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg text-xs bg-surface border border-border text-text focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] text-text-muted mb-1">{language === 'ar' ? 'التاريخ' : 'Date'}</label>
                <input
                  type="date"
                  required
                  value={newHoliday.date}
                  onChange={(e) => setNewHoliday({ ...newHoliday, date: e.target.value })}
                  className="w-full px-2 py-1 rounded-lg text-xs font-mono bg-surface border border-border text-text"
                />
              </div>
              <div>
                <label className="block text-[10px] text-text-muted mb-1">{language === 'ar' ? 'عدد الأيام' : 'Days Duration'}</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={newHoliday.days}
                  onChange={(e) => setNewHoliday({ ...newHoliday, days: e.target.value })}
                  className="w-full px-2 py-1 rounded-lg text-xs font-mono bg-surface border border-border text-text"
                />
              </div>
              <div>
                <label className="block text-[10px] text-text-muted mb-1">{language === 'ar' ? 'نطاق التطبيق' : 'Branch Scope'}</label>
                <select
                  value={newHoliday.branch_scope}
                  onChange={(e) => setNewHoliday({ ...newHoliday, branch_scope: e.target.value })}
                  className="w-full px-2 py-1 rounded-lg text-xs bg-surface border border-border text-text"
                >
                  <option value="ALL">All Branches</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.name}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-3 py-1 rounded-lg text-xs text-text-muted hover:text-text"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="px-3 py-1 rounded-lg text-xs font-bold bg-primary text-on-primary"
              >
                {language === 'ar' ? 'حفظ العطلة' : 'Save Holiday'}
              </button>
            </div>
          </form>
        )}

        {/* Footer */}
        <div className="pt-4 border-t border-border/60 flex items-center justify-between">
          <span className="text-[11px] text-text-muted">
            {holidayList.length} {language === 'ar' ? 'عطلات رسمية مسجلة لسنة 2026' : 'holidays recorded for 2026'}
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
                onClick={handleSave}
                className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-transform active:scale-95"
                style={{ background: 'var(--primary)', color: 'var(--on-primary)' }}
              >
                <Check className="w-3.5 h-3.5" />
                <span>{language === 'ar' ? 'حفظ جدول العطلات' : 'Save Calendar'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </Drawer>
  );
}
