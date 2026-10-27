'use client';

import React from 'react';
import { Modal } from '../../primitives/Modal';
import { RotateCcw, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';

export function ResetDefaultsModal({
  isOpen,
  onClose,
  sectionTitle,
  sectionKey,
  diffItems = [],
  onConfirm,
  isLoading = false,
}) {
  const { isRTL, language } = useLanguage();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={language === 'ar' ? `استعادة الإعدادات الافتراضية لقانون العمل الإماراتي: ${sectionTitle}` : `Reset to UAE Statutory Defaults: ${sectionTitle}`}
      subtitle={
        language === 'ar'
          ? 'معاينة الفروقات (Diff Preview) والتأكيد قبل استبدال القواعد الحالية'
          : 'Preview side-by-side diff against UAE Federal Decree-Law No. 33 of 2021 before resetting'
      }
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4 py-2">
        {/* Warning callout */}
        <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-text-muted space-y-1">
            <span className="font-bold text-amber-300 block">
              {language === 'ar' ? 'تنبيه التدقيق والتاريخ الفعّال (القاعدة G):' : 'Audit Log & Effective Dating Notice (Rule G):'}
            </span>
            <span>
              {language === 'ar'
                ? 'سيتم تسجيل هذا الإجراء بالكامل في سجل التدقيق (Audit Log)، مع حفظ نسخة تاريخية للإصدار الحالي. مسيرات الرواتب المقفلة سابقاً لن تتأثر إطلاقاً.'
                : 'This action creates an audit trail entry and snapshots the current state. Locked historical pay runs will never be modified.'}
            </span>
          </div>
        </div>

        {/* Diff Preview Table */}
        <div className="border border-border/60 rounded-xl overflow-hidden bg-surface/50">
          <div className="grid grid-cols-12 text-[11px] font-bold text-text-muted bg-surface p-2.5 border-b border-border/60">
            <div className="col-span-4">{language === 'ar' ? 'العنصر / الحقل' : 'Parameter / Item'}</div>
            <div className="col-span-4 text-rose-400">{language === 'ar' ? 'القيمة الحالية' : 'Current Value'}</div>
            <div className="col-span-4 text-emerald-400">{language === 'ar' ? 'القيمة القانونية الافتراضية' : 'Statutory Default'}</div>
          </div>

          <div className="divide-y divide-border/40 max-h-60 overflow-y-auto">
            {diffItems.length === 0 ? (
              <div className="p-4 text-center text-xs text-text-muted">
                {language === 'ar' ? 'الإعدادات الحالية مطابقة بالفعل للمعايير الافتراضية.' : 'Current configuration already matches statutory defaults.'}
              </div>
            ) : (
              diffItems.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 p-2.5 text-xs hover:bg-surface-hover/50 items-center">
                  <div className="col-span-4 font-medium text-text">{item.label}</div>
                  <div className="col-span-4 text-rose-400 font-mono text-[11px] truncate">{item.current}</div>
                  <div className="col-span-4 text-emerald-400 font-mono text-[11px] font-semibold truncate flex items-center gap-1.5">
                    <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>{item.defaultVal}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-3 border-t border-border/60 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-surface border border-border text-text hover:bg-surface-hover transition-colors"
          >
            {language === 'ar' ? 'إلغاء' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg transition-transform active:scale-95"
            style={{
              background: 'var(--primary)',
              color: 'var(--on-primary)',
            }}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>
              {isLoading
                ? (language === 'ar' ? 'جاري الاستعادة...' : 'Resetting...')
                : (language === 'ar' ? 'تأكيد الاستعادة إلى الافتراضي' : 'Confirm Reset to Default')}
            </span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
