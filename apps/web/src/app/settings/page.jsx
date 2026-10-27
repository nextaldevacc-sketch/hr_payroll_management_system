'use client';

import React from 'react';
import Link from 'next/link';
import { ModulePlaceholder } from '../../components/layout/ModulePlaceholder';
import { Settings, Users, ArrowRight, ArrowLeft, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export default function SettingsPage() {
  const { isRTL, language } = useLanguage();

  return (
    <div className="space-y-6">
      {/* Phase 2 Delivered Banner: Users & Roles */}
      <div
        className="p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        style={{
          background: 'var(--primary-wash)',
          borderColor: 'var(--glass-border)',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: 'var(--primary)',
              color: 'var(--on-primary)',
            }}
          >
            <Users className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-text">
                {language === 'ar' ? 'إدارة المستخدمين والأدوار (المرحلة 2 جاهزة)' : 'Users & Roles Management (Phase 2 Active)'}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">
                PHASE 2 COMPLETE
              </span>
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              {language === 'ar'
                ? 'دعوة المستخدمين، تعيين الأدوار السبعة ونطاقات الصلاحية، وإنشاء حسابات الموظفين مجمعة (المعايير 5.1–5.4)'
                : 'Invite users, assign 7 roles with scope restrictions, and bulk-create employee logins (Sections 5.1–5.4).'}
            </p>
          </div>
        </div>

        <Link
          href="/settings/users"
          className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-transform active:scale-95 shrink-0"
          style={{
            background: 'var(--primary)',
            color: 'var(--on-primary)',
          }}
        >
          <span>{language === 'ar' ? 'فتح شاشة المستخدمين والأدوار' : 'Open Users & Roles Screen'}</span>
          {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
        </Link>
      </div>

      <ModulePlaceholder
        titleEn="Settings"
        titleAr="الإعدادات"
        subtitleEn="Organization structure, salary rule builder, shifts, approval workflows and roles"
        subtitleAr="الهيكل التنظيمي، قواعد الرواتب، سياسات الورديات ومسارات الموافقة"
        phaseNumber={3}
        phaseNameEn="Settings"
        phaseNameAr="الإعدادات"
        specDescriptionEn="Setup tables, edited by the company admin."
        specDescriptionAr="جداول التكوين والإعداد، يتم إدارتها وتخصيصها بواسطة مدير الشركة."
        capabilitiesEn={[
          'Company Profile & Company Visa Entities',
          'Branches, Departments & Job Positions',
          'Shift Schedules & Lateness Penalty Steps',
          'Salary Rules, Codes & Structure Formulas',
          'Multi-Tier Approval Step Matrix'
        ]}
        capabilitiesAr={[
          'ملف الشركة ورخص وتأشيرات الكيانات التابعة',
          'الفروع، الأقسام الإدارية، والمسميات الوظيفية',
          'جداول الورديات وتدرج جزاءات التأخير والخروج',
          'قواعد ورموز وصيغ هياكل الرواتب المخصصة',
          'مصفوفة خطوات وصلاحيات الاعتماد والموافقة'
        ]}
        icon={Settings}
      />
    </div>
  );
}
