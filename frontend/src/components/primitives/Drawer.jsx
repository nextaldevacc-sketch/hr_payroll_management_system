'use client';

import React, { useEffect } from 'react';
import clsx from 'clsx';
import { X } from 'lucide-react';
import { IconWell } from './IconWell';

export function Drawer({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  side = 'end', // 'start' or 'end'
  width = 'max-w-md',
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
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 dark:bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Slide-out Panel */}
      <div
        className={clsx(
          'glass-panel fixed top-0 bottom-0 z-10 w-full flex flex-col p-6 shadow-2xl transition-transform duration-300',
          side === 'end' ? 'end-0' : 'start-0',
          width,
          className
        )}
      >
        <div className="flex items-start justify-between gap-4 mb-4 pb-3 border-b border-border/60">
          <div>
            <h2 className="text-lg font-bold text-text dark:gold-heading">{title}</h2>
            {subtitle && <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full focus:outline-none"
          >
            <IconWell
              size="sm"
              shape="circle"
              title="Close drawer"
            >
              <X className="w-4 h-4" />
            </IconWell>
          </button>
        </div>

        <div className="overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}
