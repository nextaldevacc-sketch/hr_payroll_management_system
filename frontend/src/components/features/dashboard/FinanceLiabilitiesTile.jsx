'use client';

import React from 'react';
import { PiggyBank, ArrowUpRight } from 'lucide-react';
import { BentoTile } from '../../primitives/BentoTile';
import { IconWell } from '../../primitives/IconWell';
import { InsetBox } from '../../primitives/InsetBox';
import { formatCurrency } from '@nextal/shared';
import { useLanguage } from '../../../context/LanguageContext';

export function FinanceLiabilitiesTile({ data, onClick }) {
  const { language, t } = useLanguage();
  const gratuity = data?.gratuity || {
    totalAccrued: 482650.00,
    monthDelta: 14200.00,
    deltaPercent: '+3.0%',
    isPositive: true
  };

  const leaveLiability = data?.leaveLiability || {
    totalAccrued: 128400.00,
    monthDelta: 2850.00,
    deltaPercent: '+2.3%',
    isPositive: true
  };

  return (
    <BentoTile
      id="finance-liabilities-tile"
      area="liab"
      onClick={onClick}
      iconWell={
        <IconWell size="md" shape="square" color="primary">
          <PiggyBank className="w-5 h-5 stroke-[2]" />
        </IconWell>
      }
      title={t('dashboard.liabilities.title')}
      subtitle="Accrued balance sheet provisions"
    >
      <div className="space-y-2.5">
        {/* KPI 1: Gratuity Provision */}
        <InsetBox className="p-2.5 text-xs">
          <div className="flex items-center justify-between text-text-muted mb-0.5">
            <span className="font-semibold text-text text-[11px]">{t('dashboard.liabilities.gratuity')}</span>
            <div className="flex items-center text-[10px] text-secondary-text font-bold">
              <ArrowUpRight className="w-3 h-3" />
              <span>{gratuity.deltaPercent}</span>
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <bdi className="text-lg font-black text-text tabular-nums">
              {formatCurrency(gratuity.totalAccrued, 'AED', language)}
            </bdi>
            <span className="text-[10px] text-text-muted">
              +{formatCurrency(gratuity.monthDelta, 'AED', language)} this mo
            </span>
          </div>
        </InsetBox>

        {/* KPI 2: Leave Liability */}
        <InsetBox className="p-2.5 text-xs">
          <div className="flex items-center justify-between text-text-muted mb-0.5">
            <span className="font-semibold text-text text-[11px]">Annual Leave Liability</span>
            <div className="flex items-center text-[10px] text-secondary-text font-bold">
              <ArrowUpRight className="w-3 h-3" />
              <span>{leaveLiability.deltaPercent}</span>
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <bdi className="text-lg font-black text-text tabular-nums">
              {formatCurrency(leaveLiability.totalAccrued, 'AED', language)}
            </bdi>
            <span className="text-[10px] text-text-muted">
              +{formatCurrency(leaveLiability.monthDelta, 'AED', language)} this mo
            </span>
          </div>
        </InsetBox>
      </div>
    </BentoTile>
  );
}
