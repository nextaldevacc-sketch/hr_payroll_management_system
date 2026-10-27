'use client';

import React from 'react';
import { Modal } from '../../primitives/Modal';
import { History, Calendar, User, ArrowRight, ShieldCheck, Clock } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';

export function VersionHistoryModal({ isOpen, onClose, entityName, versions = [] }) {
  const { isRTL, language } = useLanguage();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={language === 'ar' ? `سجل الإصدارات والتاريخ الفعّال: ${entityName}` : `Effective Version History: ${entityName}`}
      subtitle={
        language === 'ar'
          ? 'التعديلات المؤرخة بالتواريخ الفعالة وسجلات التدقيق غير القابلة للتعديل'
          : 'Effective-dated audit snapshots and immutable rule historical states'
      }
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4 py-2">
        <div
          className="p-3 rounded-xl border text-xs flex items-center gap-2.5"
          style={{ background: 'var(--primary-wash)', borderColor: 'var(--glass-border)' }}
        >
          <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
          <span className="text-text-muted">
            {language === 'ar'
              ? 'تلتزم جميع التغييرات بالقاعدة C: مسيرات الرواتب المقفلة (Locked) تستمر في استخدام الإصدارات المحفوظة حين حسابها ولا تتأثر بالتعديلات اللاحقة.'
              : 'Rule C Immutability: Locked pay runs permanently preserve the specific version rule snapshot they were calculated with.'}
          </span>
        </div>

        <div className="space-y-3">
          {versions.length === 0 ? (
            <div className="text-center py-8 text-text-muted text-xs">
              {language === 'ar' ? 'لا توجد إصدارات سابقة مسجلة لهذا العنصر بعد.' : 'No previous version history recorded for this entity yet.'}
            </div>
          ) : (
            versions.map((v, idx) => (
              <div
                key={v.id || idx}
                className="p-4 rounded-xl border border-border/60 hover:border-border transition-colors space-y-2 bg-surface/40"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-primary/20 text-primary border border-primary/30">
                      v{v.version || (versions.length - idx)}
                    </span>
                    <span className="text-xs font-semibold text-text">
                      {v.summary || (idx === 0 ? (language === 'ar' ? 'الإصدار الحالي النشط' : 'Current Active Version') : (language === 'ar' ? 'إصدار تاريخي محفوظ' : 'Archived Historic Version'))}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{language === 'ar' ? 'يسري من:' : 'Effective:'}</span>
                    <span className="font-mono font-semibold text-text">{v.effective_from || '2026-01-01'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-text-muted pt-1 border-t border-border/40">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3 h-3" />
                    <span>{v.changed_by || 'Maryam Al-Nuaimi (HR Manager)'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    <span>{v.created_at ? new Date(v.created_at).toLocaleDateString() : '2026-10-20'}</span>
                  </div>
                </div>

                {v.diff && (
                  <pre className="text-[10px] font-mono bg-black/30 p-2 rounded-lg text-emerald-400 overflow-x-auto mt-2">
                    {typeof v.diff === 'string' ? v.diff : JSON.stringify(v.diff, null, 2)}
                  </pre>
                )}
              </div>
            ))
          )}
        </div>

        <div className="pt-3 border-t border-border/60 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-surface border border-border text-text hover:bg-surface-hover transition-colors"
          >
            {language === 'ar' ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
