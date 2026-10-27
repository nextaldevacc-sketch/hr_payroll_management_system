'use client';

import React from 'react';
import clsx from 'clsx';

/**
 * IconWell Primitive
 * The ONLY neumorphic element in the design system (~10%)
 * Soft raised or inset circle/rounded-square holding an icon
 */
export function IconWell({
  children,
  size = 'md',
  shape = 'square',
  variant = 'raised',
  active = false,
  color = 'default',
  className = '',
  onClick,
  title,
}) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm p-1.5',
    md: 'w-10 h-10 text-base p-2',
    lg: 'w-12 h-12 text-lg p-2.5',
    xl: 'w-14 h-14 text-xl p-3',
  };

  const shapeClasses = {
    circle: 'rounded-full',
    square: 'rounded-2xl',
  };

  const colorClasses = {
    default: 'text-text-muted group-hover:text-primary-strong dark:group-hover:text-primary',
    primary: 'text-primary-strong dark:text-primary',
    secondary: 'text-secondary-text dark:text-secondary-text',
    gold: 'text-[#B07D05] dark:text-primary',
    danger: 'text-danger-text',
    warning: 'text-warning-text',
  };

  return (
    <div
      onClick={onClick}
      title={title}
      className={clsx(
        'icon-well flex items-center justify-center flex-shrink-0 select-none cursor-pointer',
        sizeClasses[size] || sizeClasses.md,
        shapeClasses[shape] || shapeClasses.square,
        colorClasses[color] || colorClasses.default,
        active && 'active ring-1 ring-primary/40 dark:ring-gold/40',
        className
      )}
    >
      {children}
    </div>
  );
}
