'use client';

import React from 'react';
import { ShieldCheck, ChevronRight, CheckCircle2, AlertTriangle } from 'lucide-react';
import { BentoTile } from '../primitives/BentoTile';
import { IconWell } from '../primitives/IconWell';
import { ListDivided } from '../primitives/ListDivided';
import { useLanguage } from '../../context/LanguageContext';
import { useThemeColor } from '../../hooks/useThemeColor';

export function WpsReadinessTile({ data, onClick, onFilterMissing }) {
  const { t } = useLanguage();
  const primaryColor = useThemeColor('--primary', '#E6A60E');
  const borderVar = useThemeColor('--border', 'rgba(255, 255, 255, 0.06)');
  const ready = data?.ready || 40;
  const total = data?.total || 42;
  const percentage = Math.round((ready / total) * 100);

  // SVG circular progress ring calculations
  const size = 52;
  const strokeWidth = 5;
  const center = size / 2;
  const radius = center - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const checks = data?.checks || [
    { key: 'iban', label: 'IBAN account present', missing: 1, status: 'warning' },
    { key: 'routing', label: 'Bank routing code present', missing: 1, status: 'warning' },
    { key: 'personId', label: 'Labour Card / Person ID present', missing: 0, status: 'success' },
  ];

  return (
    <BentoTile
      id="wps-readiness-tile"
      area="wps"
      onClick={onClick}
      iconWell={
        <IconWell size="md" shape="square" color="primary">
          <ShieldCheck className="w-5 h-5 stroke-[2]" />
        </IconWell>
      }
      title="WPS SIF Readiness"
      subtitle="UAE Wage Protection System audit"
    >
      <div className="flex-1 flex flex-col justify-between">
        {/* Progress Ring and Ready Count */}
        <div className="flex items-center gap-3.5">
          <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="transform -rotate-90">
              <circle
                cx={center}
                cy={center}
                r={radius}
                stroke={borderVar}
                strokeWidth={strokeWidth}
                fill="transparent"
              />
              <circle
                cx={center}
                cy={center}
                r={radius}
                stroke={primaryColor}
                strokeWidth={strokeWidth}
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-700"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-text tabular-nums">
              {percentage}%
            </div>
          </div>

          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-extrabold text-text tabular-nums">{ready} / {total}</span>
              <span className="text-xs font-semibold text-secondary-text">ready</span>
            </div>
            <p className="text-[11px] text-text-muted mt-0.5">
              {total - ready} blocking items before SIF download
            </p>
          </div>
        </div>

        {/* 3 Check Rows - fill height, 1px var(--border) divider between rows, no boxes */}
        <ListDivided className="text-xs flex-1 flex flex-col justify-around mt-3 border-t border-border">
          {checks.map((check) => (
            <button
              key={check.key}
              onClick={(e) => {
                e.stopPropagation();
                onFilterMissing && onFilterMissing(check.key);
              }}
              className="w-full flex items-center justify-between py-2 px-1 hover:bg-black/5 dark:hover:bg-inset-hover transition-colors text-start group rounded-lg"
            >
              <div className="flex items-center gap-2 min-w-0">
                {check.missing === 0 ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-secondary flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-warning-text flex-shrink-0" />
                )}
                <span className="text-[11px] text-text-muted group-hover:text-text transition-colors truncate">
                  {check.label}
                </span>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0 ms-2">
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    check.missing === 0
                      ? 'bg-secondary-wash text-secondary-text'
                      : 'bg-warning-wash text-warning-text'
                  }`}
                >
                  {check.missing === 0 ? 'All 42 valid' : `${check.missing} missing`}
                </span>
                <ChevronRight className="w-3 h-3 text-text-muted group-hover:text-text rtl:-scale-x-100" />
              </div>
            </button>
          ))}
        </ListDivided>
      </div>
    </BentoTile>
  );
}
