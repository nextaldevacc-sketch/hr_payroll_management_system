'use client';

import React, { useState, useEffect } from 'react';
import { Drawer } from '../../../primitives/Drawer';
import { Select } from '../../../primitives/form/Select';
import { Building2, FileText, CreditCard, ShieldCheck, Plus, Check, Globe, Upload, AlertTriangle, Coins, Trash2 } from 'lucide-react';
import { useLanguage } from '../../../../context/LanguageContext';
import { useToast } from '../../../../context/ToastContext';
import { createCompanyVisa, deleteCompanyVisa } from '../../../../services/settingsApi';

export function CompanyProfileDrawer({
  isOpen,
  onClose,
  company,
  companyProfile,
  canEdit = true,
  onSave,
  onDeleteBlocked,
}) {
  const comp = company || companyProfile;
  const { isRTL, language } = useLanguage();
  const { showSuccess, showError } = useToast();
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'visas' | 'pension'
  const [logoPreview, setLogoPreview] = useState(comp?.logo_url || null);

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showError(language === 'ar' ? 'يرجى اختيار ملف صورة صالح' : 'Please select a valid image file');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result;
      setLogoPreview(dataUrl);
      setFormData((prev) => ({ ...prev, logo_url: dataUrl }));
      showSuccess(language === 'ar' ? 'تم تحميل الشعار بنجاح' : 'Logo uploaded successfully');
    };
    reader.readAsDataURL(file);
  };

  const [formData, setFormData] = useState({
    name: comp?.name || '',
    name_ar: comp?.name_ar || '',
    trade_license_no: comp?.trade_license_no || '',
    default_language: comp?.default_language || 'en',
    logo_url: comp?.logo_url || '/logo.png',
    pension_scheme_default: comp?.pension_scheme_default || 'GPSSA',
    gpssa_employee_rate_new: comp?.gpssa_employee_rate_new || 11.0,
    gpssa_employee_rate_legacy: comp?.gpssa_employee_rate_legacy || 5.0,
    gpssa_employer_rate: comp?.gpssa_employer_rate || 15.0,
    gpssa_gov_share_rate: comp?.gpssa_gov_share_rate || 2.5,
    gpssa_min_salary: comp?.gpssa_min_salary || 3000.0,
    gpssa_max_salary: comp?.gpssa_max_salary || 70000.0,
    adpf_employee_rate: comp?.adpf_employee_rate || 11.0,
    adpf_employer_rate: comp?.adpf_employer_rate || 15.0,
    adpf_gov_share_rate: comp?.adpf_gov_share_rate || 2.5,
    adpf_min_salary: comp?.adpf_min_salary || 3000.0,
    adpf_max_salary: comp?.adpf_max_salary || 70000.0,
  });

  const [visas, setVisas] = useState(comp?.visas || comp?.company_visas || []);
  const [isAddingVisa, setIsAddingVisa] = useState(false);
  const [newVisa, setNewVisa] = useState({
    name: '',
    name_ar: '',
    mohre_employer_id: '',
    bank_routing_code: '',
    pension_fund: 'GPSSA',
  });

  useEffect(() => {
    if (comp) {
      setFormData({
        name: comp.name || '',
        name_ar: comp.name_ar || '',
        trade_license_no: comp.trade_license_no || '',
        default_language: comp.default_language || 'en',
        logo_url: comp.logo_url || '/logo.png',
        pension_scheme_default: comp.pension_scheme_default || 'GPSSA',
        gpssa_employee_rate_new: comp.gpssa_employee_rate_new ?? 11.0,
        gpssa_employee_rate_legacy: comp.gpssa_employee_rate_legacy ?? 5.0,
        gpssa_employer_rate: comp.gpssa_employer_rate ?? 15.0,
        gpssa_gov_share_rate: comp.gpssa_gov_share_rate ?? 2.5,
        gpssa_min_salary: comp.gpssa_min_salary ?? 3000.0,
        gpssa_max_salary: comp.gpssa_max_salary ?? 70000.0,
        adpf_employee_rate: comp.adpf_employee_rate ?? 11.0,
        adpf_employer_rate: comp.adpf_employer_rate ?? 15.0,
        adpf_gov_share_rate: comp.adpf_gov_share_rate ?? 2.5,
        adpf_min_salary: comp.adpf_min_salary ?? 3000.0,
        adpf_max_salary: comp.adpf_max_salary ?? 70000.0,
      });
      setVisas(comp.visas || comp.company_visas || []);
    }
  }, [comp]);

  const [visaErrors, setVisaErrors] = useState({});

  const handleAddVisa = async (e) => {
    e.preventDefault();
    if (!newVisa.name || !newVisa.mohre_employer_id || !newVisa.bank_routing_code) return;
    setVisaErrors({});
    try {
      const created = await createCompanyVisa({
        name: newVisa.name,
        name_ar: newVisa.name_ar || newVisa.name,
        mohre_employer_id: newVisa.mohre_employer_id,
        mol_establishment_id: newVisa.mohre_employer_id,
        bank_routing_code: newVisa.bank_routing_code,
        pension_fund: newVisa.pension_fund || 'GPSSA',
      });
      const normalized = {
        ...created,
        mohre_employer_id: created.mohre_employer_id || created.mol_establishment_id,
        mol_establishment_id: created.mol_establishment_id || created.mohre_employer_id,
      };
      setVisas([...visas, normalized]);
      setNewVisa({ name: '', name_ar: '', mohre_employer_id: '', bank_routing_code: '', pension_fund: 'GPSSA' });
      setIsAddingVisa(false);
    } catch (err) {
      const field = err.field || (err.code === 'DUPLICATE_MOL_ID' ? 'mol_establishment_id' : null);
      if (field) {
        setVisaErrors({ [field]: err.message });
      } else {
        setVisaErrors({ general: err.message, mol_establishment_id: err.message });
      }
    }
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
      title={language === 'ar' ? 'ملف الشركة وتأشيرات الكيان والتقاعد' : 'Company Profile, Visas & Pension'}
      subtitle={
        language === 'ar'
          ? 'الاسم، الرخصة التجارية، تأشيرات الكيان (WPS)، وقواعد صناديق التقاعد (GPSSA / ADPF)'
          : 'Legal registration, trade licence, company visas (WPS), and pension schemes (GPSSA / ADPF)'
      }
      width="max-w-2xl"
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
            id="drawer-tab-visas"
            onClick={() => setActiveTab('visas')}
            className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'visas'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            <span>{language === 'ar' ? 'تأشيرات الكيان ونظام WPS' : 'Company Visas & WPS'}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-surface border border-border">
              {visas.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pension')}
            className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'pension'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? 'صناديق التقاعد (GPSSA/ADPF)' : 'Pension Funds & Schemes'}</span>
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
                <Select
                  disabled={!canEdit}
                  label={language === 'ar' ? 'اللغة الافتراضية للنظام' : 'Default Platform Language'}
                  value={formData.default_language}
                  onChange={(e) => setFormData({ ...formData, default_language: e.target.value })}
                  options={[
                    { value: 'en', label: 'English (LTR)' },
                    { value: 'ar', label: 'العربية (RTL)' },
                  ]}
                />
              </div>
            </div>

            {/* Logo Upload Box */}
            <div className="p-3.5 rounded-xl border border-dashed border-border/80 bg-surface/40 flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-xl border flex items-center justify-center font-bold text-base shrink-0 overflow-hidden"
                style={{ background: 'var(--primary-wash)', borderColor: 'var(--glass-border)', color: 'var(--primary)' }}
              >
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  formData.name ? formData.name.slice(0, 2).toUpperCase() : 'CO'
                )}
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
                  <input
                    id="company-logo-input"
                    data-testid="company-logo-input"
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleLogoUpload}
                  />
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
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/10 text-amber-500 border border-amber-500/20">
                        {v.pension_fund || 'GPSSA'}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-primary/10 text-primary border border-primary/20">
                        {v.employee_count ?? v._count?.employees ?? 0} {language === 'ar' ? 'موظف' : 'employees'}
                      </span>
                      {canEdit && (
                        <button
                          type="button"
                          id={`btn-delete-visa-${v.id}`}
                          onClick={() => {
                            const empCount = v.employee_count ?? v._count?.employees ?? 0;
                            const branchCount = v._count?.branches ?? 0;
                            const payRunCount = v._count?.pay_runs ?? 0;
                            if (empCount > 0 || branchCount > 0 || payRunCount > 0) {
                              if (onDeleteBlocked) {
                                onDeleteBlocked(
                                  v,
                                  `Cannot delete '${v.name}': Assigned to ${empCount} employees, ${branchCount} branches, ${payRunCount} pay runs.`
                                );
                              }
                            } else {
                              deleteCompanyVisa(v.id).then(() => {
                                setVisas(visas.filter((item) => item.id !== v.id));
                              });
                            }
                          }}
                          title={language === 'ar' ? 'حذف التأشيرة' : 'Delete Visa'}
                          className="p-1 rounded-lg text-text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-border/40">
                    <div>
                      <span className="text-text-muted block">{language === 'ar' ? 'رقم المنشأة (MOHRE):' : 'MOHRE Employer ID:'}</span>
                      <span className="font-mono font-semibold text-text">{v.mohre_employer_id || v.mol_establishment_id}</span>
                    </div>
                    <div>
                      <span className="text-text-muted block">{language === 'ar' ? 'كود التوجيه البنكي:' : 'Bank Routing Code:'}</span>
                      <span className="font-mono font-semibold text-text">{v.bank_routing_code}</span>
                    </div>
                  </div>

                  <div className="text-[10px] font-mono text-text-muted flex items-center gap-1.5 pt-1">
                    <span className="text-primary font-bold">WPS Output:</span>
                    <span className="truncate">{v.wps_file_name || `SIF_${v.mohre_employer_id || v.mol_establishment_id}_202610.sif`}</span>
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

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <input
                      type="text"
                      id="new-visa-mohre-id"
                      placeholder="MOHRE Employer ID"
                      required
                      value={newVisa.mohre_employer_id}
                      onChange={(e) => setNewVisa({ ...newVisa, mohre_employer_id: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg text-xs font-mono bg-surface border border-border text-text focus:ring-1 focus:ring-primary"
                    />
                    {visaErrors.mol_establishment_id && (
                      <p id="visa-mohre-error" className="text-[10px] text-rose-500 font-medium mt-1">
                        {visaErrors.mol_establishment_id}
                      </p>
                    )}
                  </div>
                  <div>
                    <input
                      type="text"
                      id="new-visa-routing-code"
                      placeholder="Bank Routing Code"
                      required
                      value={newVisa.bank_routing_code}
                      onChange={(e) => setNewVisa({ ...newVisa, bank_routing_code: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg text-xs font-mono bg-surface border border-border text-text focus:ring-1 focus:ring-primary"
                    />
                    {visaErrors.bank_routing_code && (
                      <p id="visa-routing-error" className="text-[10px] text-rose-500 font-medium mt-1">
                        {visaErrors.bank_routing_code}
                      </p>
                    )}
                  </div>
                  <div>
                    <Select
                      value={newVisa.pension_fund}
                      onChange={(e) => setNewVisa({ ...newVisa, pension_fund: e.target.value })}
                      options={[
                        { value: 'GPSSA', label: 'GPSSA (Federal / Dubai)' },
                        { value: 'ADPF', label: 'ADPF (Abu Dhabi)' },
                      ]}
                    />
                  </div>
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

        {/* Tab 3: Pension Schemes & Rates (GPSSA / ADPF) */}
        {activeTab === 'pension' && (
          <div className="space-y-4">
            {/* Prominent Statutory Warning Banner */}
            <div className="p-3.5 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-300 text-xs flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold block text-amber-200">
                  {language === 'ar'
                    ? 'يرجى تأكيد نسب الاشتراكات الحالية مع العميل قبل التشغيل الفعلي'
                    : 'Confirm current rates with the client before go-live'}
                </span>
                <p className="text-[11px] text-amber-200/80 leading-relaxed">
                  {language === 'ar'
                    ? 'تخضع اشتراكات المواطنين الإماراتيين لقانون المعاشات الاتحادي ولائحة صندوق أبوظبي للتقاعد. مساهمة الموظف 11% للمسجلين بعد 2 أكتوبر 2023 (أو 5% للنظام القديم)، مع حصة حكومية (2.5%) للرواتب الأقل من 20 ألف درهم.'
                    : 'UAE National contributions adhere to Federal Decree-Law No. 57/2023 and Abu Dhabi Pension Law. Default employee rate is 11% for registrations on/after 2 Oct 2023 (5% for legacy). Government share (2.5%) covers 2.5% of employer share for salaries under AED 20,000.'}
                </p>
              </div>
            </div>

            {/* Default Pension Fund Selector */}
            <div>
              <Select
                disabled={!canEdit}
                label={language === 'ar' ? 'صندوق التقاعد الافتراضي للمنشأة' : 'Default Company Pension Fund'}
                value={formData.pension_scheme_default}
                onChange={(e) => setFormData({ ...formData, pension_scheme_default: e.target.value })}
                options={[
                  {
                    value: 'GPSSA',
                    label: 'GPSSA - General Pension and Social Security Authority (Federal & Dubai Mainland)',
                  },
                  {
                    value: 'ADPF',
                    label: 'ADPF - Abu Dhabi Pension Fund (Abu Dhabi entities)',
                  },
                ]}
              />
            </div>

            {/* GPSSA Scheme Rates */}
            <div className="p-4 rounded-xl border border-border/80 bg-surface/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  <span>GPSSA Scheme Parameters (Federal)</span>
                </span>
                <span className="text-[10px] font-mono text-text-muted bg-surface px-2 py-0.5 rounded border border-border">
                  Federal Decree-Law 57/2023
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] text-text-muted mb-1">
                    Employee Rate (New: on/after 2 Oct 2023)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      disabled={!canEdit}
                      value={formData.gpssa_employee_rate_new}
                      onChange={(e) => setFormData({ ...formData, gpssa_employee_rate_new: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 rounded-lg text-xs font-mono bg-surface border border-border text-text"
                    />
                    <span className="absolute end-3 top-1.5 text-xs text-text-muted font-mono">%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-text-muted mb-1">
                    Employee Rate (Legacy: before 2 Oct 2023)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      disabled={!canEdit}
                      value={formData.gpssa_employee_rate_legacy}
                      onChange={(e) => setFormData({ ...formData, gpssa_employee_rate_legacy: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 rounded-lg text-xs font-mono bg-surface border border-border text-text"
                    />
                    <span className="absolute end-3 top-1.5 text-xs text-text-muted font-mono">%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-text-muted mb-1">
                    Employer Total Rate
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      disabled={!canEdit}
                      value={formData.gpssa_employer_rate}
                      onChange={(e) => setFormData({ ...formData, gpssa_employer_rate: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 rounded-lg text-xs font-mono bg-surface border border-border text-text"
                    />
                    <span className="absolute end-3 top-1.5 text-xs text-text-muted font-mono">%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-text-muted mb-1">
                    Government share (2.5%) (&lt; AED 20k)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      disabled={!canEdit}
                      value={formData.gpssa_gov_share_rate}
                      onChange={(e) => setFormData({ ...formData, gpssa_gov_share_rate: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 rounded-lg text-xs font-mono bg-surface border border-border text-text"
                    />
                    <span className="absolute end-3 top-1.5 text-xs text-text-muted font-mono">%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-text-muted mb-1">
                    Statutory Min Salary
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      disabled={!canEdit}
                      value={formData.gpssa_min_salary}
                      onChange={(e) => setFormData({ ...formData, gpssa_min_salary: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 rounded-lg text-xs font-mono bg-surface border border-border text-text"
                    />
                    <span className="absolute end-3 top-1.5 text-[10px] text-text-muted">AED</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-text-muted mb-1">
                    Statutory Max Salary Cap
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      disabled={!canEdit}
                      value={formData.gpssa_max_salary}
                      onChange={(e) => setFormData({ ...formData, gpssa_max_salary: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 rounded-lg text-xs font-mono bg-surface border border-border text-text"
                    />
                    <span className="absolute end-3 top-1.5 text-[10px] text-text-muted">AED</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ADPF Scheme Rates */}
            <div className="p-4 rounded-xl border border-border/80 bg-surface/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>ADPF Scheme Parameters (Abu Dhabi)</span>
                </span>
                <span className="text-[10px] font-mono text-text-muted bg-surface px-2 py-0.5 rounded border border-border">
                  Abu Dhabi Law No. 2/2000
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] text-text-muted mb-1">
                    Employee Rate
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      disabled={!canEdit}
                      value={formData.adpf_employee_rate}
                      onChange={(e) => setFormData({ ...formData, adpf_employee_rate: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 rounded-lg text-xs font-mono bg-surface border border-border text-text"
                    />
                    <span className="absolute end-3 top-1.5 text-xs text-text-muted font-mono">%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-text-muted mb-1">
                    Employer Rate
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      disabled={!canEdit}
                      value={formData.adpf_employer_rate}
                      onChange={(e) => setFormData({ ...formData, adpf_employer_rate: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 rounded-lg text-xs font-mono bg-surface border border-border text-text"
                    />
                    <span className="absolute end-3 top-1.5 text-xs text-text-muted font-mono">%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-4 border-t border-border/60 flex items-center justify-between">
          <span className="text-[11px] text-text-muted">
            {comp?.updated_by ? (language === 'ar' ? `آخر تعديل بواسطة: ${comp.updated_by}` : `Last modified by: ${comp.updated_by}`) : ''}
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
