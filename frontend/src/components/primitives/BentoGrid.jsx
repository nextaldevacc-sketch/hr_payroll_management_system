'use client';

import React from 'react';
import clsx from 'clsx';

/**
 * BentoGrid Primitive
 * Explicit grid-template-areas, content-sized auto-rows, stretch alignment.
 * Desktop: 12-col bento grid
 * Tablet: 6-col bento grid
 * Mobile: 1-col bento grid
 */
export function BentoGrid({ children, className = '', id }) {
  return (
    <div id={id} className={clsx('bento-dashboard-grid w-full', className)}>
      {children}
    </div>
  );
}
