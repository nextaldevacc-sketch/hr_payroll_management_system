'use client';

import React, { useState } from 'react';
import { Drawer } from '../../primitives/Drawer';
import { Palmtree, FileCheck, Layers, AlertCircle, Plus, ShieldCheck, Check } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';

export function LeaveAccrualDrawer({
  isOpen,
  onClose,
  leaveTypes = [],
  canEdit = true,
  onSave,
}) {
  const { isRTL, language } = useLanguage();
  const [types, setTypes] = useState(leaveTypes);
  const [selectedType, setSelectedType] = useState(leaveTypes[0]);
  const [validationError, setValidationError] = useState(null);

  const handleUpdatePayBand = (index, field, value) => {
    if (!selectedType || !selectedType.pay_bands) return;
    const updatedBands = [...selectedType.pay_bands];
    updatedBands[index] = { ...updatedBands[index], [field]: Number(value) };

    // Validate pay bands sum up to max_days (Rule F)
    const totalDays = updatedBands.reduce((sum, b) => sum + (b.endDay - b.startDay + 1), 0);
    if (totalDays > selectedType.max_days) {
      setValidationError(`Pay bands exceed maximum allowed days (${totalDays} > ${selectedType.max_days})`);
    } else {
      setValidationError(null);
    }

    const updatedType = { ...selectedType, pay_bands: updatedBands };
    setSelectedType(updatedType);
    setTypes(types.map((t) => (t.id === updatedType.id ? updatedType : t)));
  };

  const handleSave = () => {
    if (validationError) return;
    if (onSave) onSave(types);
    onClose();
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={language === 'ar' ? 'أنواع الإجازات وخطط الاستحقاق التراكمي' : 'Leave Types & Accrual Plans'}
      subtitle={
        language === 'ar'
          ? 'شرائح دفع الأجر (كامل/نصف/بدون)، اشتراط التقارير، موافقة المدير العام، والاستحقاق الشهري'
          : 'Pay bands (full/half/none), medical attachments, GM approvals & monthly accruals'
      }
      width="max-w-2xl"
    >
      <div className="space-y-4 pb-6">
        {/* Horizontal Type Selector Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 border-b border-border/60">
          {types.map((lt) => {
            const isSelected = selectedType?.id === lt.id;
            return (
              <button
                key={lt.id}
                type="button"
                onClick={() => {
                  setSelectedType(lt);
                  setValidationError(null);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                  isSelected
                    ? 'border-primary bg-primary text-on-primary shadow-sm'
                    : 'border-border bg-surface text-text-muted hover:text-text hover:border-border/80'
                }`}
              >
                {lt.code} · {language === 'ar' ? lt.name_ar || lt.name : lt.name.split(' ')[0]}
              </button>
            );
          })}
        </div>

        {selectedType && (
          <div className="space-y-4">
            {/* Header Card */}
            <div className="p-4 rounded-xl border border-border/70 bg-surface/50 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: 'var(--primary-wash)', color: 'var(--primary)' }}
                  >
                    <Palmtree className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-text block">
                      {language === 'ar' ? selectedType.name_ar || selectedType.name : selectedType.name}
                    </span>
                    <span className="text-[11px] text-text-muted">
                      Code: <span className="font-mono font-bold text-primary">{selectedType.code}</span> · {selectedType.is_paid ? 'Paid Statutory Leave' : 'Unpaid Leave'}
                    </span>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-primary/10 text-primary border border-primary/20">
                  {selectedType.max_days} {language === 'ar' ? 'يوم كحد أقصى' : 'Max Days'}
                </span>
              </div>
            </div>

            {/* Pay Bands Section (Rule F validation) */}
            <div className="border border-border/70 rounded-xl overflow-hidden bg-surface/40">
              <div className="p-3 bg-surface border-b border-border/60 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-text block">
                    {language === 'ar' ? 'شرائح دفع الراتب ونسب الأجر (Pay Bands)' : 'Statutory Pay Bands (Day Ranges & Rates)'}
                  </span>
                  <span className="text-[11px] text-text-muted">
                    {language === 'ar' ? 'يجب أن يتطابق مجموع أيام الشرائح بدقة مع الحد الأقصى' : 'Ranges must strictly sum to the maximum statutory entitlement'}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/20 text-primary">
                  {selectedType.pay_bands?.length || 0} BANDS
                </span>
              </div>

              {validationError && (
                <div className="p-2.5 bg-rose-500/10 border-b border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{validationError}</span>
                </div>
              )}

              <div className="p-3 space-y-2.5">
                {selectedType.pay_bands?.map((band, idx) => (
                  <div key={idx} className="p-3 rounded-lg border border-border/60 bg-surface/60 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-surface border border-border text-[10px] font-mono flex items-center justify-center font-bold">
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-text">
                        {language === 'ar' ? band.labelAr : band.labelEn}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-text-muted">{language === 'ar' ? 'الأيام:' : 'Days:'}</span>
                        <span className="font-mono font-bold text-text">{band.startDay} – {band.endDay}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                        band.payPercentage === 100
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : band.payPercentage === 50
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-rose-500/20 text-rose-400'
                      }`}>
                        {band.payPercentage}% Pay
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Approval & Attachment Flags */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl border border-border/60 bg-surface/50 space-y-2">
                <span className="font-semibold text-text block">
                  {language === 'ar' ? 'اشتراط المرفقات الطبية' : 'Medical Attachment'}
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="attachCheck"
                    disabled={!canEdit}
                    checked={selectedType.requires_attachment}
                    onChange={(e) => {
                      const updated = { ...selectedType, requires_attachment: e.target.checked };
                      setSelectedType(updated);
                      setTypes(types.map((t) => (t.id === updated.id ? updated : t)));
                    }}
                    className="rounded border-border text-primary focus:ring-primary"
                  />
                  <label htmlFor="attachCheck" className="text-text-muted">
                    {language === 'ar' ? 'إلزام الموظف بإرفاق تقرير طبي معتمد' : 'Require MOHAP / DHA medical certificate'}
                  </label>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-border/60 bg-surface/50 space-y-2">
                <span className="font-semibold text-text block">
                  {language === 'ar' ? 'موافقة المدير العام (GM)' : 'GM Approval Required'}
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="gmCheck"
                    disabled={!canEdit}
                    checked={selectedType.requires_gm_approval}
                    onChange={(e) => {
                      const updated = { ...selectedType, requires_gm_approval: e.target.checked };
                      setSelectedType(updated);
                      setTypes(types.map((t) => (t.id === updated.id ? updated : t)));
                    }}
                    className="rounded border-border text-primary focus:ring-primary"
                  />
                  <label htmlFor="gmCheck" className="text-text-muted">
                    {language === 'ar' ? `مطلوبة إذا تجاوزت ${selectedType.gm_approval_threshold_days || 5} أيام` : `Trigger if > ${selectedType.gm_approval_threshold_days || 5} days`}
                  </label>
                </div>
              </div>
            </div>

            {/* Accrual Plan Settings (if applicable, e.g. Annual Leave) */}
            {selectedType.accrual && (
              <div className="p-3.5 rounded-xl border border-border/70 bg-surface/50 space-y-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold text-text">
                    {language === 'ar' ? 'خطة الاستحقاق والتراكم السنوي (Accrual Plan)' : 'Monthly Accrual & Carry-Over Rules'}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2 text-[11px]">
                  <div>
                    <span className="text-text-muted block">{language === 'ar' ? 'الاستحقاق/شهر' : 'Accrual/Mo'}</span>
                    <span className="font-mono font-bold text-text">{selectedType.accrual.days_per_month} days</span>
                  </div>
                  <div>
                    <span className="text-text-muted block">{language === 'ar' ? 'فترة الانتظار' : 'Probation'}</span>
                    <span className="font-mono font-bold text-text">{selectedType.accrual.waiting_period_months} months</span>
                  </div>
                  <div>
                    <span className="text-text-muted block">{language === 'ar' ? 'الحد السنوي' : 'Yearly Cap'}</span>
                    <span className="font-mono font-bold text-text">{selectedType.accrual.yearly_cap} days</span>
                  </div>
                  <div>
                    <span className="text-text-muted block">{language === 'ar' ? 'ترحيل الإجازات' : 'Max Carryover'}</span>
                    <span className="font-mono font-bold text-text">{selectedType.accrual.carry_over_max_days} days</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="pt-4 border-t border-border/60 flex items-center justify-between">
          <span className="text-[11px] text-text-muted">
            {types.length} {language === 'ar' ? 'أنواع إجازات معرفة' : 'configured leave types'}
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
                disabled={Boolean(validationError)}
                className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-transform active:scale-95 disabled:opacity-50"
                style={{ background: 'var(--primary)', color: 'var(--on-primary)' }}
              >
                <Check className="w-3.5 h-3.5" />
                <span>{language === 'ar' ? 'حفظ إعدادات الإجازات' : 'Save Leave Rules'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </Drawer>
  );
}
