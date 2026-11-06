'use client';

import React from 'react';
import clsx from 'clsx';
import { useLanguage } from '../../context/LanguageContext';
import { getEnumLabel } from '../../i18n/enums';

/**
 * StatusPill Primitive
 * Soft-filled pills (12-14% tint background + colored text)
 * No busy colored outlines.
 */
export function StatusPill({ status, size = 'sm', className = '' }) {
  const { language } = useLanguage();

  const statusStyles = {
    // Pay run statuses
    Draft: 'bg-primary-wash text-primary font-semibold',
    Calculated: 'bg-warning-wash text-warning-text font-semibold',
    Validated: 'bg-primary-wash text-primary font-semibold',
    Locked: 'bg-white/[0.06] text-text-muted font-semibold',
    Paid: 'bg-secondary-wash text-secondary-text font-semibold',

    // General workflow
    Approved: 'bg-secondary-wash text-secondary-text font-semibold',
    Pending: 'bg-warning-wash text-warning-text font-semibold',
    Rejected: 'bg-danger-wash text-danger-text font-semibold',

    // Employee status
    Active: 'bg-secondary-wash text-secondary-text font-semibold',
    'Pre-Joined': 'bg-primary-wash text-primary font-semibold',
    'New Joined': 'bg-secondary-wash text-secondary-text font-semibold',
    Probation: 'bg-warning-wash text-warning-text font-semibold',
    Notice: 'bg-warning-wash text-warning-text font-semibold',
    Separated: 'bg-white/[0.05] text-text-muted font-semibold',
    Suspended: 'bg-danger-wash text-danger-text font-semibold',
    Archived: 'bg-white/[0.05] text-text-muted font-semibold',

    // Expiry status
    Valid: 'bg-secondary-wash text-secondary-text font-semibold',
    'Expiring Soon': 'bg-warning-wash text-warning-text font-semibold',
    Expired: 'bg-danger-wash text-danger-text font-semibold',
    'Missing Data': 'bg-white/[0.05] text-text-muted font-semibold',
  };

  const currentStyle = statusStyles[status] || 'bg-white/[0.05] text-text-muted font-medium';

  const sizeClasses = {
    xs: 'text-[11px] px-2 py-0.5',
    sm: 'text-xs px-2.5 py-1',
    md: 'text-sm px-3 py-1.5',
  };

  const displayLabel = getEnumLabel(null, status, language);

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-pill select-none transition-colors duration-200 border border-transparent',
        sizeClasses[size] || sizeClasses.sm,
        currentStyle,
        className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {displayLabel}
    </span>
  );
}
