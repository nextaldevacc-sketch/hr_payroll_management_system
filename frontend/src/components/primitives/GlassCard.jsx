'use client';

import React from 'react';
import clsx from 'clsx';

/**
 * GlassCard Primitive
 * ~50% Glassmorphism surface
 * Light: rgba(255,255,255,0.65) + blur(18px) + 1px border rgba(255,255,255,0.85) + soft shadow
 * Dark: rgba(255,255,255,0.04) + blur(20px) + 1px border rgba(230,166,14,0.14) (thin gold edge)
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
