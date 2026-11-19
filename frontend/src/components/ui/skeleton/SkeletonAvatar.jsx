'use client';

import React from 'react';
import { Skeleton } from './Skeleton';

const SIZE_MAP = {
  xs: 'w-6 h-6',
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
};

/**
 * Circular / square avatar skeleton placeholder.
 */
export function SkeletonAvatar({
  size = 'md',
  rounded = 'rounded-full',
  className = '',
  ...props
}) {
  const sizeClass = typeof size === 'string' && SIZE_MAP[size] ? SIZE_MAP[size] : '';
  const customStyle = typeof size === 'number' ? { width: `${size}px`, height: `${size}px` } : {};

  return (
    <Skeleton
      className={`${sizeClass} flex-shrink-0 ${rounded} ${className}`}
      style={customStyle}
      {...props}
    />
  );
}

export default SkeletonAvatar;
