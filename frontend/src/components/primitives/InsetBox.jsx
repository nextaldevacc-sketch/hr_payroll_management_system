'use client';

import React from 'react';
import clsx from 'clsx';

/**
 * InsetBox Primitive
 * Radius: 12px (rounded-xl), padding: 12-16px.
 * Light mode: Current soft border + tone wash background.
 * Dark mode: No outline border, tone tint background, hover = inset-hover.
 */
export function InsetBox({
  children,
  tone = 'neutral',
  interactive = false,
  className = '',
  as: Component = 'div',
  onClick,
  id,
  role,
  ...props
}) {
  const toneClasses = {
    neutral: 'inset-box--neutral',
    primary: 'inset-box--primary',
    'primary-strong': 'inset-box--primary-strong',
    danger: 'inset-box--danger',
    warning: 'inset-box--warning',
    success: 'inset-box--success',
  };

  return (
    <Component
      id={id}
      role={role || (interactive && Component === 'div' ? 'button' : undefined)}
      tabIndex={interactive && Component === 'div' ? 0 : undefined}
      onClick={onClick}
      className={clsx(
        'inset-box p-3',
        toneClasses[tone] || toneClasses.neutral,
        interactive && 'inset-box--interactive',
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
