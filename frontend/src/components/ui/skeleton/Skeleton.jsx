'use client';

import React from 'react';
import { useLanguage } from '@/context/LanguageContext';

/**
 * Base Skeleton block with CSS-only shimmer, dark mode support, and RTL awareness.
 */
export function Skeleton({
  as: Component = 'div',
  className = '',
  width,
  height,
  style = {},
  rounded = 'rounded-lg',
  ariaLabel,
  children,
  ...props
}) {
  let langContext = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    langContext = useLanguage();
  } catch {
    // Graceful fallback if rendered outside LanguageProvider
  }
  const isArabic = langContext?.language === 'ar';
  const defaultLabel = isArabic ? 'جارٍ التحميل...' : 'Loading...';
  const label = ariaLabel || defaultLabel;

  const combinedStyles = {
    ...(width ? { width } : {}),
    ...(height ? { height } : {}),
    ...style,
  };

  return (
    <Component
      className={`skeleton-shimmer ${rounded} ${className}`}
      style={combinedStyles}
      role="status"
      aria-busy="true"
      aria-live="polite"
      {...props}
    >
      <span className="sr-only">{label}</span>
      {children}
    </Component>
  );
}

export default Skeleton;
