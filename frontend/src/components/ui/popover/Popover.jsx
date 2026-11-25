'use client';

import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
  useId,
} from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { usePathname } from 'next/navigation';

// Single-instance coordinator: opening any popover closes the previously open one
const openRegistry = new Set();
function registerOpenPopover(closeFn) {
  openRegistry.forEach((fn) => {
    if (fn !== closeFn) {
      try { fn(); } catch {}
    }
  });
  openRegistry.clear();
  openRegistry.add(closeFn);
}
function unregisterOpenPopover(closeFn) {
  openRegistry.delete(closeFn);
}

const PopoverContext = createContext(null);

export function usePopover() {
  const context = useContext(PopoverContext);
  if (!context) {
    throw new Error('usePopover must be used within a <Popover />');
  }
  return context;
}

/**
 * Universal Popover Root
 */
export function Popover({
  children,
  open: controlledOpen,
  onOpenChange,
  defaultOpen = false,
  placement = 'bottom-start', // 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end'
  offset = 8,
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : uncontrolledOpen;

  const triggerRef = useRef(null);
  const contentRef = useRef(null);
  const pathname = usePathname();
  const id = useId();

  const close = useCallback(() => {
    if (isControlled) {
      onOpenChange?.(false);
    } else {
      setUncontrolledOpen(false);
    }
  }, [isControlled, onOpenChange]);

  const open = useCallback(() => {
    if (isControlled) {
      onOpenChange?.(true);
    } else {
      setUncontrolledOpen(true);
    }
  }, [isControlled, onOpenChange]);

  const toggle = useCallback(() => {
    if (isControlled) {
      onOpenChange?.(!controlledOpen);
    } else {
      setUncontrolledOpen((prev) => !prev);
    }
  }, [isControlled, controlledOpen, onOpenChange]);

  // Single active open instance coordinator
  useEffect(() => {
    if (isOpen) {
      registerOpenPopover(close);
    } else {
      unregisterOpenPopover(close);
    }
    return () => unregisterOpenPopover(close);
  }, [isOpen, close]);

  // Close on route change
  useEffect(() => {
    if (isOpen) {
      close();
    }
  }, [pathname, isOpen, close]);

  return (
    <PopoverContext.Provider
      value={{
        id,
        isOpen,
        open,
        close,
        toggle,
        triggerRef,
        contentRef,
        placement,
        offset,
      }}
    >
      {children}
    </PopoverContext.Provider>
  );
}

/**
 * Popover Trigger
 */
export function PopoverTrigger({ children, asChild = false, className = '', ...props }) {
  const { id, isOpen, toggle, triggerRef } = usePopover();

  const handleClick = (e) => {
    children?.props?.onClick?.(e);
    props.onClick?.(e);
    if (!e.defaultPrevented) {
      toggle();
    }
  };

  const handleKeyDown = (e) => {
    props.onKeyDown?.(e);
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle();
    }
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ref: triggerRef,
      'aria-haspopup': 'dialog',
      'aria-expanded': isOpen,
      'aria-controls': isOpen ? `popover-content-${id}` : undefined,
      onClick: handleClick,
      onKeyDown: handleKeyDown,
      ...props,
    });
  }

  return (
    <button
      ref={triggerRef}
      type="button"
      aria-haspopup="dialog"
      aria-expanded={isOpen}
      aria-controls={isOpen ? `popover-content-${id}` : undefined}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={className}
      {...props}
    >
      {children}
    </button>
  );
}

/**
 * Popover Content rendered into document.body via Portal
 * Automatically flips vertically on collision, stays within viewport,
 * and renders as bottom sheet on viewport < 768px.
 */
