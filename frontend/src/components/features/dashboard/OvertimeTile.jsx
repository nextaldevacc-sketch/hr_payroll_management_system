'use client';

import React from 'react';
import { Clock, AlertCircle } from 'lucide-react';
import { BentoTile } from '../../primitives/BentoTile';
import { IconWell } from '../../primitives/IconWell';
import { formatCurrency } from '@nextal/shared';
import { useLanguage } from '../../../context/LanguageContext';
import { useAuth } from '../../../context/AuthContext';

const OT_NAME_MAP = {
  'Normal ×1.25': { en: 'Normal ×1.25', ar: 'عادي ×١.٢٥' },
  'Night ×1.5': { en: 'Night ×1.5', ar: 'ليلي ×١.٥' },
  'Holiday/Rest ×1.5': { en: 'Holiday/Rest ×1.5', ar: 'عطلة/راحة ×١.٥' },
  'Rest day ×1.5': { en: 'Rest day ×1.5', ar: 'يوم راحة ×١.٥' },
  'Holiday ×1.5': { en: 'Holiday ×1.5', ar: 'عطلة رسمية ×١.٥' },
};

export function OvertimeTile({ data, onClick }) {
  const { language, t } = useLanguage();
  const { seesSalary } = useAuth();

  const types = data?.types || [
    { name: 'Normal ×1.25', hours: 110, percent: 56 },
    { name: 'Night ×1.5', hours: 42, percent: 21 },
    { name: 'Rest day ×1.5', hours: 20, percent: 10 },
    { name: 'Holiday ×1.5', hours: 24, percent: 13 },
  ];

  const totalHours = data?.totalHours ?? 196;
  const showAmount = Boolean(seesSalary && data?.totalAmount != null);

  const subtitle = language === 'ar'
    ? (showAmount ? `${totalHours} س معتمدة · ${formatCurrency(data.totalAmount, 'AED', language)}` : `${totalHours} س معتمدة`)
    : (showAmount ? `${totalHours}h approved · ${formatCurrency(data.totalAmount, 'AED', language)}` : `${totalHours}h approved`);

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
      title={t('dashboard.overtime.title')}
      subtitle={subtitle}
    >
      <div className="space-y-2">
        {/* Overtime Categories Split with Hours and optional AED */}
        <div className="space-y-1.5">
          {types.map((ot) => (
            <div key={ot.name} className="space-y-0.5 text-xs">
              <div className="flex justify-between items-center text-text-muted">
                <span className="font-semibold text-text text-[11px]">
                  {language === 'ar' ? (OT_NAME_MAP[ot.name]?.ar || ot.name) : (OT_NAME_MAP[ot.name]?.en || ot.name)}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] tabular-nums font-semibold">
                    {ot.hours}{language === 'ar' ? ' س' : 'h'}
                  </span>
                  {seesSalary && ot.amount != null && (
                    <bdi className="font-bold tabular-nums text-text text-[11px]">
                      {formatCurrency(ot.amount, 'AED', language)}
                    </bdi>
                  )}
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
              {language === 'ar' ? 'ساعات معلقة في انتظار اعتماد المشرف' : 'Hours pending approval'}
            </span>
          </div>
          <span className="font-bold text-text tabular-nums shrink-0">12h</span>
        </div>
      </div>
    </BentoTile>
  );
}
