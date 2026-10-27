'use client';

import React from 'react';
import { Clock } from 'lucide-react';
import { BentoTile } from '../primitives/BentoTile';
import { IconWell } from '../primitives/IconWell';
import { InsetBox } from '../primitives/InsetBox';
import { useLanguage } from '../../context/LanguageContext';

export function AttendanceSegmentTile({ data, onClick }) {
  const { t, language } = useLanguage();
  const miniTrend = data?.miniTrend || [];

  return (
    <BentoTile
      id="attendance-segment-tile"
      area="att"
      onClick={onClick}
      iconWell={
        <IconWell size="md" shape="square" color="primary">
          <Clock className="w-5 h-5 stroke-[2]" />
        </IconWell>
      }
      title={t('dashboard.attendance.title')}
      subtitle="Biometric shift capture"
    >
      <div className="space-y-2.5">
        {/* 4 Flat attendance status boxes */}
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <InsetBox className="p-1.5">
            <bdi className="text-sm font-extrabold text-secondary-text tabular-nums block">
              {data.present}
            </bdi>
            <span className="text-[10px] text-text-muted block leading-tight">
              {t('dashboard.attendance.present')}
            </span>
          </InsetBox>

          <InsetBox className="p-1.5">
            <bdi className="text-sm font-extrabold text-warning-text tabular-nums block">
              {data.late}
            </bdi>
            <span className="text-[10px] text-text-muted block leading-tight">
              {t('dashboard.attendance.late')}
            </span>
          </InsetBox>

          <InsetBox className="p-1.5">
            <bdi className="text-sm font-extrabold text-danger-text tabular-nums block">
              {data.absent}
            </bdi>
            <span className="text-[10px] text-text-muted block leading-tight">
              {t('dashboard.attendance.absent')}
            </span>
          </InsetBox>

          <InsetBox className="p-1.5">
            <bdi className="text-sm font-extrabold text-info tabular-nums block">
              {data.onLeave}
            </bdi>
            <span className="text-[10px] text-text-muted block leading-tight">
              {t('dashboard.attendance.onLeave')}
            </span>
          </InsetBox>
        </div>

        {/* Segmented Progress Bar: present green, late orange, absent red, on leave info blue */}
        <div className="w-full h-2.5 bg-black/[0.04] dark:bg-white/[0.06] rounded-full overflow-hidden flex gap-0.5">
          <div
            className="h-full bg-secondary rounded-s-full transition-all duration-500"
            style={{ width: `${data.presentPercent}%` }}
            title={`Present: ${data.present} (${data.presentPercent}%)`}
          />
          <div
            className="h-full bg-warning transition-all duration-500"
            style={{ width: `${data.latePercent}%` }}
            title={`Late: ${data.late} (${data.latePercent}%)`}
          />
          <div
            className="h-full bg-danger transition-all duration-500"
            style={{ width: `${data.absentPercent}%` }}
            title={`Absent: ${data.absent} (${data.absentPercent}%)`}
          />
          <div
            className="h-full bg-info rounded-e-full transition-all duration-500"
            style={{ width: `${data.leavePercent}%` }}
            title={`On Leave: ${data.onLeave} (${data.leavePercent}%)`}
          />
        </div>

        {/* 7-Day Mini Trend Underneath */}
        <div className="pt-2 border-t border-border/40 flex items-end justify-between gap-1">
          <span className="text-[10px] text-text-muted mb-1 flex-shrink-0">7-day:</span>
          <div className="flex items-end justify-between gap-1 flex-1">
            {miniTrend.map((tDay, idx) => {
              const totalPunches = tDay.present + tDay.late + tDay.absent;
              const hPresent = Math.round((tDay.present / (totalPunches || 1)) * 20);
              const hLate = Math.round((tDay.late / (totalPunches || 1)) * 20);
              const hAbsent = Math.round((tDay.absent / (totalPunches || 1)) * 20);

              return (
                <div key={idx} className="flex flex-col items-center gap-1 flex-1">
                  <div
                    className={`w-full max-w-[14px] flex flex-col justify-end rounded-sm overflow-hidden h-6 ${
                      tDay.isToday ? 'ring-1 ring-primary' : ''
                    }`}
                  >
                    <div style={{ height: `${hAbsent}px` }} className="bg-danger w-full" />
                    <div style={{ height: `${hLate}px` }} className="bg-warning w-full" />
                    <div style={{ height: `${hPresent}px` }} className="bg-secondary w-full" />
                  </div>
                  <span
                    className={`text-[9px] ${
                      tDay.isToday ? 'font-bold text-primary' : 'text-text-muted'
                    }`}
                  >
                    {language === 'ar' ? tDay.dayAr : tDay.day}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </BentoTile>
  );
}
