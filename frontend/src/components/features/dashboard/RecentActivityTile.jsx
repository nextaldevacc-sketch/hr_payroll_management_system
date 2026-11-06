'use client';

import React from 'react';
import { History, ChevronRight } from 'lucide-react';
import { BentoTile } from '../../primitives/BentoTile';
import { IconWell } from '../../primitives/IconWell';
import { ListDivided } from '../../primitives/ListDivided';
import { useLanguage } from '../../../context/LanguageContext';

const ROLE_MAP_AR = {
  Audit: 'تدقيق',
  User: 'مستخدم',
  Admin: 'مسؤول',
  HR: 'موارد بشرية',
  Manager: 'مدير',
  Employee: 'موظف',
  Finance: 'مالية',
  System: 'النظام',
};

const ACTION_MAP_AR = {
  LOGIN: 'تسجيل دخول',
  LOGOUT: 'تسجيل خروج',
  LOGIN_FAILED: 'فشل تسجيل الدخول',
  CREATE: 'إنشاء',
  UPDATE: 'تحديث',
  DELETE: 'حذف',
  APPROVE: 'موافقة',
  REJECT: 'رفض',
  LOCK: 'إقفال',
  CALCULATE: 'احتساب',
  VALIDATE: 'تدقيق',
  PAY: 'صرف',
  RESET: 'إعادة تعيين',
  INVITE: 'دعوة',
  SUBMIT: 'تقديم',
  DOCUMENT_VIEW: 'عرض الوثيقة',
  DOCUMENT_DOWNLOAD: 'تحميل الوثيقة',
  DOCUMENT_UPLOAD: 'رفع الوثيقة',
  DOCUMENT: 'وثيقة',
  VIEW: 'عرض',
  DOWNLOAD: 'تحميل',
  UPLOAD: 'رفع',
  PASSWORD_CHANGE: 'تغيير كلمة المرور',
  PASSWORD_RESET: 'إعادة تعيين كلمة المرور',
  SIGN_OFF: 'اعتماد',
  PUNCH: 'بصمة',
  BRANCH_CHANGE: 'تغيير الفرع',
  STATUS_CHANGE: 'تغيير الحالة',
  ROLE_ASSIGN: 'تعيين دور',
  ROLE_REVOKE: 'إلغاء دور',
  EXPORT: 'تصدير',
  IMPORT: 'استيراد',
};

const TARGET_MAP_AR = {
  users: 'المستخدمين',
  user: 'المستخدم',
  employees: 'الموظفين',
  employee: 'الموظف',
  contracts: 'العقود',
  contract: 'العقد',
  pay_runs: 'مسيرات الرواتب',
  pay_run: 'مسير الرواتب',
  company_visas: 'التأشيرات',
  visas: 'التأشيرات',
  visa: 'التأشيرة',
  branches: 'الفروع',
  branch: 'الفرع',
  departments: 'الأقسام',
  department: 'القسم',
  shifts: 'المناوبات',
  shift: 'المناوبة',
  attendance_days: 'سجلات الحضور',
  attendance: 'الحضور',
  punches: 'البصمات',
  punch: 'البصمة',
  overtime_requests: 'طلبات العمل الإضافي',
  overtime: 'العمل الإضافي',
  leave_requests: 'طلبات الإجازة',
  leave: 'الإجازات',
  final_settlements: 'مستحقات نهاية الخدمة',
  settlements: 'المستحقات',
  settlement: 'المستحقات',
  separations: 'إنهاء الخدمة',
  separation: 'إنهاء الخدمة',
  roles: 'الأدوار',
  role: 'الدور',
  settings: 'الإعدادات',
  companies: 'الشركات',
  company: 'الشركة',
  bank_accounts: 'الحسابات المصرفية',
  documents: 'الوثائق',
  employee_documents: 'وثائق الموظف',
};

function translateRole(r, lang) {
  if (lang !== 'ar' || !r) return r;
  return ROLE_MAP_AR[r] || ROLE_MAP_AR[r.charAt(0).toUpperCase() + r.slice(1).toLowerCase()] || r;
}

function translateAction(act, lang) {
  if (lang !== 'ar' || !act) return act;
  const upper = String(act).toUpperCase().replace(/[\s-]+/g, '_');
  if (ACTION_MAP_AR[upper]) return ACTION_MAP_AR[upper];
  if (ACTION_MAP_AR[act]) return ACTION_MAP_AR[act];
  const parts = upper.split('_');
  const translatedParts = parts.map((w) => ACTION_MAP_AR[w] || w);
  if (translatedParts.some((p, i) => p !== parts[i])) {
    return translatedParts.join(' ');
  }
  return act;
}

function translateTarget(tgt, lang) {
  if (lang !== 'ar' || !tgt) return tgt;
  const lower = String(tgt).toLowerCase().replace(/-/g, '_');
  return TARGET_MAP_AR[lower] || TARGET_MAP_AR[tgt] || tgt;
}

export function RecentActivityTile({ data = [], onClick }) {
  const { t, language } = useLanguage();
  const items = Array.isArray(data) ? data : data?.items || [];

  return (
    <BentoTile
      id="recent-activity-tile"
      area="audit"
      onClick={onClick}
      iconWell={
        <IconWell size="md" shape="square" color="primary">
          <History className="w-5 h-5 stroke-[2]" />
        </IconWell>
      }
      title={t('dashboard.activity.title')}
      subtitle={language === 'ar' ? 'سجل تدقيق غير قابل للتعديل · طوابع زمنية موثقة' : 'Immutable audit log · tamper-evident timestamps'}
      badge={
        <span className="text-xs text-text-muted flex items-center gap-1 group-hover:text-primary transition-colors">
          {t('dashboard.activity.viewAudit')}
          <ChevronRight className="w-3.5 h-3.5 rtl:-scale-x-100" />
        </span>
      }
    >
      {/* 5 Flat Rows with 1px Dividers: No box around each row */}
      <ListDivided>
        {items.slice(0, 5).map((item, idx) => (
          <div
            key={item.id || idx}
            className="flex items-center justify-between text-xs py-2 first:pt-0 last:pb-0 gap-3"
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              {/* Avatar */}
              <div className="w-6 h-6 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                {item.avatar || item.actor?.slice(0, 2).toUpperCase() || item.user?.slice(0, 2).toUpperCase() || 'U'}
              </div>

              {/* Actor, Role, Action, Target */}
              <div className="truncate min-w-0">
                <strong className="text-text font-semibold">
                  {language === 'ar' && (item.actor === 'System' || item.user === 'System')
                    ? 'النظام'
                    : (item.actor || item.user)}
                </strong>
                <span className="text-text-muted mx-1">
                  ({translateRole(item.role || 'User', language)})
                </span>
                <span className="text-text">
                  {translateAction(item.action, language)}
                </span>
                {item.target && (
                  <span className="text-text-muted text-[11px] ms-1">
                    — {translateTarget(item.target, language)}
                  </span>
                )}
              </div>
            </div>

            {/* Timestamp */}
            <span className="text-[11px] text-text-muted flex-shrink-0 tabular-nums ms-2">
              {item.timestamp || item.time}
            </span>
          </div>
        ))}
      </ListDivided>
    </BentoTile>
  );
}
