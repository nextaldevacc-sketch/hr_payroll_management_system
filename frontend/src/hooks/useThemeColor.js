'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';

/**
 * useThemeColor Hook
 * Reads computed CSS variable values from document.documentElement.
 * Dynamically re-evaluates on theme changes and DOM attribute mutations.
 *
 * @param {string} tokenName - CSS variable name, e.g. '--primary', '--info', '--warning'
 * @param {string} fallback - Fallback color string if token is not yet computed
 * @returns {string} - Computed color value
 */
export function useThemeColor(tokenName, fallback = '') {
  const { theme, resolvedTheme } = useTheme();
  const [color, setColor] = useState(fallback);

  useEffect(() => {
    const updateColor = () => {
      if (typeof window === 'undefined') return;
      const computed = window.getComputedStyle(document.documentElement);
      const val = computed.getPropertyValue(tokenName).trim();
      if (val) {
        setColor(val);
      }
    };

    updateColor();

    // Observe DOM attribute changes (e.g. data-theme, class) on document.documentElement
    const observer = new MutationObserver(updateColor);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class'],
    });

    return () => observer.disconnect();
  }, [tokenName, theme, resolvedTheme]);

  return color || fallback;
}
