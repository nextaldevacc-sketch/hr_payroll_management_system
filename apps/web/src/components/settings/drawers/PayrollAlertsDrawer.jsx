'use client';

import React, { useState } from 'react';
import { Drawer } from '../../primitives/Drawer';
import { Bell, AlertOctagon, FileCheck, Mail, Check, Calendar, UserCheck } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';

export function PayrollAlertsDrawer({
  isOpen,
  onClose,
  settings,
  canEdit = true,
  onSave,
}) {
  const { isRTL, language } = useLanguage();
  const [formData, setFormData] = useState({
    default_cutoff_day: settings?.default_cutoff_day || 25,
    variance_threshold_percent: settings?.variance_threshold_percent || 10.0,
    variance_threshold_aed: settings?.variance_threshold_aed || 1000.0,
    alert_days: settings?.alert_days || [90, 60, 30],
    digest_recipients: settings?.digest_recipients || ['hr.mgr@gulftech.ae', 'payroll@gulftech.ae', 'admin@gulftech.ae'],
  });

  const [newRecipient, setNewRecipient] = useState('');

  const handleAddRecipient = (e) => {
    e.preventDefault();
    if (!newRecipient || !newRecipient.includes('@')) return;
    if (!formData.digest_recipients.includes(newRecipient)) {
      setFormData({
        ...formData,
        digest_recipients: [...formData.digest_recipients, newRecipient.trim()],
      });
    }
    setNewRecipient('');
  };

  const handleRemoveRecipient = (email) => {
    setFormData({
      ...formData,
      digest_recipients: formData.digest_recipients.filter((e) => e !== email),
    });
  };

  const handleSave = () => {
    if (onSave) onSave(formData);
    onClose();
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={language === 'ar' ? 'فحوصات الرواتب وتنبيهات الوثائق' : 'Payroll Checks & Document Alerts'}
      subtitle={
        language === 'ar'
          ? 'يوم قطع المسير، نسبة ومبلغ التباين الإلزامي، ودورات تنبيهات انتهاء الإقامات والجوازات (90/60/30)'
          : 'Cut-off day, variance thresholds (% & AED), 90/60/30 document alerts, digest recipients'
      }
      width="max-w-xl"
    >
      <div className="space-y-4 pb-6">
        {/* Payroll Cut-off Day & Variance Threshold */}
        <div className="p-4 rounded-xl border border-border/70 bg-surface/50 space-y-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-text">
              {language === 'ar' ? 'يوم قطع مسير الرواتب الشهري (Cut-off Day)' : 'Default Monthly Pay Run Cut-Off Day'}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <input
              type="range"
              min="1"
              max="31"
              disabled={!canEdit}
              value={formData.default_cutoff_day}
              onChange={(e) => setFormData({ ...formData, default_cutoff_day: Number(e.target.value) })}
              className="flex-1 accent-primary"
            />
            <span className="w-16 text-center px-2 py-1 rounded-lg text-xs font-mono font-bold bg-surface border border-border text-primary">
              Day {formData.default_cutoff_day}
            </span>
          </div>
          <span className="text-[11px] text-text-muted block">
            {language === 'ar' ? 'اليوم 25 من كل شهر هو الموعد المعتمد لغلق الحركات وإعداد المسير' : 'Day 25 is the standard UAE cut-off date to capture month end attendance & OT.'}
          </span>
        </div>

        {/* Variance Thresholds (Rule 10: requires a mandatory reason) */}
        <div className="p-4 rounded-xl border border-border/70 bg-surface/50 space-y-3">
          <div className="flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-amber-400" />
            <div>
              <span className="text-xs font-bold text-text block">
                {language === 'ar' ? 'حدود التباين الإلزامية (Variance Threshold)' : 'Pay Run Variance Anomaly Thresholds'}
              </span>
              <span className="text-[11px] text-text-muted">
                {language === 'ar' ? 'أي زيادة تتجاوز هذه الحدود تُلزم مدقق الرواتب بتسجيل سبب معتمد قبل القفل' : 'Variance exceeding either threshold requires a mandatory reason before pay run lock'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-[11px] text-text-muted block mb-1">
                {language === 'ar' ? 'نسبة التباين المسموحة (%)' : 'Variance Percentage (%)'}
              </label>
              <input
                type="number"
                step="0.1"
                disabled={!canEdit}
                value={formData.variance_threshold_percent}
                onChange={(e) => setFormData({ ...formData, variance_threshold_percent: Number(e.target.value) })}
                className="w-full px-3 py-1.5 rounded-lg text-xs font-mono bg-surface border border-border text-text focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-[11px] text-text-muted block mb-1">
                {language === 'ar' ? 'مبلغ التباين المسموح (AED)' : 'Variance Absolute (AED)'}
              </label>
              <input
                type="number"
                step="50"
                disabled={!canEdit}
                value={formData.variance_threshold_aed}
                onChange={(e) => setFormData({ ...formData, variance_threshold_aed: Number(e.target.value) })}
                className="w-full px-3 py-1.5 rounded-lg text-xs font-mono bg-surface border border-border text-text focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* Document Expiry Alert Windows (90 / 60 / 30) */}
        <div className="p-4 rounded-xl border border-border/70 bg-surface/50 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-text">
                {language === 'ar' ? 'دورة تنبيهات الوثائق (إقامات، جوازات، رخص)' : 'Document Expiry Milestone Alerts'}
              </span>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-primary/20 text-primary">
              90 / 60 / 30 DAYS
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2.5 rounded-lg border border-border/60 bg-surface">
              <span className="text-[10px] text-text-muted block">{language === 'ar' ? 'التنبيه المبكر' : 'First Notice'}</span>
              <span className="text-sm font-extrabold font-mono text-text mt-0.5 block">90 Days</span>
            </div>
            <div className="p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10">
              <span className="text-[10px] text-amber-300 block">{language === 'ar' ? 'التنبيه الحرج' : 'Urgent Notice'}</span>
              <span className="text-sm font-extrabold font-mono text-amber-300 mt-0.5 block">60 Days</span>
            </div>
            <div className="p-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10">
              <span className="text-[10px] text-rose-300 block">{language === 'ar' ? 'التنبيه الطارئ' : 'Final Warning'}</span>
              <span className="text-sm font-extrabold font-mono text-rose-300 mt-0.5 block">30 Days</span>
            </div>
          </div>
        </div>

        {/* Digest Recipients */}
        <div className="p-4 rounded-xl border border-border/70 bg-surface/50 space-y-3">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-text">
              {language === 'ar' ? 'مستلمو النشرة الأسبوعية والامتثال (Weekly Digest)' : 'Weekly Compliance Digest Recipients'}
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {formData.digest_recipients.map((email) => (
              <span
                key={email}
                className="px-2.5 py-1 rounded-lg text-xs font-mono bg-surface border border-border text-text flex items-center gap-1.5"
              >
                <span>{email}</span>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => handleRemoveRecipient(email)}
                    className="text-text-muted hover:text-rose-400"
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
          </div>

          {canEdit && (
            <form onSubmit={handleAddRecipient} className="flex gap-2 pt-1">
              <input
                type="email"
                placeholder="Add recipient email..."
                value={newRecipient}
                onChange={(e) => setNewRecipient(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-lg text-xs font-mono bg-surface border border-border text-text focus:ring-1 focus:ring-primary"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-primary text-on-primary"
              >
                Add
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-border/60 flex items-center justify-between">
          <span className="text-[11px] text-text-muted">
            {language === 'ar' ? 'إعدادات المطابقة والإنذارات المبكرة' : 'Compliance & Anomaly Rules Active'}
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
                <span>{language === 'ar' ? 'حفظ إعدادات التنبيهات' : 'Save Checks & Alerts'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </Drawer>
  );
}
