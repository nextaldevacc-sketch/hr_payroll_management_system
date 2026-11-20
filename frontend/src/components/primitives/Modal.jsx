'use client';

import React, { useEffect } from 'react';
import clsx from 'clsx';
import { X } from 'lucide-react';
import { IconWell } from './IconWell';

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-lg',
  className = '',
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 dark:bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Glass Dialog */}
      <div
        className={clsx(
          'glass-panel rounded-t-3xl sm:rounded-tile w-full p-5 sm:p-6 relative z-10 shadow-2xl transition-all max-h-[90dvh] flex flex-col',
          maxWidth,
          className
        )}
      >
        <div className="flex items-start justify-between gap-4 mb-4 pb-3 border-b border-border/60">
          <div>
            <h2 className="text-lg font-bold text-text dark:gold-heading">{title}</h2>
            {subtitle && <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>}
          </div>
          <IconWell
            size="sm"
            shape="circle"
            onClick={onClose}
            title="Close"
          >
            <X className="w-4 h-4" />
          </IconWell>
        </div>

        <div className="overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}
