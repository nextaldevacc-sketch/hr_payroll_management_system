'use client';

import React from 'react';
import { TrendingUp, TrendingDown, ArrowUpRight, AlertCircle } from 'lucide-react';
import { BentoTile } from '../../primitives/BentoTile';
import { IconWell } from '../../primitives/IconWell';
import { InsetBox } from '../../primitives/InsetBox';
import { StatNumber } from '../../primitives/StatNumber';
import { formatCurrency } from '@nextal/shared';
import { useLanguage } from '../../../context/LanguageContext';

const REASON_MAP_AR = {
  'New hire': 'تعيين جديد',
  'Approved OT': 'عمل إضافي معتمد',
  'Unpaid leave': 'إجازة غير مدفوعة',
  'Salary increase': 'زيادة راتب',
  'Loan deduction': 'خصم سلفة',
  'Late penalty': 'خصم تأخير',
};

export function VarianceTile({ data, onClick }) {
  const { t, language } = useLanguage();
  const rawTopChanges = Array.isArray(data?.topChanges) ? data.topChanges : [];

  const topChanges = rawTopChanges.map((item) => ({
    ...item,
    reasonLabel: language === 'ar' ? (item.reasonAr || REASON_MAP_AR[item.reason] || item.reason) : item.reason,
  }));

  const diffNumeric = Number(data?.diffAmount ?? data?.diffAed ?? 0);
  const diffPrefix = diffNumeric === 0 ? '' : (data?.isPositive !== false ? '+' : '-');
  const subtitleText = data?.periodLabel
    ? (language === 'ar' ? (data.periodLabelAr || data.periodLabel) : data.periodLabel)
    : (language === 'ar' ? 'مقارنة الشهر الحالي بالسابق' : 'Month-over-month comparison');

  return (
    <BentoTile
      id="variance-tile"
      area="var"
      onClick={onClick}
      iconWell={
        <IconWell
          size="md"
          shape="square"
          color={data.isPositive ? 'secondary' : 'danger'}
        >
          {data.isPositive ? (
            <TrendingUp className="w-5 h-5 stroke-[2]" />
          ) : (
            <TrendingDown className="w-5 h-5 stroke-[2]" />
          )}
        </IconWell>
      }
      title={t('dashboard.variance.title')}
      subtitle={subtitleText}
    >
      <div className="space-y-2.5">
        {/* Net this month vs last with AED and % difference */}
        <div className="flex items-baseline justify-between">
          <div>
            <span className="text-[10px] text-text-muted block">
              {language === 'ar' ? 'صافي هذا الشهر' : 'This Month Net'}
            </span>
            <StatNumber
              value={data.currentMonthNet}
              isCurrency={true}
              size="sm"
            />
          </div>

          <div className="flex flex-col items-end">
            <span className="text-[10px] text-text-muted block">
              {language === 'ar' ? 'الفارق الصافي' : 'Net Difference'}
            </span>
            <div
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                data.isPositive
                  ? 'bg-secondary-wash text-secondary-text'
                  : 'bg-danger-wash text-danger-text'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <bdi className="tabular-nums">
                {diffPrefix}{formatCurrency(Math.abs(diffNumeric), 'AED', language)}{' '}
                {(data.diffPercent != null || data.diffPct != null) ? `(${data.diffPercent ?? data.diffPct}%)` : '(0.0%)'}
              </bdi>
            </div>
          </div>
        </div>

        {/* Top 3 Employees with largest change and reasons */}
        <div className="space-y-1.5 pt-1 border-t border-border/40 text-xs">
          <span className="text-[10px] uppercase font-bold text-text-muted block">
            {language === 'ar' ? 'أبرز أسباب الفروقات' : 'Top Variance Drivers'}
          </span>
          {topChanges.length === 0 ? (
            <p className="text-[11px] text-text-muted py-1">
              {language === 'ar' ? 'لا توجد فروقات مسجلة' : 'No variance drivers yet'}
            </p>
          ) : (
            topChanges.map((item, idx) => (
              <InsetBox
                key={idx}
                className="flex items-center justify-between py-1.5 px-2.5 text-xs"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  {item.warning && (
                    <AlertCircle className="w-3 h-3 text-warning-text flex-shrink-0" />
                  )}
                  <span className="font-semibold text-text truncate">
                    {language === 'ar' ? (item.employeeAr || item.employee) : item.employee}
                  </span>
                  <span className="text-[10px] text-text-muted truncate">
                    · {item.reasonLabel}
                  </span>
                </div>
                <bdi
                  className={`text-[11px] font-bold tabular-nums ms-2 ${
                    item.diff.startsWith('+') ? 'text-secondary-text' : 'text-danger-text'
                  }`}
                >
                  {item.diff}
                </bdi>
              </InsetBox>
            ))
          )}
        </div>
      </div>
    </BentoTile>
  );
}
