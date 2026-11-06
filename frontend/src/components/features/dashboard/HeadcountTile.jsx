'use client';

import React from 'react';
import { Users, UserPlus, UserMinus } from 'lucide-react';
import { BentoTile } from '../../primitives/BentoTile';
import { IconWell } from '../../primitives/IconWell';
import { InsetBox } from '../../primitives/InsetBox';
import { StatNumber } from '../../primitives/StatNumber';
import { useLanguage } from '../../../context/LanguageContext';

export function HeadcountTile({ data, onClick }) {
  const { t } = useLanguage();
  const natMix = data.nationalityMix || { uaeNationals: 4, expats: 38, uaePercent: 9.5, expatPercent: 90.5, gpssaEligible: 4 };
  const count = data.netCount ?? ((data.joiners || 0) - (data.leavers || 0));
  const netDisplay = t('dashboard.headcount.netCount', { count: count || 1 });

  return (
    <BentoTile
      id="headcount-tile"
      area="head"
      onClick={onClick}
      iconWell={
        <IconWell size="md" shape="square" color="primary">
          <Users className="w-5 h-5 stroke-[2]" />
        </IconWell>
      }
      title={t('dashboard.headcount.title')}
      subtitle={t('dashboard.headcount.active')}
    >
      <div className="space-y-3">
        {/* Big number immediately under header: no gap */}
        <div className="flex items-baseline justify-between">
          <StatNumber value={data.total} size="lg" />
          <span className="text-xs text-secondary-text font-bold block tabular-nums">
            {netDisplay}
          </span>
        </div>

        {/* Joiners and Leavers on one line */}
        <InsetBox className="flex items-center justify-between text-xs py-2 px-3">
          <div className="flex items-center gap-1.5 text-secondary-text">
            <UserPlus className="w-3.5 h-3.5 flex-shrink-0" />
            <bdi className="tabular-nums font-bold">+{data.joiners}</bdi>
            <span className="text-[11px] text-text-muted">{t('dashboard.headcount.joiners')}</span>
          </div>

          <div className="w-px h-3 bg-border/60 dark:bg-border" />

          <div className="flex items-center gap-1.5 text-danger-text">
            <UserMinus className="w-3.5 h-3.5 flex-shrink-0" />
            <bdi className="tabular-nums font-bold">-{data.leavers}</bdi>
            <span className="text-[11px] text-text-muted">{t('dashboard.headcount.leavers')}</span>
          </div>
        </InsetBox>

        {/* Nationality Mix Bar (UAE National / Expat, with GPSSA-eligible count) */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-text font-semibold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-primary" />
              UAE National: {natMix.uaeNationals} ({natMix.gpssaEligible} GPSSA)
            </span>
            <span className="text-text-muted flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              Expat: {natMix.expats}
            </span>
          </div>

          <div className="w-full h-2 bg-black/[0.04] dark:bg-white/[0.06] rounded-full overflow-hidden flex">
            <div
              className="h-full bg-primary rounded-s-full transition-all duration-500"
              style={{ width: `${natMix.uaePercent}%` }}
              title={`UAE Nationals: ${natMix.uaeNationals}`}
            />
            <div
              className="h-full bg-slate-400 rounded-e-full transition-all duration-500"
              style={{ width: `${natMix.expatPercent}%` }}
              title={`Expats: ${natMix.expats}`}
            />
          </div>
        </div>
      </div>
    </BentoTile>
  );
}
