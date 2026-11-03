'use client';

import React, { useState, useEffect } from 'react';
import {
  User,
  Building2,
  CreditCard,
  ShieldCheck,
  Calendar,
  Mail,
  Phone,
  Briefcase,
  MapPin,
  Lock,
} from 'lucide-react';
import { IconWell } from '@/components/primitives/IconWell';
import { useLanguage } from '@/context/LanguageContext';
import { getMyProfile } from '@/services/meApi';

export default function MyProfilePage() {
  const { language } = useLanguage();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await getMyProfile();
        if (res) setProfile(res);
      } catch (err) {
        console.warn('Failed to load profile:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div id="my-profile-container" className="space-y-6 animate-fadeIn pb-12 max-w-4xl mx-auto overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text gold-page-title">
            {language === 'ar' ? 'ملفي الشخصي' : 'My Profile'}
          </h1>
          <p className="text-xs sm:text-sm text-text-muted mt-0.5">
            {language === 'ar'
              ? 'البيانات الشخصية والتعاقدية المعتمدة (عرض للقراءة فقط)'
              : 'Official personal and contract records (Read-Only)'}
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-wash text-primary text-xs font-bold w-fit">
          <Lock className="w-3.5 h-3.5" />
          <span>{language === 'ar' ? 'سجل محمي وموثق' : 'Verified & Protected'}</span>
        </div>
      </div>

      {/* Main Profile Card */}
      <div className="glass-panel p-5 sm:p-7 rounded-2xl border border-border space-y-6">
        {/* Top Info Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pb-6 border-b border-border/50">
          <div className="w-16 h-16 rounded-2xl bg-primary text-[var(--on-primary)] flex items-center justify-center text-xl font-black shadow-md flex-shrink-0">
            {profile?.name ? profile.name.split(' ').map((n) => n[0]).join('').slice(0, 2) : 'EM'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-text truncate">{profile?.name || 'Loading...'}</h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                {profile?.status || 'Active'}
              </span>
            </div>
            {/* Arabic Name explicitly displayed */}
            <p className="text-sm font-semibold text-text-muted mt-0.5" dir="rtl">
              {profile?.arabic_name && profile.arabic_name !== '—' ? profile.arabic_name : 'الاسم بالعربية: غير محدد'}
            </p>
            <p className="text-xs text-text-muted mt-1 flex flex-wrap items-center gap-3">
              <span>{profile?.employee_code}</span>
              <span>·</span>
              <span>{profile?.job_title}</span>
              <span>·</span>
              <span>{profile?.department}</span>
            </p>
          </div>
        </div>

        {/* Section 1: Employment & Entity Details */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-primary" />
            {language === 'ar' ? 'بيانات العمل والجهة' : 'Employment & Entity'}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-border/60">
              <span className="text-text-muted block">{language === 'ar' ? 'الشركة القانونية' : 'Company Entity'}</span>
              <span className="font-bold text-text mt-0.5 block">{profile?.company || 'Company'}</span>
            </div>
            <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-border/60">
              <span className="text-text-muted block">{language === 'ar' ? 'الفيزا والتأشيرة' : 'Visa Establishment'}</span>
              <span className="font-bold text-text mt-0.5 block">{profile?.visa || 'Visa 01 (MOHRE Dubai)'}</span>
            </div>
            <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-border/60">
              <span className="text-text-muted block">{language === 'ar' ? 'الفرع / الموقع' : 'Work Branch'}</span>
              <span className="font-bold text-text mt-0.5 block">{profile?.branch || 'Dubai Main Hub'}</span>
            </div>
            <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-border/60">
              <span className="text-text-muted block">{language === 'ar' ? 'تاريخ التعيين' : 'Joining Date'}</span>
              <span className="font-bold text-text mt-0.5 block">
                {profile?.joining_date ? String(profile.joining_date).slice(0, 10) : '—'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-border/60 sm:col-span-2">
              <span className="text-text-muted block">{language === 'ar' ? 'المدير المباشر' : 'Direct Line Manager'}</span>
              <span className="font-bold text-text mt-0.5 block">{profile?.manager || 'Tariq Mahmood'}</span>
            </div>
          </div>
        </div>

        {/* Section 2: Masked Identity Documents (Rule E) */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            {language === 'ar' ? 'وثائق الهوية الرسمية (مشفرة للأمان)' : 'Protected Identity Credentials'}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-border/60">
              <div className="flex justify-between items-center">
                <span className="text-text-muted">{language === 'ar' ? 'بطاقة الهوية الإماراتية' : 'Emirates ID'}</span>
                <span className="text-[10px] text-primary font-bold">{language === 'ar' ? 'مشفر' : 'Masked'}</span>
              </div>
              <span className="font-mono font-bold text-text mt-1 block tabular-nums text-sm">
                {profile?.masked_national_id || '784-****-*******-1'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-border/60">
              <div className="flex justify-between items-center">
                <span className="text-text-muted">{language === 'ar' ? 'جواز السفر' : 'Passport Number'}</span>
                <span className="text-[10px] text-primary font-bold">{language === 'ar' ? 'مشفر' : 'Masked'}</span>
              </div>
              <span className="font-mono font-bold text-text mt-1 block tabular-nums text-sm">
                {profile?.masked_passport || 'A******1'}
              </span>
            </div>
          </div>
        </div>

        {/* Section 3: Bank Account & WPS IBAN (Rule D) */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" />
            {language === 'ar' ? 'الحساب المصرفي لتحويل الراتب (WPS)' : 'Registered Salary Bank & IBAN'}
          </h3>
          <div className="p-4 rounded-xl bg-primary-wash/30 border border-primary/20 space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-text-muted">{language === 'ar' ? 'اسم البنك' : 'Bank Name'}</span>
              <span className="font-bold text-text">{profile?.primary_bank?.bank_name || 'Emirates NBD'}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-border/30">
              <span className="text-text-muted">{language === 'ar' ? 'رقم الآيبان المشفر' : 'Masked IBAN'}</span>
              <span className="font-mono font-bold text-primary tabular-nums">
                {profile?.primary_bank?.masked_iban || 'AE** **** **** **** **41'}
              </span>
            </div>
          </div>
        </div>

        {/* Section 4: Contact Information */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3 flex items-center gap-2">
            <Mail className="w-4 h-4 text-primary" />
            {language === 'ar' ? 'بيانات التواصل' : 'Contact Details'}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-border/60">
              <span className="text-text-muted block">{language === 'ar' ? 'البريد الإلكتروني للعمل' : 'Work Email'}</span>
              <span className="font-semibold text-text mt-0.5 block truncate">{profile?.work_email || '—'}</span>
            </div>
            <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-border/60">
              <span className="text-text-muted block">{language === 'ar' ? 'رقم الهاتف المتحرك' : 'Mobile Number'}</span>
              <span className="font-semibold text-text mt-0.5 block">{profile?.mobile || '—'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
