'use client';

import React, { useState } from 'react';
import { Drawer } from '../../primitives/Drawer';
import { Building2, FileText, CreditCard, ShieldCheck, Plus, Check, Globe, Upload } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';

export function CompanyProfileDrawer({
  isOpen,
  onClose,
  company,
  canEdit = true,
  onSave,
}) {
  const { isRTL, language } = useLanguage();
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'visas'

  const [formData, setFormData] = useState({
    name: company?.name || 'Gulf Tech Logistics LLC',
    name_ar: company?.name_ar || 'شركة جلف تك للخدمات اللوجستية ش.ذ.م.م',
    trade_license_no: company?.trade_license_no || 'TL-DXB-2024-001',
    default_language: company?.default_language || 'en',
    logo_url: company?.logo_url || '/logo.png',
  });

  const [visas, setVisas] = useState(company?.visas || []);
  const [isAddingVisa, setIsAddingVisa] = useState(false);
  const [newVisa, setNewVisa] = useState({
    name: '',
    name_ar: '',
    mohre_employer_id: '',
    bank_routing_code: '',
  });

  const handleAddVisa = (e) => {
    e.preventDefault();
    if (!newVisa.name || !newVisa.mohre_employer_id || !newVisa.bank_routing_code) return;
    const created = {
      id: `v-custom-${Date.now()}`,
      name: newVisa.name,
      name_ar: newVisa.name_ar || newVisa.name,
      mohre_employer_id: newVisa.mohre_employer_id,
      bank_routing_code: newVisa.bank_routing_code,
      wps_file_name: `SIF_${newVisa.mohre_employer_id.replace(/[^a-zA-Z0-9]/g, '')}_202610.sif`,
      employee_count: 0,
      is_active: true,
    };
    setVisas([...visas, created]);
    setNewVisa({ name: '', name_ar: '', mohre_employer_id: '', bank_routing_code: '' });
    setIsAddingVisa(false);
  };

  const handleSave = () => {
    if (onSave) {
      onSave({ ...formData, visas });
    }
    onClose();
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={language === 'ar' ? 'ملف الشركة وتأشيرات الكيان' : 'Company Profile & Visas'}
      subtitle={
        language === 'ar'
          ? 'الاسم، الرخصة التجارية، وشبكة تأشيرات الوزارة (ملف حماية الأجور WPS لكل تأشيرة)'
          : 'Legal registration, trade licence, and company visas (one WPS file per visa)'
      }
      width="max-w-xl"
    >
      <div className="space-y-5 pb-6">
        {/* Navigation Tabs */}
        <div className="flex border-b border-border/60">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'profile'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            {language === 'ar' ? 'بيانات المنشأة والرخصة' : 'Corporate Profile'}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('visas')}
            className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'visas'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            <span>{language === 'ar' ? 'تأشيرات الكيان ونظام حماية الأجور' : 'Company Visas & WPS'}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-surface border border-border">
              {visas.length}
            </span>
          </button>
        </div>

        {/* Tab 1: Profile Form */}
        {activeTab === 'profile' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-text mb-1">
                {language === 'ar' ? 'الاسم القانوني للشركة (إنجليزي)' : 'Legal Company Name (English)'}
              </label>
              <input
                type="text"
                disabled={!canEdit}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl text-xs bg-surface border border-border text-text focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text mb-1">
                {language === 'ar' ? 'الاسم القانوني للشركة (عربي)' : 'Legal Company Name (Arabic)'}
              </label>
              <input
                type="text"
                dir="rtl"
                disabled={!canEdit}
                value={formData.name_ar}
                onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                className="w-full px-3 py-2 rounded-xl text-xs bg-surface border border-border text-text focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-text mb-1">
                  {language === 'ar' ? 'رقم الرخصة التجارية' : 'Trade Licence Number'}
                </label>
                <div className="relative">
                  <FileText className="w-3.5 h-3.5 absolute start-3 top-3 text-text-muted" />
                  <input
                    type="text"
                    disabled={!canEdit}
                    value={formData.trade_license_no}
                    onChange={(e) => setFormData({ ...formData, trade_license_no: e.target.value })}
                    className="w-full ps-9 pe-3 py-2 rounded-xl text-xs font-mono bg-surface border border-border text-text focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text mb-1">
                  {language === 'ar' ? 'اللغة الافتراضية للنظام' : 'Default Platform Language'}
                </label>
                <select
                  disabled={!canEdit}
                  value={formData.default_language}
                  onChange={(e) => setFormData({ ...formData, default_language: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-surface border border-border text-text focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
                >
                  <option value="en">English (LTR)</option>
                  <option value="ar">العربية (RTL)</option>
                </select>
              </div>
            </div>

            {/* Logo Upload Box */}
            <div className="p-3.5 rounded-xl border border-dashed border-border/80 bg-surface/40 flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-xl border flex items-center justify-center font-bold text-base shrink-0"
                style={{ background: 'var(--primary-wash)', borderColor: 'var(--glass-border)', color: 'var(--primary)' }}
              >
                GT
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-bold text-text block">
                  {language === 'ar' ? 'شعار المنشأة الرسمي' : 'Official Corporate Logo'}
                </span>
                <span className="text-[11px] text-text-muted block truncate">
                  {language === 'ar' ? 'يظهر على مسيرات الرواتب وكشوف الحسابات الرسمية' : 'Appears on official payslips and WPS compliance reports'}
                </span>
              </div>
              {canEdit && (
                <label className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface border border-border hover:bg-surface-hover text-text cursor-pointer flex items-center gap-1.5 shrink-0">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{language === 'ar' ? 'تحديث' : 'Upload'}</span>
                  <input type="file" className="hidden" accept="image/*" />
                </label>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Visas List & Add Form */}
        {activeTab === 'visas' && (
          <div className="space-y-4">
            <div
              className="p-3 rounded-xl border text-xs flex items-center gap-2.5"
              style={{ background: 'var(--primary-wash)', borderColor: 'var(--glass-border)' }}
            >
              <CreditCard className="w-4 h-4 text-primary shrink-0" />
              <span className="text-text-muted">
                {language === 'ar'
                  ? 'المعايير المعتمدة: يتم إنشاء ملف حماية أجور (WPS SIF) منفصل لكل تأشيرة بناءً على رقم المنشأة وكود التوجيه البنكي.'
                  : 'Spec Rule: Each Company Visa generates its own dedicated WPS SIF file using its MOHRE ID and Bank Routing Code.'}
              </span>
            </div>

            <div className="space-y-3">
              {visas.map((v) => (
                <div
                  key={v.id}
                  className="p-3.5 rounded-xl border border-border/70 bg-surface/50 hover:border-border transition-colors space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span className="text-xs font-bold text-text">
                        {language === 'ar' ? v.name_ar || v.name : v.name}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-primary/10 text-primary border border-primary/20">
                      {v.employee_count} {language === 'ar' ? 'موظف' : 'employees'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-border/40">
                    <div>
                      <span className="text-text-muted block">{language === 'ar' ? 'رقم المنشأة (MOHRE):' : 'MOHRE Employer ID:'}</span>
                      <span className="font-mono font-semibold text-text">{v.mohre_employer_id}</span>
                    </div>
                    <div>
                      <span className="text-text-muted block">{language === 'ar' ? 'كود التوجيه البنكي:' : 'Bank Routing Code:'}</span>
                      <span className="font-mono font-semibold text-text">{v.bank_routing_code}</span>
                    </div>
                  </div>

                  <div className="text-[10px] font-mono text-text-muted flex items-center gap-1.5 pt-1">
                    <span className="text-primary font-bold">WPS Output:</span>
                    <span className="truncate">{v.wps_file_name || `SIF_${v.mohre_employer_id}_202610.sif`}</span>
                  </div>
                </div>
              ))}
            </div>

            {canEdit && !isAddingVisa && (
              <button
                type="button"
                onClick={() => setIsAddingVisa(true)}
                className="w-full py-2.5 rounded-xl border border-dashed border-border hover:border-primary/50 text-xs font-bold text-text-muted hover:text-primary transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>{language === 'ar' ? 'إضافة تأشيرة منشأة جديدة' : 'Add Company Visa'}</span>
              </button>
            )}

            {isAddingVisa && (
              <form onSubmit={handleAddVisa} className="p-4 rounded-xl border border-primary/40 bg-surface space-y-3">
                <span className="text-xs font-bold text-text block">
                  {language === 'ar' ? 'بيانات التأشيرة الجديدة' : 'New Company Visa Details'}
                </span>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Visa Name (e.g. Visa 03 Abu Dhabi)"
                    required
                    value={newVisa.name}
                    onChange={(e) => setNewVisa({ ...newVisa, name: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg text-xs bg-surface border border-border text-text focus:ring-1 focus:ring-primary"
                  />
                  <input
                    type="text"
                    dir="rtl"
                    placeholder="اسم التأشيرة بالعربية"
                    value={newVisa.name_ar}
                    onChange={(e) => setNewVisa({ ...newVisa, name_ar: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg text-xs bg-surface border border-border text-text focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="MOHRE Employer ID"
                    required
                    value={newVisa.mohre_employer_id}
                    onChange={(e) => setNewVisa({ ...newVisa, mohre_employer_id: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg text-xs font-mono bg-surface border border-border text-text focus:ring-1 focus:ring-primary"
                  />
                  <input
                    type="text"
                    placeholder="Bank Routing Code"
                    required
                    value={newVisa.bank_routing_code}
                    onChange={(e) => setNewVisa({ ...newVisa, bank_routing_code: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg text-xs font-mono bg-surface border border-border text-text focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingVisa(false)}
                    className="px-3 py-1 rounded-lg text-xs text-text-muted hover:text-text"
                  >
                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 rounded-lg text-xs font-bold bg-primary text-on-primary"
                  >
                    {language === 'ar' ? 'حفظ التأشيرة' : 'Save Visa'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-4 border-t border-border/60 flex items-center justify-between">
          <span className="text-[11px] text-text-muted">
            {language === 'ar' ? 'آخر تعديل بواسطة: طارق الهاشمي' : 'Last modified by: Tariq Al-Hashemi'}
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
                <span>{language === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </Drawer>
  );
}
