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
    <div
      className={clsx("fixed inset-0 z-50 flex overflow-hidden", side === 'end' ? "justify-end" : "justify-start")}
      onClick={onClose}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 dark:bg-black/75 backdrop-blur-sm transition-opacity pointer-events-none"
        aria-hidden="true"
      />

      {/* Slide-out Panel */}
      <div
        id="drawer-panel"
        onClick={(e) => e.stopPropagation()}
        className={clsx(
          'glass-panel relative z-10 h-full w-full sm:max-w-md flex flex-col p-4 sm:p-6 shadow-2xl transition-transform duration-300 pointer-events-auto',
          width,
          className
        )}
      >
        <div className="flex items-start justify-between gap-4 mb-4 pb-3 border-b border-border/60">
          <div>
            <h2 className="text-lg font-bold text-text">{title}</h2>
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
