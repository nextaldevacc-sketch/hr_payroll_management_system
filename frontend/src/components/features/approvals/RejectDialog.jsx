'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Modal } from '../../primitives/Modal';
import { useLanguage } from '../../../context/LanguageContext';

export function RejectDialog({
  isOpen,
  onClose,
  onConfirm,
  actionType = 'REJECT',
  itemTitle = '',
  loading = false,
}) {
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setError('');
    }
  }, [isOpen]);

  const charCount = reason.trim().length;
  const isMinMet = charCount >= 10;

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!isMinMet) {
      setError(
        isAr
          ? 'سبب الرفض أو الإعادة يجب أن لا يقل عن 10 أحرف'
          : 'Rejection or return reason must be at least 10 characters'
      );
      return;
    }
    setError('');
    await onConfirm(reason.trim());
  };

  const isSendBack = actionType === 'SEND_BACK';

  const dialogTitle = isAr
    ? isSendBack
      ? 'إعادة الطلب للمراجعة والتصحيح'
      : 'رفض الطلب نهائياً'
    : isSendBack
    ? 'Return Request for Correction'
    : 'Reject Request';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={dialogTitle}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {itemTitle && (
          <div className="p-2.5 rounded-lg bg-surface-raised border border-border/80 text-xs text-text-muted">
            <span className="font-semibold text-text">{isAr ? 'العنصر:' : 'Item:'} </span>
            {itemTitle}
          </div>
        )}

        <div>
          <label
            htmlFor="reject-dialog-reason"
            className="block text-xs font-semibold text-text mb-1"
          >
            {isAr ? 'سبب الرفض / الإعادة (إلزامي):' : 'Reason for rejection/return (Mandatory):'}
          </label>
          <textarea
            id="reject-dialog-reason"
            data-testid="reject-dialog-reason-input"
            rows={4}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (error && e.target.value.trim().length >= 10) {
                setError('');
              }
            }}
            placeholder={
              isAr
                ? 'يرجى تقديم سبب مفصل ومحدد من 10 أحرف على الأقل...'
                : 'Please provide a clear and detailed explanation (minimum 10 characters)...'
            }
            className="w-full text-xs p-3 rounded-lg bg-surface border border-border text-text focus:outline-none focus:ring-1 focus:ring-primary"
            autoFocus
          />

          {/* Live character counter */}
          <div className="flex items-center justify-between mt-1.5 text-[11px]">
            <span
              className={`font-mono transition-colors ${
                isMinMet ? 'text-emerald-500 font-bold' : 'text-amber-500 font-medium'
              }`}
            >
              {isAr
                ? `${charCount} / 10 أحرف (الحد الأدنى)`
                : `${charCount} / 10 min characters`}
            </span>
            {!isMinMet && (
              <span className="text-amber-500/90 text-[10px]">
                {isAr
                  ? `متبقي ${10 - charCount} أحرف على الأقل`
                  : `${10 - charCount} more needed`}
              </span>
            )}
          </div>

          {error && (
            <p className="text-xs text-rose-400 mt-1 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{error}</span>
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-text-muted hover:text-text border border-border hover:bg-surface-raised transition-colors"
          >
            {isAr ? 'إلغاء' : 'Cancel'}
          </button>
          <button
            type="submit"
            id="btn-confirm-rejection"
            data-testid="btn-confirm-rejection"
            disabled={!isMinMet || loading}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              !isMinMet || loading
                ? 'bg-rose-500/30 text-rose-300/60 cursor-not-allowed'
                : 'bg-rose-600 hover:bg-rose-500 text-white shadow-sm'
            }`}
          >
            {loading
              ? isAr
                ? 'جاري الحفظ...'
                : 'Saving...'
              : isAr
              ? isSendBack
                ? 'تأكيد الإعادة'
                : 'تأكيد الرفض'
              : isSendBack
              ? 'Confirm Return'
              : 'Confirm Rejection'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default RejectDialog;
