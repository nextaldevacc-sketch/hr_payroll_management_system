'use client';

import React from 'react';
import clsx from 'clsx';

/**
 * Input Primitive
 * 14px radius (rounded-control), clear focus ring, clean placeholder, error state
 */
export function Input({
  label,
  helperText,
  error,
  icon,
  className = '',
  id,
  type = 'text',
  disabled = false,
  ...props
}) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-semibold text-text uppercase tracking-wider select-none"
        >
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {icon && (
          <span className="absolute start-3.5 text-text-muted pointer-events-none flex items-center">
            {icon}
          </span>
        )}
        <input
          id={inputId}
          type={type}
          disabled={disabled}
          className={clsx(
            'w-full h-10 text-sm bg-surface-raised dark:bg-inset text-text rounded-control border px-3.5 transition-all duration-200',
            'placeholder:text-text-muted/60',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 focus:ring-offset-bg focus:border-primary',
            'disabled:opacity-50 disabled:bg-black/5 dark:disabled:bg-inset-hover disabled:cursor-not-allowed',
            icon ? 'ps-10' : 'ps-3.5',
            error
              ? 'border-danger focus:ring-danger focus:border-danger'
              : 'border-border dark:border-border',
            className
          )}
          {...props}
        />
      </div>
      {error ? (
        <span className="text-xs text-danger-text font-medium">{error}</span>
      ) : helperText ? (
        <span className="text-xs text-text-muted">{helperText}</span>
      ) : null}
    </div>
  );
}
