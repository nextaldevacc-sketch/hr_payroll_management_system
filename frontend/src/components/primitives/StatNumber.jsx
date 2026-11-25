'use client';

import React, { useEffect, useState } from 'react';
import clsx from 'clsx';
import { formatCurrency } from '@nextal/shared';
import { useLanguage } from '../../context/LanguageContext';

/**
 * StatNumber Primitive
 * Displays large numbers with tabular-nums, <bdi> isolation,
 * white KPI numbers by default, optional gold metallic variant for hero numbers.
 */
export function StatNumber({
  value,
  isCurrency = false,
  currency = 'AED',
  label = '',
  trend = null,
  size = 'lg',
  variant = 'default', // 'default' (white in dark mode), 'gold' (metallic gradient hero number)
  className = '',
  animate = true,
}) {
  const { language } = useLanguage();
  const [displayValue, setDisplayValue] = useState(animate ? 0 : value);

  useEffect(() => {
    if (!animate) {
      setDisplayValue(value);
      return;
    }

    const start = typeof displayValue === 'number' ? displayValue : 0;
    const target = typeof value === 'number' ? value : parseFloat(value) || 0;
    
    // Respect prefers-reduced-motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayValue(value);
      return;
    }

    const duration = 600;
    const startTime = performance.now();

    const updateCount = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = start + (target - start) * ease;
      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(updateCount);
      } else {
        setDisplayValue(target);
      }
    };

    requestAnimationFrame(updateCount);
  }, [value, animate]);

  const sizeClasses = {
    sm: 'text-xl font-bold',
    md: 'text-2xl lg:text-3xl font-extrabold',
    lg: 'text-3xl lg:text-4xl font-extrabold',
    xl: 'text-4xl lg:text-5xl font-black',
  };

  const formattedValue = isCurrency
    ? formatCurrency(displayValue, currency, language)
    : typeof displayValue === 'number'
    ? Math.round(displayValue).toLocaleString(language === 'ar' ? 'ar-AE' : 'en-US', {
        numberingSystem: 'latn',
      })
    : displayValue;

  return (
    <div className={clsx('flex flex-col', className)}>
      {label && (
        <span className="text-xs uppercase tracking-wider font-semibold text-text-muted mb-1">
          {label}
        </span>
      )}
      <div className="flex items-baseline gap-2.5 min-w-0">
        <bdi
          className={clsx(
            'tabular-nums tracking-tight',
            variant === 'gold' || variant === 'primary' ? 'text-primary' : 'text-text',
            sizeClasses[size] || sizeClasses.lg
          )}
        >
          {formattedValue}
        </bdi>
        {trend && (
          <bdi
            className={clsx(
              'inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full tabular-nums',
              trend.positive
                ? 'text-secondary-text bg-secondary-wash'
                : 'text-danger-text bg-danger-wash'
            )}
          >
            {trend.value}
          </bdi>
        )}
      </div>
      {trend?.label && (
        <span className="text-xs text-text-muted mt-1">{trend.label}</span>
      )}
    </div>
  );
}
