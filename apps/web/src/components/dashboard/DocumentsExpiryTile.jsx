'use client';

import React from 'react';
import { ShieldAlert, ChevronRight } from 'lucide-react';
import { BentoTile } from '../primitives/BentoTile';
import { IconWell } from '../primitives/IconWell';
import { InsetBox } from '../primitives/InsetBox';
import { StatNumber } from '../primitives/StatNumber';
import { useLanguage } from '../../context/LanguageContext';

export function DocumentsExpiryTile({ data, onClick }) {
  const { t, language } = useLanguage();
  const breakdown = data?.breakdown || [];
  const items = data?.items || [];

  return (
    <BentoTile
      id="documents-expiry-tile"
      area="docs"
      onClick={onClick}
      iconWell={
        <IconWell size="md" shape="square" color="danger">
          <ShieldAlert className="w-5 h-5 stroke-[2]" />
        </IconWell>
      }
      title={t('dashboard.expiringDocs.title')}
      subtitle="Visa, Emirates ID, Labour Card"
      badge={
        <span className="text-xs text-text-muted flex items-center gap-1 group-hover:text-primary transition-colors">
          {t('common.viewAll')}
          <ChevronRight className="w-3.5 h-3.5 rtl:-scale-x-100" />
        </span>
      }
    >
      <div className="space-y-3">
        {/* Count and Stacked Bar */}
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <StatNumber value={data.total} size="md" />
            <span className="text-xs text-text-muted">Total expiring</span>
          </div>

          {/* Single Stacked Bar */}
          <div className="w-full h-2.5 bg-black/[0.04] dark:bg-white/[0.06] rounded-full overflow-hidden flex">
            {breakdown.map((b, idx) => (
              <div
                key={b.label}
                className="h-full transition-all duration-500 first:rounded-s-full last:rounded-e-full"
                style={{ width: `${b.percent}%`, backgroundColor: b.color }}
                title={`${b.label}: ${b.count}`}
              />
            ))}
          </div>

          {/* Legend Underneath */}
          <div className="flex items-center justify-between text-[10px] text-text-muted pt-0.5">
            {breakdown.map((b) => (
              <div key={b.label} className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: b.color }} />
                <span>{b.label} ({b.count})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top 2 Expiring Items */}
        <div className="space-y-1.5 pt-1 border-t border-border/40 dark:border-border text-xs">
          {items.slice(0, 2).map((item, idx) => (
            <InsetBox
              key={idx}
              tone={item.daysLeft < 0 ? 'danger' : 'warning'}
              className="flex items-center justify-between py-2 px-2.5"
            >
              <div className="min-w-0 flex-1 pe-2">
                <span className="font-semibold text-text truncate block">
                  {language === 'ar' ? (item.employeeAr || item.employee) : item.employee}
                </span>
                <span className="text-[10px] text-text-muted block truncate">
                  {item.doc} · Resp: {item.owner}
                </span>
              </div>

              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                  item.daysLeft < 0
                    ? 'bg-danger-wash text-danger-text'
                    : 'bg-warning-wash text-warning-text'
                }`}
              >
                {item.daysLeft < 0 ? 'EXPIRED' : `${item.daysLeft}d left`}
              </span>
            </InsetBox>
          ))}
        </div>
      </div>
    </BentoTile>
  );
}
