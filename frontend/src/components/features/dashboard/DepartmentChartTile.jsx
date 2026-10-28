'use client';

import React from 'react';
import { Layers } from 'lucide-react';
import { BentoTile } from '../../primitives/BentoTile';
import { IconWell } from '../../primitives/IconWell';
import { useLanguage } from '../../../context/LanguageContext';

export function DepartmentChartTile({ data = [], onClick }) {
  const { t } = useLanguage();

  // Single gold ramp: 100%, 80%, 62%, 46%, 32% ranked by department size
  const goldRampOpacities = [1.0, 0.80, 0.62, 0.46, 0.32];
  const sortedData = [...data].sort((a, b) => (b.count || 0) - (a.count || 0));

  return (
    <BentoTile
      id="department-chart-tile"
      area="dept"
      onClick={onClick}
      iconWell={
        <IconWell size="md" shape="square" color="primary">
          <Layers className="w-5 h-5 stroke-[2]" />
        </IconWell>
      }
      title={t('dashboard.deptHeadcount.title')}
      subtitle="42 employees in 5 units"
    >
      {/* Dense layout, no empty bottom space */}
      <div className="space-y-2">
        {sortedData.map((dept, index) => {
          const opacity = goldRampOpacities[index] || 0.3;
          return (
            <div key={dept.name} className="flex flex-col gap-1 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-text truncate">{dept.name}</span>
                <div className="flex items-center gap-1.5 flex-shrink-0 ms-2 text-[11px] text-text-muted">
                  <bdi className="font-bold text-text tabular-nums">{dept.count}</bdi>
                  <span>({dept.percentage}%)</span>
                </div>
              </div>

              <div className="w-full h-1.5 bg-black/[0.04] dark:bg-white/[0.06] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${dept.percentage}%`,
                    opacity: opacity,
                    backgroundColor: 'var(--primary)',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </BentoTile>
  );
}
