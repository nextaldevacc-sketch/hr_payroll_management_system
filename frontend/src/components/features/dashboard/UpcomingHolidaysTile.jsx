'use client';

import React from 'react';
import { Calendar, Palmtree, User } from 'lucide-react';
import { BentoTile } from '../../primitives/BentoTile';
import { IconWell } from '../../primitives/IconWell';
import { InsetBox } from '../../primitives/InsetBox';
import { useLanguage } from '../../../context/LanguageContext';

export function UpcomingHolidaysTile({ data, onClick }) {
  const { t } = useLanguage();

  return (
    <BentoTile
      id="upcoming-holidays-tile"
      colSpan={6}
      rowSpan={1}
      onClick={onClick}
      iconWell={
        <IconWell size="md" shape="square" color="primary">
          <Palmtree className="w-5 h-5 stroke-[2]" />
        </IconWell>
      }
      title={t('dashboard.holidays.title')}
      subtitle="Public holidays calendar & scheduled absences"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
        {/* Next UAE Public Holiday Card */}
        {data?.holidays?.[0] && (
          <InsetBox tone="primary" className="p-3.5 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary text-white flex flex-col items-center justify-center flex-shrink-0 text-center font-bold">
              <span className="text-[10px] uppercase leading-none">Dec</span>
              <span className="text-sm leading-none mt-0.5">01</span>
            </div>
            <div>
              <h4 className="text-xs font-bold text-text dark:gold-heading">
                {data.holidays[0].name}
              </h4>
              <p className="text-[11px] text-text-muted mt-0.5">
                {data.holidays[0].dates} · {data.holidays[0].days} days paid
              </p>
              <span className="inline-block text-[10px] text-primary font-semibold mt-1">
                Federal Decree-Law 33/2021
              </span>
            </div>
          </InsetBox>
        )}

        {/* Staff on Leave this week */}
        <InsetBox tone="neutral" className="p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold mb-2">
            <span className="text-text">{t('dashboard.holidays.staffOnLeave')}</span>
            <span className="text-[11px] font-bold text-primary">2 active</span>
          </div>
          <div className="space-y-1.5 text-xs">
            {data?.staffOnLeave?.map((staff) => (
              <div
                key={staff.name}
                className="flex items-center justify-between text-text-muted"
              >
                <div className="flex items-center gap-1.5">
                  <User className="w-3 h-3 text-text-muted" />
                  <span className="font-medium text-text">{staff.name}</span>
                </div>
                <span className="text-[11px] text-text-muted">
                  {staff.leaveType} (to {staff.returnDate.slice(0, 6)})
                </span>
              </div>
            ))}
          </div>
        </InsetBox>
      </div>
    </BentoTile>
  );
}
