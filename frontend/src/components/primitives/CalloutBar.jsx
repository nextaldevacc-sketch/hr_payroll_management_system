'use client';

import React from 'react';
import clsx from 'clsx';

/**
 * CalloutBar Primitive
 * Tint background + 3px inline-start accent bar (e.g. HR Manager next-step bar).
 * Light mode: Tint background + soft border + 3px accent bar.
 * Dark mode: Tint background + 3px accent bar, no other borders.
 */
export function CalloutBar({
  children,
  tone = 'primary',
  className = '',
  as: Component = 'div',
  onClick,
  id,
  ...props
}) {
  const toneClasses = {
    primary: 'callout-bar--primary',
    danger: 'callout-bar--danger',
    warning: 'callout-bar--warning',
    success: 'callout-bar--success',
  };

  return (
    <Component
      id={id}
      onClick={onClick}
      className={clsx(
        'callout-bar p-3',
        toneClasses[tone] || toneClasses.primary,
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
