'use client';

import React from 'react';
import Link from 'next/link';
import { BentoTile } from '../../primitives/BentoTile';
import { IconWell } from '../../primitives/IconWell';
import { CheckCircle2, Circle, ArrowRight, ArrowLeft, Sparkles, Building, MapPin, Briefcase, Sliders, UserPlus } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';

export function CompanyOnboardingChecklistTile({ status = {}, onAction }) {
  const { language, isRTL } = useLanguage();
  const isAr = language === 'ar';

  const steps = [
    {
      id: 'profile',
      titleEn: '1. Company Profile',
      titleAr: '١. ملف المنشأة القانوني',
      descEn: 'Set legal trading name, license number and official corporate logo',
      descAr: 'تحديد الاسم التجاري ورقم الرخصة والشعار الرسمي',
      icon: Building,
      href: '/settings?tab=company',
      completed: Boolean(status.hasProfile),
    },
    {
      id: 'visas',
      titleEn: '2. Company Visa & MOHRE',
      titleAr: '٢. تأشيرات الكيان ووزارة الموارد البشرية',
      descEn: 'Configure MOHRE Establishment ID and bank routing code',
      descAr: 'إعداد رقم منشأة وزارة الموارد البشرية ورمز التوجيه البنكي',
      icon: Briefcase,
      href: '/settings?tab=visas',
      completed: Boolean(status.hasVisas),
    },
    {
      id: 'branches',
      titleEn: '3. Operating Branches',
      titleAr: '٣. الفروع التشغيلية ومواقع العمل',
      descEn: 'Add operational offices and assign them to corporate visas',
      descAr: 'إضافة المكاتب والفروع التشغيلية وربطها بالتأشيرات',
      icon: MapPin,
      href: '/settings?tab=branches',
      completed: Boolean(status.hasBranches),
    },
    {
      id: 'depts',
      titleEn: '4. Departments & Job Titles',
      titleAr: '٤. الهيكل الإداري والمسميات الوظيفية',
      descEn: 'Establish operational departments and official job positions',
      descAr: 'إنشاء الأقسام الإدارية والوظائف المعتمدة',
      icon: Briefcase,
      href: '/settings?tab=departments',
      completed: Boolean(status.hasDepartments),
    },
    {
      id: 'rules',
      titleEn: '5. UAE Statutory Rules & Leaves',
      titleAr: '٥. القواعد القانونية الاتحادية وسياسات الإجازات',
      descEn: 'Review the 17 statutory salary calculation rules and leave balances',
      descAr: 'مراجعة قواعد احتساب الرواتب الـ١٧ ولوائح الإجازات',
      icon: Sliders,
      href: '/settings?tab=rules',
      completed: Boolean(status.hasRules),
    },
    {
      id: 'users',
      titleEn: '6. Invite Team & Assign Roles',
      titleAr: '٦. دعوة فريق العمل وتعيين الصلاحيات',
      descEn: 'Invite HR Manager, Payroll Officer, and department managers',
      descAr: 'دعوة مدير الموارد البشرية ومسؤول الرواتب والمدراء',
      icon: UserPlus,
      href: '/settings/users',
      completed: Boolean(status.hasUsers),
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);
  const isFullySetup = completedCount === steps.length;

  return (
    <BentoTile
      id="onboarding-checklist-tile"
      area="headcount"
      colSpan="col-span-12"
      iconWell={
        <IconWell size="md" shape="square" color="primary">
          <Sparkles className="w-5 h-5 stroke-[2] text-primary" />
        </IconWell>
      }
      title={isAr ? 'دليل إعداد وتشغيل المنشأة' : 'Company Setup & Onboarding Checklist'}
      subtitle={
        isAr
          ? `${completedCount} من ٦ خطوات مكتملة (${progressPercent}%)`
          : `${completedCount} of 6 steps completed (${progressPercent}%)`
      }
    >
      <div className="space-y-4">
        {/* Progress Bar */}
        <div className="w-full bg-surface-muted rounded-full h-2 overflow-hidden border border-border/50">
          <div
            className="bg-primary h-full transition-all duration-500 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Step Items Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <Link
                key={step.id}
                href={step.href}
                className={`p-3.5 rounded-xl border transition-all select-none flex items-start gap-3 group ${
                  step.completed
                    ? 'bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40'
                    : 'bg-surface hover:bg-surface-hover border-border hover:border-primary/50'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {step.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <Circle className="w-5 h-5 text-text-muted group-hover:text-primary transition-colors" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`text-xs font-bold block truncate ${
                        step.completed ? 'text-emerald-500 line-through' : 'text-text group-hover:text-primary'
                      }`}
                    >
                      {isAr ? step.titleAr : step.titleEn}
                    </span>
                    {isRTL ? (
                      <ArrowLeft className="w-3.5 h-3.5 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                    ) : (
                      <ArrowRight className="w-3.5 h-3.5 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                  <p className="text-[11px] text-text-muted mt-0.5 line-clamp-2 leading-relaxed">
                    {isAr ? step.descAr : step.descEn}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </BentoTile>
  );
}
