'use client';

import React from 'react';
import clsx from 'clsx';
import { ChevronDown } from 'lucide-react';

/**
 * Select Primitive
 * 14px radius (rounded-control), clear focus ring, clean dropdown chevron
 */
export function Select({
  label,
  options = [],
  value,
  onChange,
  helperText,
  error,
  className = '',
  id,
  disabled = false,
  ...props
}) {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={selectId}
          className="text-xs font-semibold text-text uppercase tracking-wider select-none"
        >
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        <select
          id={selectId}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={clsx(
            'w-full h-10 text-sm bg-surface-raised dark:bg-inset text-text rounded-control border px-3.5 pe-9 transition-all duration-200 appearance-none cursor-pointer',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 focus:ring-offset-bg focus:border-primary',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error
              ? 'border-danger focus:ring-danger focus:border-danger'
              : 'border-border dark:border-border',
            className
          )}
          {...props}
        >
          {options.map((opt) => {
            const optVal = typeof opt === 'object' ? opt.value : opt;
            const optLabel = typeof opt === 'object' ? opt.label : opt;
            return (
              <option key={optVal} value={optVal} className="bg-bg text-text">
                {optLabel}
              </option>
            );
          })}
        </select>
        <ChevronDown className="w-4 h-4 text-text-muted absolute end-3 pointer-events-none" />
      </div>
      {error ? (
        <span className="text-xs text-danger-text font-medium">{error}</span>
      ) : helperText ? (
        <span className="text-xs text-text-muted">{helperText}</span>
      ) : null}
    </div>
  );
}
