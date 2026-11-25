'use client';

import React from 'react';
import { TrendingUp } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceArea
} from 'recharts';
import { BentoTile } from '../../primitives/BentoTile';
import { IconWell } from '../../primitives/IconWell';
import { formatCurrency } from '@nextal/shared';
import { useLanguage } from '../../../context/LanguageContext';
import { useThemeColor } from '../../../hooks/useThemeColor';

export function PayrollTrendTile({ data, onClick }) {
  const { t, isRTL, language } = useLanguage();
  const months = data?.months || [];

  const primaryColor = useThemeColor('--primary', '#E5BDDF');
  const infoColor = useThemeColor('--info', '#4BB8FA');
  const tintPrimary = useThemeColor('--tint-primary', 'rgba(230, 166, 14, 0.06)');
  const borderVar = useThemeColor('--border', 'rgba(255, 255, 255, 0.06)');
  const textMutedVar = useThemeColor('--text-muted', '#9A9A9F');

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-2.5 rounded-xl bg-black/90 dark:bg-surface-raised text-white border border-border dark:border-border shadow-xl text-xs space-y-1">
          <p className="font-bold text-text-muted">{label}</p>
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-primary">
              <span className="w-2 h-2 rounded-full bg-primary" />
              {language === 'ar' ? 'الإجمالي:' : 'Gross:'}
            </span>
            <bdi className="font-bold tabular-nums">
              {formatCurrency(payload[0]?.value, 'AED', language)}
            </bdi>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-info">
              <span className="w-2 h-2 rounded-full bg-info" />
              {language === 'ar' ? 'الصافي (حماية الأجور):' : 'Net (WPS):'}
            </span>
            <bdi className="font-bold tabular-nums">
              {formatCurrency(payload[1]?.value, 'AED', language)}
            </bdi>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <BentoTile
      id="payroll-trend-tile"
      area="trend"
      onClick={onClick}
      iconWell={
        <IconWell size="md" shape="square" color="primary">
          <TrendingUp className="w-5 h-5 stroke-[2]" />
        </IconWell>
      }
      title={t('dashboard.payrollTrend.title')}
      subtitle={t('dashboard.payrollTrend.subtitle')}
    >
      <div className="space-y-2 h-full flex flex-col justify-between">
        {/* Recharts Area Chart */}
        <div className="w-full h-44 sm:h-48 min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={months} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="grossGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={primaryColor} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={primaryColor} stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="netGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={infoColor} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={infoColor} stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid stroke={borderVar} strokeDasharray="3 3" vertical={false} />

              {Number(data?.thresholdMax || 0) > 0 && (
                <ReferenceArea
                  y1={data?.thresholdMin || 0}
                  y2={data.thresholdMax}
                  fill={tintPrimary}
                  strokeOpacity={0}
                />
              )}

              <XAxis
                dataKey={isRTL ? 'monthAr' : 'month'}
                reversed={isRTL}
                tick={{ fill: textMutedVar, fontSize: 11 }}
                axisLine={{ stroke: borderVar }}
                tickLine={false}
              />

              <YAxis
                orientation={isRTL ? 'right' : 'left'}
                tick={{ fill: textMutedVar, fontSize: 10 }}
                axisLine={{ stroke: borderVar }}
                tickLine={false}
                domain={['auto', 'auto']}
                tickFormatter={(val) => `${Math.round(val / 1000)}k`}
              />

              <Tooltip content={<CustomTooltip />} />

              <Area
                type="monotone"
                dataKey="gross"
                stroke={primaryColor}
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#grossGradient)"
                name="Gross Salary"
              />

              <Area
                type="monotone"
                dataKey="net"
                stroke={infoColor}
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#netGradient)"
                name="Net Pay"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Legend Sits Under the Chart */}
        <div className="flex items-center justify-center gap-6 text-xs text-text-muted pt-1 border-t border-border/40 dark:border-border">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-primary" />
            <span className="font-semibold text-text">
              {language === 'ar' ? 'السلسلة ١: إجمالي الراتب' : 'Series 1: Gross Salary'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-info" />
            <span className="font-semibold text-text">
              {language === 'ar' ? 'السلسلة ٢: الصافي (حماية الأجور)' : 'Series 2: Net (WPS)'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="w-2 h-2 rounded bg-tint-primary border border-primary/40 dark:border-transparent" />
            <span>{language === 'ar' ? 'نطاق التفاوت ±٥٪' : '±5% Threshold Band'}</span>
          </div>
        </div>
      </div>
    </BentoTile>
  );
}
