'use client';

import React, { useEffect, useState, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * Ultra-thin (2.5px) top progress bar indicating client-side navigation.
 * Hooked directly to Next.js route change events without external dependencies.
 */
export function RouteProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [active, setActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef(null);

  // When pathname or search params update, complete the progress bar
  useEffect(() => {
    if (active) {
      setProgress(100);
      const finishTimer = setTimeout(() => {
        setActive(false);
        setProgress(0);
      }, 180);
      return () => clearTimeout(finishTimer);
    }
  }, [pathname, searchParams]);

  // Intercept client-side link navigation clicks
  useEffect(() => {
    const handleLinkClick = (e) => {
      // Find closest anchor tag
      const anchor = e.target.closest('a');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href) return;

      // Ignore anchor jumps, external links, mailto, tel, or downloads
      if (
        href.startsWith('#') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        href.startsWith('http://') ||
        href.startsWith('https://') ||
        anchor.target === '_blank' ||
        anchor.hasAttribute('download')
      ) {
        return;
      }

      // If clicking the current path without hash or query change, ignore
      if (href === pathname) return;

      // Start the progress indicator
      setActive(true);
      setProgress(25);

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 85) {
            clearInterval(timerRef.current);
            return 85;
          }
          return prev + Math.floor(Math.random() * 12) + 8;
        });
      }, 120);
    };

    document.addEventListener('click', handleLinkClick, { capture: true });
    return () => {
      document.removeEventListener('click', handleLinkClick, { capture: true });
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [pathname]);

  if (!active && progress === 0) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] h-[2.5px] pointer-events-none bg-transparent"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={progress}
    >
      <div
        className="h-full bg-gradient-to-r from-amber-500 via-primary to-amber-400 dark:from-primary dark:via-amber-400 dark:to-primary shadow-[0_0_10px_rgba(230,166,14,0.7)]"
        style={{
          width: `${progress}%`,
          opacity: progress === 100 ? 0 : 1,
          transition: progress === 100 ? 'width 120ms ease-out, opacity 180ms ease-in' : 'width 180ms ease-out',
        }}
      />
    </div>
  );
}

export default RouteProgressBar;
