'use client';

import React from 'react';
import clsx from 'clsx';
import { GlassCard } from './GlassCard';

export function BentoTile({
  children,
  area = '',
  className = '',
  style = {},
  iconWell = null,
  title = '',
  subtitle = '',
  badge = null,
  headerAction = null,
  onClick,
  id,
}) {
  const gridStyle = area ? { gridArea: area, ...style } : style;

  return (
    <GlassCard
      id={id}
      onClick={onClick}
      hoverEffect={Boolean(onClick)}
      style={gridStyle}
      className={clsx(
        'flex flex-col group min-w-0 h-full',
        className
      )}
    >
      {/* Compact Tile Header: 40px icon well, 16px/700 title, 13px muted subtitle */}
      {(title || iconWell || badge || headerAction) && (
        <div className="flex flex-wrap sm:flex-nowrap items-start sm:items-center justify-between gap-2.5 sm:gap-3 mb-4 flex-shrink-0 min-w-0">
          <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
            {iconWell && <div className="flex-shrink-0 mt-0.5 sm:mt-0">{iconWell}</div>}
            <div className="min-w-0 flex-1">
              {title && (
                <h3 className="text-base font-bold text-text tracking-tight leading-snug line-clamp-2">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-[13px] text-text-muted leading-tight line-clamp-2 mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ms-auto">
            {badge}
            {headerAction}
          </div>
        </div>
      )}

      {/* Body: Flows from top. Detail area grows to fill height without empty gaps */}
      <div className="flex-1 flex flex-col min-w-0 w-full">
        {children}
      </div>
    </GlassCard>
  );
}
