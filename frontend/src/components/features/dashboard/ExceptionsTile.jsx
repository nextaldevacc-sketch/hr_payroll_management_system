'use client';

import React from 'react';
import { AlertTriangle, Fingerprint, Clock, AlertCircle, ChevronRight } from 'lucide-react';
import { BentoTile } from '../../primitives/BentoTile';
import { IconWell } from '../../primitives/IconWell';
import { InsetBox } from '../../primitives/InsetBox';
import { useLanguage } from '../../../context/LanguageContext';

export function ExceptionsTile({ data = [], onSelectException }) {
  const { t } = useLanguage();

  const getIcon = (id) => {
    switch (id) {
      case 'ex-1':
        return <Fingerprint className="w-4 h-4 text-warning-text" />;
      case 'ex-2':
        return <Clock className="w-4 h-4 text-warning-text" />;
      case 'ex-3':
        return <AlertCircle className="w-4 h-4 text-danger-text" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-warning-text" />;
    }
  };

  const totalExceptions = data.reduce((acc, curr) => acc + curr.count, 0);

  return (
    <BentoTile
      id="exceptions-tile"
      area="exc"
      iconWell={
        <IconWell size="md" shape="square" color="danger">
          <AlertTriangle className="w-5 h-5 stroke-[2]" />
        </IconWell>
      }
      title={t('dashboard.exceptions.title')}
      subtitle="Payroll blocking items"
      badge={
        <span className="text-xs font-bold px-2 py-0.5 rounded-pill bg-danger-wash text-danger-text">
          {totalExceptions} issues
        </span>
      }
    >
      <div className="space-y-2">
        {/* List starts DIRECTLY under header */}
        <div className="space-y-1.5">
          {data.slice(0, 3).map((item) => (
            <InsetBox
              key={item.id}
              interactive
              onClick={() => onSelectException && onSelectException(item)}
              className="p-2.5 group flex items-center justify-between gap-2.5 text-xs"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="flex-shrink-0">{getIcon(item.id)}</div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-semibold text-text group-hover:text-primary transition-colors truncate">
                    {item.title}
                  </h4>
                  <p className="text-[10px] text-text-muted truncate">
                    {item.subtitle}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <span
                  className={`text-[11px] font-bold px-1.5 py-0.5 rounded tabular-nums ${
                    item.severity === 'danger'
                      ? 'bg-danger-wash text-danger-text'
                      : 'bg-warning-wash text-warning-text'
                  }`}
                >
                  {item.count}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-text-muted group-hover:text-text rtl:-scale-x-100" />
              </div>
            </InsetBox>
          ))}
        </div>

        {/* Footer line: 1px divider only */}
        <div className="pt-2 border-t border-border/40 dark:border-border text-[11px] text-text-muted flex items-center justify-between">
          <span className="font-semibold text-warning-text">Must be cleared before cut-off in 4 days</span>
          <span className="text-[10px]">Strict WPS policy</span>
        </div>
      </div>
    </BentoTile>
  );
}
