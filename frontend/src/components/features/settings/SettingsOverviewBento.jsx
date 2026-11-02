'use client';

import React from 'react';
import Link from 'next/link';
import {
  Building2,
  MapPin,
  Network,
  Clock,
  Palmtree,
  Calendar,
  Layers,
  CheckSquare,
  Bell,
  Users,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Shield,
  Lock,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { BentoTile } from '../../primitives/BentoTile';
import { useLanguage } from '../../../context/LanguageContext';

export function SettingsOverviewBento({
  stats = {},
  userRole = 'COMPANY_ADMIN',
  onOpenDrawer,
  overviewData,
}) {
  const { isRTL, language } = useLanguage();

  // Role permissions badges
  const isFinance = userRole === 'FINANCE';
  const isPayrollOfficer = userRole === 'PAYROLL_OFFICER';
  const isHrOrAdmin = userRole === 'HR_MANAGER' || userRole === 'COMPANY_ADMIN';

  const tiles = [
    {
      id: 'profile',
      icon: Building2,
      titleEn: 'Company Profile & Visas',
      titleAr: 'ملف الشركة وتأشيرات الكيان',
      descEn: 'Trade licence, legal identity en/ar, MOHRE employer IDs & dedicated WPS SIF routing files.',
      descAr: 'الاسم القانوني، الرخصة التجارية، أرقام المنشأة وتأشيرات الكيان بملفات WPS المستقلة.',
      countBadge: stats.visasCount ? `${stats.visasCount} Company Visas` : '2 Company Visas',
      countBadgeAr: 'تأشيرتان للكيان (WPS)',
      lastChanged: 'Last changed by Tariq Al-Hashemi · 2d ago',
      lastChangedAr: 'آخر تعديل: طارق الهاشمي · منذ يومين',
      editable: isHrOrAdmin,
      locked: !isHrOrAdmin,
      restrictedMsg: isPayrollOfficer ? 'Restricted to HR Manager / Admin' : 'View Only',
    },
    {
      id: 'branches',
      icon: MapPin,
      titleEn: 'Branches & Locations',
      titleAr: 'فروع الشركة ومواقع العمل',
      descEn: 'Operating facilities mapped across 7 UAE Emirates with dedicated company visa linkages.',
      descAr: 'المرافق التشغيلية عبر الإمارات السبع مع الربط بتأشيرة الكيان المختصة.',
      countBadge: stats.branchesCount ? `${stats.branchesCount} Active Branches` : '3 Operating Branches',
      countBadgeAr: '3 فروع تشغيلية نشطة',
      lastChanged: 'Last changed by Maryam Al-Nuaimi · Oct 21',
      lastChangedAr: 'آخر تعديل: مريم النعيمي · 21 أكتوبر',
      editable: isHrOrAdmin,
      locked: !isHrOrAdmin,
      restrictedMsg: isPayrollOfficer ? 'Restricted to HR Manager' : 'View Only',
    },
    {
      id: 'departments_jobs',
      icon: Network,
      titleEn: 'Departments & Jobs',
      titleAr: 'الأقسام الإدارية والوظائف',
      descEn: 'Hierarchical tree, department manager (first leave approver), job codes and grades.',
      descAr: 'شجرة الأقسام، مدير القسم (المعتمد الأول للإجازات)، المسميات والرتب الوظيفية.',
      countBadge: '6 Depts · 14 Job Titles',
      countBadgeAr: '6 أقسام · 14 مسمى وظيفي',
      lastChanged: 'Last changed by Maryam Al-Nuaimi · Oct 20',
      lastChangedAr: 'آخر تعديل: مريم النعيمي · 20 أكتوبر',
      editable: isHrOrAdmin,
      locked: !isHrOrAdmin,
      restrictedMsg: isPayrollOfficer ? 'Restricted to HR Manager' : 'View Only',
    },
    {
      id: 'shifts_policies',
      icon: Clock,
      titleEn: 'Shifts & Attendance Policies',
      titleAr: 'الورديات وسياسات الحضور',
      descEn: 'Start/end, break, grace, off days, Ramadan -2h, ordered penalty steps & OT minimums.',
      descAr: 'مواعيد الورديات، ساعات رمضان، تدرج جزاءات التأخير التصاعدية، والحد الأدنى للإضافي.',
      countBadge: '2 Shifts · Ordered Penalties',
      countBadgeAr: 'ورديتان · جزاءات تصاعدية',
      lastChanged: 'Last changed by Maryam Al-Nuaimi · Effective Nov 1',
      lastChangedAr: 'آخر تعديل: مريم النعيمي · يسري 1 نوفمبر',
      editable: isHrOrAdmin,
      locked: !isHrOrAdmin,
      restrictedMsg: isPayrollOfficer ? 'Restricted to HR Manager' : 'View Only',
    },
    {
      id: 'leave_accruals',
      icon: Palmtree,
      titleEn: 'Leave Types & Accruals',
      titleAr: 'أنواع الإجازات والاستحقاقات',
      descEn: 'Full/half/none pay bands (e.g. sick 15/30/45), medical attachments, GM triggers & accruals.',
      descAr: 'شرائح دفع الراتب (مرضي 15/30/45)، اشتراط التقارير، موافقة المدير العام، والتراكم.',
      countBadge: '6 Leave Types · 30-Day Accrual',
      countBadgeAr: '6 أنواع إجازات · تراكم 30 يوم',
      lastChanged: 'Last changed by Maryam Al-Nuaimi · Oct 19',
      lastChangedAr: 'آخر تعديل: مريم النعيمي · 19 أكتوبر',
      editable: isHrOrAdmin,
      locked: !isHrOrAdmin,
      restrictedMsg: isPayrollOfficer ? 'Restricted to HR Manager' : 'View Only',
    },
    {
      id: 'holidays',
      icon: Calendar,
      titleEn: 'Public Holiday Calendar',
      titleAr: 'العطلات الرسمية (2026)',
      descEn: 'Official UAE 2026 calendar, branch filters, dynamic announcement adjustments.',
      descAr: 'العطلات الرسمية المعتمدة لدولة الإمارات 2026 مع خيارات التخصيص حسب الفروع.',
      countBadge: '8 Statutory Holidays (2026)',
      countBadgeAr: '8 عطلات رسمية معتمدة',
      lastChanged: 'Pre-loaded UAE 2026 Cabinet Decree',
      lastChangedAr: 'مسبقة التحميل وفق قرار مجلس الوزراء',
      editable: isHrOrAdmin,
      locked: !isHrOrAdmin,
      restrictedMsg: isPayrollOfficer ? 'Restricted to HR Manager' : 'View Only',
    },
    {
      id: 'salary_rules',
      icon: Layers,
      titleEn: 'Salary Rules & Simulator',
      titleAr: 'قواعد وهياكل الرواتب والمحاكي',
      descEn: 'Safe formulas without eval, GL accounts, absence divisor and statutory pay simulation.',
      descAr: 'صيغ آمنة برمجياً، حسابات الأستاذ، مقسوم الغياب، ومحاكي احتساب الرواتب الدقيق.',
      countBadge: overviewData?.tiles?.find((t) => t.id === 'salary_rules')?.countLabelEn || '17 Statutory Rules · Simulator',
      countBadgeAr: overviewData?.tiles?.find((t) => t.id === 'salary_rules')?.countLabelAr || '17 قاعدة قانونية · محاكي فوري',
      lastChanged: 'Last changed by Zaid Al-Marzooqi · Effective Nov 1',
      lastChangedAr: 'آخر تعديل: زيد المرزوقي · يسري 1 نوفمبر',
      editable: isHrOrAdmin || isPayrollOfficer || isFinance,
      locked: false,
      roleHighlight: isFinance ? 'Accounts Only' : isPayrollOfficer ? 'Rules Editable' : 'Full Access',
    },
    {
      id: 'approvals',
      icon: CheckSquare,
      titleEn: 'Approval Settings',
      titleAr: 'مسارات وخطوات الاعتماد',
      descEn: 'Ordered step chains (Manager -> HR -> GM), conditional triggers (Leave > 5d, Adj > 2k).',
      descAr: 'سلسلة خطوات الاعتماد لكل طلب والشروط الاستثنائية للرفع للإدارة العليا.',
      countBadge: '6 Request Pipelines Configured',
      countBadgeAr: '6 مسارات اعتماد نشطة',
      lastChanged: 'Last changed by Tariq Al-Hashemi · Oct 22',
      lastChangedAr: 'آخر تعديل: طارق الهاشمي · 22 أكتوبر',
      editable: isHrOrAdmin,
      locked: !isHrOrAdmin,
      restrictedMsg: isPayrollOfficer ? 'Restricted to HR Manager' : 'View Only',
    },
    {
      id: 'payroll_alerts',
      icon: Bell,
      titleEn: 'Payroll Checks & Alerts',
      titleAr: 'فحوصات الرواتب والإنذارات',
      descEn: 'Cut-off day 25, variance mandatory thresholds (% & AED), 90/60/30 document notifications.',
      descAr: 'يوم قطع المسير 25، حدود التباين الإلزامية، وتنبيهات انتهاء الإقامات والجوازات.',
      countBadge: 'Day 25 · 90/60/30 Alerts',
      countBadgeAr: 'يوم القطع 25 · إنذار 90/60/30',
      lastChanged: 'Last changed by Maryam Al-Nuaimi · Oct 22',
      lastChangedAr: 'آخر تعديل: مريم النعيمي · 22 أكتوبر',
      editable: isHrOrAdmin,
      locked: !isHrOrAdmin,
      restrictedMsg: isPayrollOfficer ? 'Restricted to HR Manager' : 'View Only',
    },
    {
      id: 'users_roles',
      icon: Users,
      titleEn: 'Users & Roles Management',
      titleAr: 'المستخدمين والأدوار والصلاحيات',
      descEn: '7 corporate roles, scope restrictions, and employee self-service login management.',
      descAr: '7 أدوار مؤسسية، نطاقات الصلاحية، وإدارة حسابات الخدمة الذاتية للموظفين.',
      countBadge: '7 Roles · 42 Accounts Active',
      countBadgeAr: '7 أدوار · 42 حساب نشط',
      lastChanged: 'Phase 2 Active & Verified',
      lastChangedAr: 'المرحلة 2 نشطة ومحققة',
      isLink: true,
      linkHref: '/settings/users',
      editable: isHrOrAdmin,
      locked: false,
    },
    {
      id: 'support_access',
      icon: Shield,
      titleEn: 'Support Access (FR-PL3)',
      titleAr: 'وصول الدعم الفني (FR-PL3)',
      descEn: 'Grant or revoke time-limited support access for platform administrators. Fully audited.',
      descAr: 'منح أو إلغاء وصول الدعم الفني المؤقت لمديري المنصة مع توثيق كامل في سجل التدقيق.',
      countBadge: 'Audited Grants',
      countBadgeAr: 'تصاريح موثقة',
      lastChanged: 'Time-Limited (1-24h)',
      lastChangedAr: 'محدد بمدة (1-24 ساعة)',
      editable: userRole === 'COMPANY_ADMIN',
      locked: userRole !== 'COMPANY_ADMIN',
      restrictedMsg: 'Restricted to Company Admin',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {tiles.map((tile) => {
        const IconComponent = tile.icon;

        const tileContent = (
          <div className="flex flex-col justify-between h-full space-y-3">
            <div className="space-y-1.5">
              <p className="text-xs text-text-muted leading-relaxed line-clamp-2">
                {language === 'ar' ? tile.descAr : tile.descEn}
              </p>
            </div>

            <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[11px] text-text-muted">
              <span className="truncate">
                {language === 'ar' ? tile.lastChangedAr : tile.lastChanged}
              </span>

              {tile.roleHighlight && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/20 text-primary shrink-0">
                  {tile.roleHighlight}
                </span>
              )}

              {tile.locked && (
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-surface border border-border text-text-muted shrink-0 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" />
                  <span>{tile.restrictedMsg}</span>
                </span>
              )}
            </div>
          </div>
        );

        if (tile.isLink) {
          return (
            <Link key={tile.id} id={`tile-${tile.id}`} href={tile.linkHref} className="block h-full group">
              <BentoTile
                id={`settings-tile-${tile.id}`}
                title={language === 'ar' ? tile.titleAr : tile.titleEn}
                iconWell={
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105"
                    style={{ background: 'var(--primary-wash)', color: 'var(--primary)' }}
                  >
                    <IconComponent className="w-5 h-5 stroke-[2.2]" />
                  </div>
                }
                badge={
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    {language === 'ar' ? tile.countBadgeAr : tile.countBadge}
                  </span>
                }
                headerAction={
                  isRTL ? <ArrowLeft className="w-4 h-4 text-text-muted group-hover:text-primary transition-colors" /> : <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-primary transition-colors" />
                }
              >
                {tileContent}
              </BentoTile>
            </Link>
          );
        }

        return (
          <div
            key={tile.id}
            id={`tile-${tile.id}`}
            onClick={() => onOpenDrawer(tile.id)}
            className="cursor-pointer h-full group"
          >
            <BentoTile
              id={`settings-tile-${tile.id}`}
              title={language === 'ar' ? tile.titleAr : tile.titleEn}
              iconWell={
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105"
                  style={{ background: 'var(--primary-wash)', color: 'var(--primary)' }}
                >
                  <IconComponent className="w-5 h-5 stroke-[2.2]" />
                </div>
              }
              badge={
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-primary/10 text-primary border border-primary/20">
                  {language === 'ar' ? tile.countBadgeAr : tile.countBadge}
                </span>
              }
              headerAction={
                <ChevronRight
                  className={`w-4 h-4 text-text-muted group-hover:text-primary transition-all ${
                    isRTL ? 'rotate-180' : ''
                  }`}
                />
              }
            >
              {tileContent}
            </BentoTile>
          </div>
        );
      })}
    </div>
  );
}
