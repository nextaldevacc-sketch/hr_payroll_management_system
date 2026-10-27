'use client';

import React from 'react';
import clsx from 'clsx';

/**
 * Switch / Toggle Primitive
 */
export function Switch({
  checked = false,
  onChange,
  label,
  description,
  disabled = false,
  id,
}) {
  const switchId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="flex items-center justify-between gap-4 py-1">
      {(label || description) && (
        <div className="flex flex-col">
          {label && (
            <label
              htmlFor={switchId}
              className="text-sm font-semibold text-text cursor-pointer select-none"
            >
              {label}
            </label>
          )}
          {description && (
            <span className="text-xs text-text-muted">{description}</span>
          )}
        </div>
      )}
      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange && onChange(!checked)}
        className={clsx(
          'w-11 h-6 rounded-full transition-colors duration-200 relative p-0.5 flex-shrink-0 cursor-pointer',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          checked ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <span
          className={clsx(
            'w-5 h-5 rounded-full bg-white shadow-sm block transition-transform duration-200',
            checked ? 'translate-x-5 rtl:-translate-x-5' : 'translate-x-0'
          )}
        />
      </button>
    </div>
  );
}
