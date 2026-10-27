'use client';

import React from 'react';
import { CalendarDays } from 'lucide-react';
import { BentoTile } from '../primitives/BentoTile';
import { IconWell } from '../primitives/IconWell';
import { InsetBox } from '../primitives/InsetBox';
import { useLanguage } from '../../context/LanguageContext';

export function WeekAheadTile({ data = [], onClick }) {
  const { language } = useLanguage();

  const getItemDotColor = (type) => {
    switch (type) {
      case 'holiday':
        return 'bg-primary';
      case 'leave':
        return 'bg-info';
      case 'probation':
        return 'bg-warning-text';
      case 'contract':
        return 'bg-purple-400';
      case 'cutoff':
        return 'bg-danger-text';
      case 'off':
        return 'bg-text-muted/40';
      default:
        return 'bg-primary';
    }
  };

  return (
    <BentoTile
      id="week-ahead-tile"
      area="week"
      onClick={onClick}
      iconWell={
        <IconWell size="md" shape="square" color="primary">
          <CalendarDays className="w-5 h-5 stroke-[2]" />
        </IconWell>
      }
      title="The Week Ahead"
      subtitle="7-day schedule · leaves, contractual events & cut-off deadlines"
    >
      {/* 7-Day Horizontal Strip: one column per day starting today */}
      <div className="grid grid-cols-7 gap-2 h-full">
        {data.map((day, idx) => (
          <InsetBox
            key={idx}
            tone={idx === 0 ? 'primary-strong' : 'neutral'}
            className={`p-2 flex flex-col justify-start ${day.isWeekend ? 'opacity-75' : ''}`}
          >
            {/* Day Header */}
            <div className="flex items-baseline justify-between pb-1 mb-1.5 border-b border-border/30 dark:border-border">
              <span className={`text-xs font-bold ${idx === 0 ? 'text-primary' : 'text-text'}`}>
                {language === 'ar' ? day.dayAr : day.day}
              </span>
              <span className="text-[10px] text-text-muted">{day.date}</span>
            </div>

            {/* Items for this day */}
            <div className="space-y-1.5 flex-1">
              {day.items.map((item, iIdx) => (
                <div key={iIdx} className="flex items-start gap-1.5 text-[11px] leading-tight">
                  <span
                    className={`w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0 ${getItemDotColor(
                      item.type
                    )}`}
                  />
                  <span className="text-text-muted hover:text-text transition-colors line-clamp-2">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </InsetBox>
        ))}
      </div>
    </BentoTile>
  );
}
