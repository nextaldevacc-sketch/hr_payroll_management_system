'use client';

import React from 'react';
import clsx from 'clsx';
import { Check } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

/**
 * Horizontal Stepper Primitive
 * Completed steps green with a check, current step gold (ring + label),
 * future steps muted gray.
 * Progress line is gold up to current step and neutral gray after it.
 * Direction mirrors automatically in RTL.
 */
export function Stepper({
  steps = ['Draft', 'Calculated', 'Validated', 'Locked', 'Paid'],
  currentStep = 'Calculated',
  className = '',
}) {
  const { t } = useLanguage();
  const currentIndex = steps.findIndex(
    (s) => s.toLowerCase() === currentStep.toLowerCase()
  );

  return (
    <div className={clsx('w-full py-2', className)}>
      <div className="flex items-center justify-between relative">
        {/* Background track: neutral gray */}
        <div className="absolute top-[14px] start-4 end-4 h-[2px] bg-border/80 dark:bg-white/[0.08] z-0" />

        {/* Active progress track: gold in dark mode */}
        <div
          className="absolute top-[14px] start-4 h-[2px] bg-primary transition-all duration-500 z-0"
          style={{
            width: currentIndex >= 0 ? `${(currentIndex / (steps.length - 1)) * 100}%` : '0%',
          }}
        />

        {steps.map((step, idx) => {
          const isCompleted = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          const isFuture = idx > currentIndex;

          return (
            <div
              key={step}
              className="relative z-10 flex flex-col items-center group cursor-default"
            >
              <div
                className={clsx(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300',
                  isCompleted &&
                    'bg-secondary text-white shadow-sm ring-2 ring-secondary/20',
                  isCurrent &&
                    'bg-primary text-[var(--on-primary)] shadow-md ring-4 ring-primary/25 scale-110 font-black',
                  isFuture &&
                    'bg-surface-raised dark:bg-inset border border-border text-text-muted'
                )}
              >
                {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : idx + 1}
              </div>
              <span
                className={clsx(
                  'text-[11px] font-semibold mt-1.5 whitespace-nowrap transition-colors duration-200',
                  isCurrent && 'text-primary font-bold dark:gold-heading',
                  isCompleted && 'text-text dark:text-text-muted',
                  isFuture && 'text-text-muted/70'
                )}
              >
                {t(`payroll.stages.${step}`, step)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
