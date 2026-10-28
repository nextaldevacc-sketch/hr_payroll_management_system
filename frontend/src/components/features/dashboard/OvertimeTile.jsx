'use client';

import React from 'react';
import { Clock, AlertCircle } from 'lucide-react';
import { BentoTile } from '../../primitives/BentoTile';
import { IconWell } from '../../primitives/IconWell';
import { formatCurrency } from '@nextal/shared';
import { useLanguage } from '../../../context/LanguageContext';

export function OvertimeTile({ data, onClick }) {
  const { language } = useLanguage();
  const types = data?.types || [
    { name: 'Normal ×1.25', hours: 110, amount: 4200.00, percent: 50 },
    { name: 'Night ×1.5', hours: 42, amount: 2016.00, percent: 24 },
    { name: 'Rest day ×1.5', hours: 20, amount: 1008.00, percent: 12 },
    { name: 'Holiday ×1.5', hours: 24, amount: 1196.50, percent: 14 },
  ];

  return (
    <BentoTile
      id="overtime-tile"
      area="ot"
      onClick={onClick}
      iconWell={
        <IconWell size="md" shape="square" color="primary">
          <Clock className="w-5 h-5 stroke-[2]" />
        </IconWell>
      }
      title="Overtime This Month"
      subtitle={`${data?.totalHours || 196}h approved · ${formatCurrency(data?.totalAmount || 8420.50, 'AED', language)}`}
    >
      <div className="space-y-2">
        {/* 4 Overtime Categories Split with Hours, AED and Thin Bar */}
        <div className="space-y-1.5">
          {types.map((ot) => (
            <div key={ot.name} className="space-y-0.5 text-xs">
              <div className="flex justify-between items-center text-text-muted">
                <span className="font-semibold text-text text-[11px]">{ot.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] tabular-nums">{ot.hours}h</span>
                  <bdi className="font-bold tabular-nums text-text text-[11px]">
                    {formatCurrency(ot.amount, 'AED', language)}
                  </bdi>
                </div>
              </div>
              <div className="w-full h-1 bg-black/[0.04] dark:bg-white/[0.06] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${ot.percent}%`, backgroundColor: 'var(--primary)' }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Pending Approval Notice */}
        <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[11px] text-text-muted">
          <div className="flex items-center gap-1.5 min-w-0">
            <AlertCircle className="w-3.5 h-3.5 text-warning-text flex-shrink-0" />
            <span className="truncate">
              Pending: <strong>{data?.pendingRequests || 5} requests · {data?.pendingHours || 14}h</strong>
            </span>
          </div>
          <span className="text-[10px] text-warning-text flex-shrink-0 ms-1">
            Rolls to next month at cut-off
          </span>
        </div>
      </div>
    </BentoTile>
  );
}