export function PopoverContent({
  children,
  className = '',
  align = 'start', // 'start' | 'end' | 'center'
  side = 'bottom', // 'bottom' | 'top'
  sideOffset = 8,
  role = 'dialog',
  ariaLabel,
  matchTriggerWidth = false,
  onClose,
  id: explicitId,
  ...props
}) {
  const { id, isOpen, close, triggerRef, contentRef } = usePopover();
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 'auto', maxHeight: 400 });

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Compute fixed positioning
  const updatePosition = useCallback(() => {
    if (!triggerRef.current || !isOpen || isMobile) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const isRtl = document.documentElement.dir === 'rtl' || document.documentElement.lang === 'ar';
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Check if trigger is scrolled out of viewport (only when trigger has dimensions)
    if (
      triggerRect.width > 0 &&
      triggerRect.height > 0 &&
      (triggerRect.bottom < 0 ||
        triggerRect.top > viewportHeight ||
        triggerRect.right < 0 ||
        triggerRect.left > viewportWidth)
    ) {
      close();
      return;
    }

    const contentEl = contentRef.current;
    const contentWidth = contentEl ? contentEl.offsetWidth : 280;
    const contentHeight = contentEl ? contentEl.offsetHeight : 240;

    let resolvedSide = side;
    const spaceBelow = viewportHeight - triggerRect.bottom - sideOffset;
    const spaceAbove = triggerRect.top - sideOffset;

    // Flip to top if insufficient space below
    if (side === 'bottom' && spaceBelow < contentHeight && spaceAbove > spaceBelow) {
      resolvedSide = 'top';
    } else if (side === 'top' && spaceAbove < contentHeight && spaceBelow > spaceAbove) {
      resolvedSide = 'bottom';
    }

    let top = resolvedSide === 'bottom' ? triggerRect.bottom + sideOffset : triggerRect.top - contentHeight - sideOffset;
    const maxHeight = Math.max(160, resolvedSide === 'bottom' ? spaceBelow - 16 : spaceAbove - 16);

    let left = triggerRect.left;
    if (align === 'end') {
      left = triggerRect.right - contentWidth;
    } else if (align === 'center') {
      left = triggerRect.left + (triggerRect.width - contentWidth) / 2;
    }

    // RTL flip: 'start' aligns right in RTL, 'end' aligns left
    if (isRtl) {
      if (align === 'start') {
        left = triggerRect.right - contentWidth;
      } else if (align === 'end') {
        left = triggerRect.left;
      }
    }

    // Clamp horizontally to stay within viewport (min 12px from edge)
    const padding = 12;
    if (left + contentWidth > viewportWidth - padding) {
      left = viewportWidth - contentWidth - padding;
    }
    if (left < padding) {
      left = padding;
    }

    setCoords({
      top: Math.round(top),
      left: Math.round(left),
      width: matchTriggerWidth ? Math.round(triggerRect.width) : undefined,
      maxHeight: Math.round(maxHeight),
    });
  }, [triggerRef, contentRef, isOpen, isMobile, side, align, sideOffset, matchTriggerWidth, close]);

  // Recalculate position on mount/open, scroll and window resize
  useEffect(() => {
    if (!isOpen || isMobile) return;
    updatePosition();
    const frame = requestAnimationFrame(updatePosition);

    const handleScrollOrResize = () => {
      requestAnimationFrame(updatePosition);
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, isMobile, updatePosition]);

  // Close on pointerdown outside
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e) => {
      if (
        triggerRef.current?.contains(e.target) ||
        contentRef.current?.contains(e.target)
      ) {
        return;
      }
      close();
      onClose?.();
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        onClose?.();
        triggerRef.current?.focus();
      } else if (e.key === 'Tab') {
        // Simple focus trap: prevent focus from leaking
        if (!contentRef.current) return;
        const focusables = contentRef.current.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, close, onClose, triggerRef, contentRef]);

  if (!mounted || !isOpen) return null;

  const contentId = explicitId || `popover-content-${id}`;

  // Mobile Bottom Sheet (< 768px)
  if (isMobile) {
    return createPortal(
      <div
        className="fixed inset-0 z-[100] flex items-end justify-center pointer-events-auto"
        role="presentation"
      >
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm transition-opacity"
          onClick={() => {
            close();
            onClose?.();
          }}
        />

        {/* Bottom Drawer Sheet */}
        <div
          id={contentId}
          ref={contentRef}
          role={role}
          aria-label={ariaLabel}
          className={clsx(
            'relative z-10 w-full max-h-[85vh] bg-white dark:bg-[#1D1D1D] text-text rounded-t-2xl border-t border-black/10 dark:border-white/10 shadow-2xl p-4 overflow-y-auto flex flex-col animate-slideUp',
            className
          )}
          {...props}
        >
          {/* Grab handle bar */}
          <div className="w-12 h-1.5 bg-black/20 dark:bg-white/20 rounded-full mx-auto mb-3 flex-shrink-0" />
          {children}
        </div>
      </div>,
      document.body
    );
  }

  // Desktop Floating Popover (>= 768px) with Portal to document.body
  return createPortal(
    <div
      id={contentId}
      ref={contentRef}
      role={role}
      aria-label={ariaLabel}
      style={{
        position: 'fixed',
        top: `${coords.top}px`,
        left: `${coords.left}px`,
        width: coords.width ? `${coords.width}px` : undefined,
        maxHeight: `${coords.maxHeight}px`,
        zIndex: 90,
      }}
      className={clsx(
        'glass-panel rounded-control shadow-2xl border border-border dark:border-white/10 bg-white/95 dark:bg-[#1D1D1D]/95 text-text overflow-y-auto outline-none transition-all duration-150',
        className
      )}
      {...props}
    >
      {children}
    </div>,
    document.body
  );
}

/**
 * Dropdown Menu Item Primitive with keyboard navigation
 */
export function DropdownMenuItem({
  children,
  onClick,
  className = '',
  disabled = false,
  danger = false,
  active = false,
  ...props
}) {
  const { close } = usePopover();

  const handleClick = (e) => {
    if (disabled) return;
    onClick?.(e);
    close();
  };

  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={handleClick}
      className={clsx(
        'w-full text-start px-3 py-2 text-xs font-semibold rounded-lg flex items-center gap-2.5 transition-colors focus:outline-none focus:bg-primary-wash focus:text-primary',
        danger
          ? 'text-danger hover:bg-danger-wash'
          : active
          ? 'bg-primary-wash text-primary font-bold'
          : 'text-text hover:bg-white/5 dark:hover:bg-white/5',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export default Popover;
