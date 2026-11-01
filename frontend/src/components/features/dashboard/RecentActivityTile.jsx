'use client';

import React from 'react';
import { History, ChevronRight } from 'lucide-react';
import { BentoTile } from '../../primitives/BentoTile';
import { IconWell } from '../../primitives/IconWell';
import { ListDivided } from '../../primitives/ListDivided';
import { useLanguage } from '../../../context/LanguageContext';

export function RecentActivityTile({ data = [], onClick }) {
  const { t } = useLanguage();
  const items = Array.isArray(data) ? data : data?.items || [];

  return (
    <BentoTile
      id="recent-activity-tile"
      area="audit"
      onClick={onClick}
      iconWell={
        <IconWell size="md" shape="square" color="primary">
          <History className="w-5 h-5 stroke-[2]" />
        </IconWell>
      }
      title={t('dashboard.activity.title')}
      subtitle="Immutable audit log · tamper-evident timestamps"
      badge={
        <span className="text-xs text-text-muted flex items-center gap-1 group-hover:text-primary transition-colors">
          {t('dashboard.activity.viewAudit')}
          <ChevronRight className="w-3.5 h-3.5 rtl:-scale-x-100" />
        </span>
      }
    >
      {/* 5 Flat Rows with 1px Dividers: No box around each row */}
      <ListDivided>
        {items.slice(0, 5).map((item, idx) => (
          <div
            key={item.id || idx}
            className="flex items-center justify-between text-xs py-2 first:pt-0 last:pb-0 gap-3"
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              {/* Avatar */}
              <div className="w-6 h-6 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                {item.avatar || item.actor?.slice(0, 2).toUpperCase() || item.user?.slice(0, 2).toUpperCase() || 'U'}
              </div>

              {/* Actor, Role, Action, Target */}
              <div className="truncate min-w-0">
                <strong className="text-text font-semibold">{item.actor || item.user}</strong>
                <span className="text-text-muted mx-1">({item.role || 'User'})</span>
                <span className="text-text">{item.action}</span>
                <span className="text-text-muted text-[11px] ms-1">
                  — {item.target}
                </span>
              </div>
            </div>

            {/* Timestamp */}
            <span className="text-[11px] text-text-muted flex-shrink-0 tabular-nums ms-2">
              {item.timestamp || item.time}
            </span>
          </div>
        ))}
      </ListDivided>
    </BentoTile>
  );
}
