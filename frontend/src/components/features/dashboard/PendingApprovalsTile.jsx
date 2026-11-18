'use client';

import React from 'react';
import { CheckCircle2, ChevronRight, Check } from 'lucide-react';
import { BentoTile } from '../../primitives/BentoTile';
import { IconWell } from '../../primitives/IconWell';
import { InsetBox } from '../../primitives/InsetBox';
import { StatNumber } from '../../primitives/StatNumber';
import { useLanguage } from '../../../context/LanguageContext';

const APPROVAL_TYPE_LABELS = {
  'Leave Requests': { en: 'Leave Requests', ar: 'طلبات الإجازة' },
  'LEAVE': { en: 'Leave Request', ar: 'طلب إجازة' },
  'Overtime Hours': { en: 'Overtime Hours', ar: 'ساعات الإضافي' },
  'OVERTIME': { en: 'Overtime', ar: 'العمل الإضافي' },
  'Salary Adjustments': { en: 'Salary Adjustments', ar: 'تعديلات الرواتب' },
  'SALARY_ADJUSTMENT': { en: 'Salary Adjustment', ar: 'تسوية راتب' },
  'Final Settlements': { en: 'Final Settlements', ar: 'مستحقات نهاية الخدمة' },
  'EMPLOYEE_VERIFICATION': { en: 'Employee Verification', ar: 'توثيق بيانات موظف' },
  'EMPLOYEE_BRANCH_CHANGE': { en: 'Branch Transfer', ar: 'نقل فرع الموظف' },
};

export function PendingApprovalsTile({ data, onClick, onApproveItem, onOpenItem }) {
  const { t, language } = useLanguage();
  const oldestItems = data.oldestItems || [];

  return (
    <BentoTile
      id="pending-approvals-tile"
      area="appr"
      onClick={onClick}
      iconWell={
        <IconWell size="md" shape="square" color="warning">
          <CheckCircle2 className="w-5 h-5 stroke-[2]" />
        </IconWell>
      }
      title={t('dashboard.pendingApprovals.title')}
      subtitle={t('dashboard.pendingApprovals.subtitle')}
      badge={
        onClick ? (
          <span className="text-xs text-text-muted flex items-center gap-1 group-hover:text-primary transition-colors">
            {t('common.viewAll')}
            <ChevronRight className="w-3.5 h-3.5 rtl:-scale-x-100" />
          </span>
        ) : null
      }
    >
      <div className="space-y-3">
        {/* Total Stat and 4 category counters */}
        <div className="flex items-center gap-3">
          <StatNumber value={data.total} size="md" />
          <div className="grid grid-cols-2 gap-1.5 flex-1 text-[11px]">
            {(data?.items || []).slice(0, 4).map((item) => (
              <InsetBox
                key={item.type}
                className="flex items-center justify-between px-2.5 py-1.5"
              >
                <span className="text-text-muted truncate pe-1">
                  {language === 'ar' ? (APPROVAL_TYPE_LABELS[item.type]?.ar || item.type) : item.type}
                </span>
                <bdi className="font-bold tabular-nums text-text">{item.count}</bdi>
              </InsetBox>
            ))}
          </div>
        </div>

        {/* Top 2 oldest items inline */}
        <div className="space-y-1.5 pt-1 border-t border-border/40 dark:border-border">
          {oldestItems.slice(0, 2).map((item) => (
            <InsetBox
              key={item.id}
              className="flex items-center justify-between py-2 px-2.5 text-xs gap-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                  {item.avatar}
                </div>
                <div className="truncate">
                  <span className="font-semibold text-text truncate block">
                    {language === 'ar' ? (item.employeeAr || item.employee) : item.employee}
                  </span>
                  <span className="text-[10px] text-text-muted block leading-none">
                    {(language === 'ar'
                      ? APPROVAL_TYPE_LABELS[item.type]?.ar
                      : APPROVAL_TYPE_LABELS[item.type]?.en) || item.type} · {item.age}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                {onApproveItem && !item.isOwn ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onApproveItem(item);
                    }}
                    className="px-2 py-0.5 rounded text-[11px] font-bold bg-secondary text-white hover:bg-secondary/90 flex items-center gap-1 transition-colors"
                  >
                    <Check className="w-3 h-3" />
                    <span>{language === 'ar' ? 'موافقة' : 'Approve'}</span>
                  </button>
                ) : onOpenItem ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenItem(item);
                    }}
                    className="px-2 py-0.5 rounded text-[11px] font-medium bg-black/5 dark:bg-inset text-text hover:bg-black/10 dark:hover:bg-inset-hover transition-colors"
                  >
                    <span>{language === 'ar' ? 'فتح' : 'Open'}</span>
                  </button>
                ) : null}
              </div>
            </InsetBox>
          ))}
        </div>
      </div>
    </BentoTile>
  );
}
