'use client';

import React from 'react';
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

/**
 * Button Primitive
 * 14px radius (rounded-control), clear focus ring, no neumorphism on buttons.
 * Dark Mode:
 * - Primary button: gold fill (#E6A60E), --on-primary (#0A0A0A) text, never white on gold.
 * - Outline / Secondary button: transparent, neutral border, hover gold border.
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon = null,
  onClick,
  type = 'button',
  className = '',
  id,
}) {
  const variantStyles = {
    primary:
      'bg-primary text-[var(--on-primary)] hover:bg-[var(--primary-hover)] active:bg-[var(--primary-pressed)] font-bold shadow-sm focus-visible:ring-primary',
    secondary:
      'bg-secondary text-white hover:opacity-90 active:opacity-95 shadow-sm focus-visible:ring-secondary',
    ghost:
      'bg-transparent hover:bg-black/5 dark:hover:bg-inset-hover text-text focus-visible:ring-primary',
    outline:
      'btn-outline-custom focus-visible:ring-primary',
    danger:
      'bg-danger text-white hover:opacity-90 active:opacity-95 shadow-sm focus-visible:ring-danger',
  };

  const sizeStyles = {
    sm: 'text-xs h-8 px-3 gap-1.5',
    md: 'text-sm h-10 px-4 gap-2',
    lg: 'text-base h-12 px-6 gap-2.5',
  };

  return (
    <button
      id={id}
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={clsx(
        'inline-flex items-center justify-center rounded-control transition-all duration-200 select-none cursor-pointer',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
        'disabled:opacity-50 disabled:pointer-events-none',
        variantStyles[variant] || variantStyles.primary,
        sizeStyles[size] || sizeStyles.md,
        className
      )}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      ) : icon ? (
        <span className="flex-shrink-0 rtl:-scale-x-100">{icon}</span>
      ) : null}
      <span>{children}</span>
    </button>
  );
}
