'use client';

import React from 'react';
import { Modal } from '../../primitives/Modal';
import { AlertCircle, Ban, PowerOff } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';

export function DeleteInUseModal({
  isOpen,
  onClose,
  itemName,
  reason,
  onDeactivate,
  isDeactivating = false,
}) {
  const { isRTL, language } = useLanguage();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={language === 'ar' ? `تعذر الحذف: ${itemName}` : `Deletion Blocked: ${itemName}`}
      subtitle={
        language === 'ar'
          ? 'العنصر مرتبط بسجلات موظفين أو عقود نشطة أو مسيرات رواتب'
          : 'Rule E Protection: Item is actively referenced and cannot be permanently deleted'
      }
      maxWidth="max-w-lg"
    >
      <div className="space-y-4 py-2">
        <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs flex items-start gap-3">
          <Ban className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="text-text space-y-1">
            <span className="font-bold text-rose-300 block">
              {language === 'ar' ? 'منع الحذف لحماية سلامة البيانات (Rule E):' : 'Database Integrity Violation (Rule E):'}
            </span>
            <p className="text-text-muted leading-relaxed">
              {reason ||
                (language === 'ar'
                  ? 'هذا العنصر مستخدم حالياً من قبل موظفين أو مسيرات رواتب سابقة أو عقود عمل، ولا يمكن حذفه للحفاظ على دقة السجلات.'
                  : 'This entity is actively referenced in historical records, active employee contracts, or payslips. Deleting it would corrupt compliance records.')}
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-border/60 bg-surface/50 text-xs space-y-2">
          <span className="font-semibold text-text block">
            {language === 'ar' ? 'الحل الموصى به: إلغاء التفعيل (Deactivate)' : 'Recommended Solution: Deactivate Item'}
          </span>
          <p className="text-text-muted leading-relaxed">
            {language === 'ar'
              ? 'إلغاء التفعيل يمنع تعيين هذا العنصر للموظفين الجدد أو استخدامه في مسيرات الرواتب المستقبلية، مع الاحتفاظ بجميع السجلات والتقارير التاريخية.'
              : 'Deactivating hides this item from future contracts and dropdowns, while safely preserving all historical calculations, audit logs, and payslips intact.'}
          </p>
        </div>

        <div className="pt-3 border-t border-border/60 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeactivating}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-surface border border-border text-text hover:bg-surface-hover transition-colors"
          >
            {language === 'ar' ? 'إلغاء' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={onDeactivate}
            disabled={isDeactivating}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-colors flex items-center gap-2"
          >
            <PowerOff className="w-3.5 h-3.5" />
            <span>
              {isDeactivating
                ? (language === 'ar' ? 'جاري إلغاء التفعيل...' : 'Deactivating...')
                : (language === 'ar' ? 'إلغاء التفعيل بدلاً من الحذف' : 'Deactivate Instead')}
            </span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
