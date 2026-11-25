'use client';

import React from 'react';
import clsx from 'clsx';

/**
 * GlassCard Primitive
 * ~50% Glassmorphism surface
 * Light: rgba(255,255,255,0.65) + blur(14px) + 1px border rgba(255,255,255,0.85) + soft shadow
 * Dark: rgba(38,38,38,0.72) + blur(14px) + 1px border rgba(255,255,255,0.10) (classic glass)
 */
export function GlassCard({
  children,
  className = '',
  onClick,
  hoverEffect = false,
  role,
  id,
  as: Component = 'div',
  ...props
}) {
  return (
    <Component
      id={id}
      role={role}
      onClick={onClick}
      className={clsx(
        'glass-panel rounded-tile p-6 transition-all duration-300 relative overflow-hidden',
        hoverEffect && 'hover:translate-y-[-2px] hover:shadow-lg cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
