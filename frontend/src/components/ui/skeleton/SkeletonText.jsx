'use client';

import React from 'react';
import { Skeleton } from './Skeleton';

/**
 * Multi-line typography skeleton placeholder.
 */
export function SkeletonText({
  lines = 3,
  lineHeight = 'h-4',
  gap = 'space-y-2',
  lastLineWidth = '60%',
  className = '',
  rounded = 'rounded-md',
}) {
  return (
    <div className={`${gap} ${className}`} aria-hidden="true">
      {[...Array(lines)].map((_, i) => {
        const isLast = i === lines - 1;
        const width = isLast ? lastLineWidth : i % 2 === 1 ? '92%' : '100%';
        return (
          <Skeleton
            key={i}
            className={`${lineHeight} ${rounded}`}
            width={width}
          />
        );
      })}
    </div>
  );
}

export default SkeletonText;
