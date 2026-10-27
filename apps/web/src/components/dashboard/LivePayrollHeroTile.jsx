'use client';

import React, { useState } from 'react';
import {
  Banknote,
  RefreshCw,
  Calendar,
  Users,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { BentoTile } from '../primitives/BentoTile';
import { IconWell } from '../primitives/IconWell';
import { Stepper } from '../primitives/Stepper';
import { InsetBox } from '../primitives/InsetBox';
import { CalloutBar } from '../primitives/CalloutBar';
import { formatCurrency } from '@nextal/shared';
import { useLanguage } from '../../context/LanguageContext';

export function LivePayrollHeroTile({ data, onClick, onOpenValidation }) {
  const { t, language } = useLanguage();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hoveredMonth, setHoveredMonth] = useState(null);

  const manualRefresh = (e) => {
    e.stopPropagation();
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  };

  const figures = data.figures;

  // 6-month sparkline data
  const sparkline = data.sparkline || [];
  const minNet = Math.min(...sparkline.map((s) => s.net));
  const maxNet = Math.max(...sparkline.map((s) => s.net));
  const sparkWidth = 200;
  const sparkHeight = 42;

  const points = sparkline.map((s, idx) => {
    const x = (idx / (sparkline.length - 1)) * sparkWidth;
    const y = sparkHeight - ((s.net - minNet) / (maxNet - minNet || 1)) * (sparkHeight - 12) - 6;
    return { x, y, ...s };
  });

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <BentoTile
      id="live-payroll-tile"
      area="live"
      onClick={onClick}
      className="border-primary/20 hover:border-primary/40 relative overflow-hidden bg-gradient-to-br from-white/70 via-white/50 to-primary/5 dark:from-white/[0.05] dark:via-transparent dark:to-primary/[0.04]"
      iconWell={
        <IconWell size="md" shape="square" color="primary">
          <Banknote className="w-5 h-5 stroke-[2]" />
        </IconWell>
      }
      title={t('dashboard.livePayroll.title')}
      subtitle={`${data.entityName} · ${data.visaBadge}`}
      badge={
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill text-[11px] font-bold bg-primary-wash text-primary">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          {data.visaBadge}
        </span>
      }
      headerAction={
        <button
          onClick={manualRefresh}
          title="Refresh calculation"
          className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-black/5 dark:hover:bg-inset-hover transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
        </button>
      }
    >
      <div className="flex-1 flex flex-col justify-between gap-3">
        {/* Meta Bar: Cut-off & Employees Count (Dividing line removed, spacing used) */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-text-muted pb-1">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              <span className="font-semibold text-text">{t('dashboard.livePayroll.cutoff')}</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-border" />
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-secondary-text" />
              <span>{data.employeesIncluded} employees included</span>
            </div>
          </div>

          {/* 6-Month Net Payroll Sparkline with Tooltip */}
          <div className="relative flex items-center gap-2">
            <span className="text-[11px] text-text-muted">6M Net:</span>
            <div className="relative">
              <svg width={sparkWidth} height={sparkHeight} className="overflow-visible">
                <polyline
                  fill="none"
                  style={{ stroke: 'var(--info)' }}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={polylinePoints}
                />
                {points.map((p, idx) => (
                  <circle
                    key={idx}
                    cx={p.x}
                    cy={p.y}
                    r={p.isCurrent ? 4.5 : 3}
                    style={{ fill: p.isCurrent ? 'var(--primary)' : 'var(--info)' }}
                    className={p.isCurrent ? 'stroke-bg stroke-2 cursor-pointer' : 'cursor-pointer'}
                    onMouseEnter={() => setHoveredMonth(p)}
                    onMouseLeave={() => setHoveredMonth(null)}
                  />
                ))}
              </svg>

              {hoveredMonth && (
                <div className="absolute bottom-full mb-1 start-1/2 -translate-x-1/2 px-2 py-1 bg-black/80 dark:bg-black/90 text-white rounded text-[10px] whitespace-nowrap shadow-lg pointer-events-none z-30">
                  <span className="font-semibold">{hoveredMonth.month}: </span>
                  <bdi className="tabular-nums">{formatCurrency(hoveredMonth.net, 'AED', language)}</bdi>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Running Calculation Lines */}
        <InsetBox className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
          <div className="flex flex-col">
            <span className="text-text-muted text-[11px]">{t('dashboard.livePayroll.gross')}</span>
            <bdi className="tabular-nums font-semibold text-text mt-0.5">
              {formatCurrency(figures.gross, 'AED', language)}
            </bdi>
          </div>

          <div className="flex flex-col">
            <span className="text-secondary-text text-[11px]">+ {t('dashboard.livePayroll.overtime')}</span>
            <bdi className="tabular-nums font-semibold text-secondary-text mt-0.5">
              +{formatCurrency(figures.overtime, 'AED', language)}
            </bdi>
          </div>

          <div className="flex flex-col">
            <span className="text-danger-text text-[11px]">− {t('dashboard.livePayroll.absence')}</span>
            <bdi className="tabular-nums font-semibold text-danger-text mt-0.5">
              −{formatCurrency(figures.absence, 'AED', language)}
            </bdi>
          </div>

          <div className="flex flex-col">
            <span className="text-warning-text text-[11px]">− {t('dashboard.livePayroll.loans')}</span>
            <bdi className="tabular-nums font-semibold text-warning-text mt-0.5">
              −{formatCurrency(figures.loans, 'AED', language)}
            </bdi>
          </div>

          <div className="flex flex-col">
            <span className="text-warning-text text-[11px]">− Late Penalties</span>
            <bdi className="tabular-nums font-semibold text-warning-text mt-0.5">
              −{formatCurrency(figures.latePenalties, 'AED', language)}
            </bdi>
          </div>

          <div className="flex flex-col">
            <span className="text-danger-text text-[11px]">− Other Deductions</span>
            <bdi className="tabular-nums font-semibold text-danger-text mt-0.5">
              −{formatCurrency(figures.otherDeductions, 'AED', language)}
            </bdi>
          </div>
        </InsetBox>

        {/* Per-Visa Split Row */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {data.visas?.map((v) => (
            <InsetBox
              key={v.id}
              className="flex items-center justify-between px-3 py-2"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                <span className="text-text-muted truncate text-[11px]">{v.name} ({v.count})</span>
              </div>
              <bdi className="tabular-nums font-semibold text-text ms-2">
                {formatCurrency(v.net, 'AED', language)}
              </bdi>
            </InsetBox>
          ))}
        </div>

        {/* Hero Net Pay to WPS: tint-primary tone */}
        <InsetBox tone="primary" className="p-3.5 flex items-center justify-between gap-3">
          <div>
            <span className="text-[11px] uppercase font-bold tracking-wider text-text-muted block">
              {t('dashboard.livePayroll.netToWps')}
            </span>
            <bdi className="text-2xl sm:text-3xl font-black text-text dark:gold-hero-number tabular-nums tracking-tight mt-0.5 block">
              {formatCurrency(figures.netToWps, 'AED', language)}
            </bdi>
          </div>

          <div className="flex flex-col items-end gap-1">
            <span className="text-xs font-bold px-2.5 py-1 rounded-pill bg-primary text-[var(--on-primary)] shadow-sm">
              Stage: {data.currentStep}
            </span>
            <span className="text-[10px] text-text-muted">Direct SIF generation</span>
          </div>
        </InsetBox>

        {/* Workflow Stepper */}
        <div>
          <Stepper steps={data.steps} currentStep={data.currentStep} />
        </div>

        {/* Next Step Bar: CalloutBar with 3px gold inline-start bar */}
        <CalloutBar tone="primary" className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 text-primary flex-shrink-0" />
            <div className="truncate">
              <strong className="text-text">{data.nextStep?.owner}: </strong>
              <span className="text-text-muted">{data.nextStep?.message}</span>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenValidation && onOpenValidation();
            }}
            className="flex items-center gap-1 font-bold text-primary hover:underline ms-2 flex-shrink-0"
          >
            <span>{data.nextStep?.action}</span>
            <ArrowRight className="w-3.5 h-3.5 rtl:-scale-x-100" />
          </button>
        </CalloutBar>
      </div>
    </BentoTile>
  );
}
