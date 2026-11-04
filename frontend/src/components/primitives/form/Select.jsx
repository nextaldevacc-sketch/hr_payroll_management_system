'use client';

import React, { useState, useRef, useEffect, useId, useMemo } from 'react';
import clsx from 'clsx';
import { ChevronDown, Check, Search, Loader2 } from 'lucide-react';

/**
 * Universal Styled Accessible Select Primitive
 * Aligned with RC3-FIX-PLAN / PART4A-UI-FIXES Step 3.
 *
 * Features:
 * - WAI-ARIA combobox/listbox pattern (role="combobox", role="listbox", role="option")
 * - Keyboard navigation (ArrowDown, ArrowUp, Enter, Escape, Space, Tab)
 * - Auto-search input when filtered options > 8
 * - Dark mode & Light mode styled tokens (bg-surface-raised dark:bg-inset, clean borders, no white outlines)
 * - RTL-friendly (mirrored chevron and alignment)
 * - Synchronized hidden native <select> for seamless testing / form integration
 * - Supports options as [{ value, label, meta, chip }] or string[]
 */
export function Select({
  label,
  helper,
  helperText,
  error,
  options = [],
  value = '',
  onChange,
  placeholder = 'Select an option...',
  disabled = false,
  loading = false,
  emptyText = 'No options available',
  id,
  name,
  className = '',
  required = false,
  ...rest
}) {
  const generatedId = useId();
  const selectId = id || generatedId;
  const listboxId = `${selectId}-listbox`;

  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const searchInputRef = useRef(null);
  const hiddenSelectRef = useRef(null);
  const optionsListRef = useRef(null);

  // Normalize options shape
  const normalizedOptions = useMemo(() => {
    return options.map((opt) => {
      if (typeof opt === 'object' && opt !== null) {
        const val = opt.value !== undefined ? String(opt.value) : '';
        let lbl = opt.label;
        if (lbl === undefined || lbl === null || String(lbl).trim() === '') {
          if (process.env.NODE_ENV !== 'production') {
            console.warn(`[Select] Option with value "${val}" has an empty label; falling back to placeholder.`);
          }
          lbl = placeholder || 'Select...';
        } else {
          lbl = String(lbl);
        }
        return {
          value: val,
          label: lbl,
          meta: opt.meta ? String(opt.meta) : undefined,
          chip: opt.chip ? String(opt.chip) : undefined,
          disabled: !!opt.disabled,
        };
      }
      const strVal = String(opt);
      return {
        value: strVal,
        label: strVal || placeholder || 'Select...',
        meta: undefined,
        chip: undefined,
        disabled: false,
      };
    });
  }, [options, placeholder]);

  // Filter options if search is active
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return normalizedOptions;
    const term = searchTerm.toLowerCase();
    return normalizedOptions.filter(
      (opt) =>
        opt.label.toLowerCase().includes(term) ||
        (opt.meta && opt.meta.toLowerCase().includes(term)) ||
        (opt.chip && opt.chip.toLowerCase().includes(term))
    );
  }, [normalizedOptions, searchTerm]);

  // Selected option
  const selectedOption = useMemo(() => {
    const stringVal = value !== undefined && value !== null ? String(value) : '';
    return normalizedOptions.find((opt) => opt.value === stringVal) || null;
  }, [normalizedOptions, value]);

  // Handle outside click to close
  useEffect(() => {
    if (!isOpen) return;

    function handleOutsideClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearchTerm('');
        setActiveIndex(-1);
      }
    }

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen) {
      if (filteredOptions.length > 8 && searchInputRef.current) {
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
    } else {
      setSearchTerm('');
      setActiveIndex(-1);
    }
  }, [isOpen, filteredOptions.length]);

  // Scroll active option into view
  useEffect(() => {
    if (isOpen && activeIndex >= 0 && optionsListRef.current) {
      const activeEl = optionsListRef.current.children[activeIndex];
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [isOpen, activeIndex]);

  const selectOptionValue = (optVal) => {
    if (disabled) return;
    setIsOpen(false);
    setSearchTerm('');
    setActiveIndex(-1);

    if (hiddenSelectRef.current) {
      hiddenSelectRef.current.value = optVal;
      // Trigger native change
      const event = new Event('change', { bubbles: true });
      hiddenSelectRef.current.dispatchEvent(event);
    }

    if (onChange) {
      // Pass standard synthetic-like event
      onChange({
        target: {
          id: selectId,
          name: name || selectId,
          value: optVal,
        },
      });
    }

    triggerRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
        const currentIdx = filteredOptions.findIndex((o) => o.value === String(value));
        setActiveIndex(currentIdx >= 0 ? currentIdx : 0);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < filteredOptions.length) {
          const opt = filteredOptions[activeIndex];
          if (!opt.disabled) {
            selectOptionValue(opt.value);
          }
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
        break;
      case 'Tab':
        setIsOpen(false);
        break;
      default:
        // Jump to letter if not searching
        if (filteredOptions.length <= 8 && e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
          const char = e.key.toLowerCase();
          const foundIdx = filteredOptions.findIndex((o) =>
            o.label.toLowerCase().startsWith(char)
          );
          if (foundIdx >= 0) {
            setActiveIndex(foundIdx);
          }
        }
        break;
    }
  };

  const effectiveHelper = error || helper || helperText;

  return (
    <div className={clsx('w-full flex flex-col gap-1.5 relative', className)} ref={containerRef}>
      {label && (
        <label
          htmlFor={selectId}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className="text-xs font-semibold text-text uppercase tracking-wider select-none cursor-pointer flex items-center justify-between"
        >
          <span>
            {label}
            {required && <span className="text-danger-text ms-1">*</span>}
          </span>
        </label>
      )}

      {/* Hidden native select for accessibility & automated tests (e.g. Playwright selectOption) */}
      <select
        ref={hiddenSelectRef}
        id={selectId}
        name={name || selectId}
        value={value ?? ''}
        onChange={(e) => {
          if (onChange) onChange(e);
        }}
        disabled={disabled}
        required={required}
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only pointer-events-none"
      >
        {placeholder && (
          <option value="" disabled={required}>
            {placeholder}
          </option>
        )}
        {normalizedOptions.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Custom Combobox Trigger */}
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        data-i18n-skip={rest['data-i18n-skip'] || undefined}
        aria-controls={listboxId}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={label || placeholder}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        className={clsx(
          'w-full min-h-[40px] px-3.5 py-2 text-sm rounded-xl border text-start flex items-center justify-between gap-2 transition-all duration-200 outline-none',
          'bg-surface-raised dark:bg-inset text-text',
          error
            ? 'border-danger focus:ring-2 focus:ring-danger/20'
            : isOpen
            ? 'border-primary ring-2 ring-primary/20'
            : 'border-border hover:border-text-muted/40 focus:border-primary focus:ring-2 focus:ring-primary/20',
          disabled && 'opacity-50 cursor-not-allowed bg-black/[0.02] dark:bg-white/[0.02]'
        )}
      >
        <span className="truncate flex-1 flex items-center gap-2">
          {loading ? (
            <span className="flex items-center gap-2 text-text-muted">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Loading...</span>
            </span>
          ) : selectedOption ? (
            <span className="flex items-center gap-2 truncate">
              <span className="font-medium text-text truncate">{selectedOption.label}</span>
              {selectedOption.chip && (
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-primary-wash text-primary border border-primary/20">
                  {selectedOption.chip}
                </span>
              )}
              {selectedOption.meta && (
                <span className="text-xs text-text-muted truncate hidden sm:inline">
                  · {selectedOption.meta}
                </span>
              )}
            </span>
          ) : (
            <span className="text-text-muted">{placeholder}</span>
          )}
        </span>

        <ChevronDown
          className={clsx(
            'w-4 h-4 text-text-muted flex-shrink-0 transition-transform duration-200',
            isOpen && 'rotate-180 text-primary'
          )}
        />
      </button>

      {/* Dropdown Listbox */}
      {isOpen && (
        <div
          id={listboxId}
          role="listbox"
          tabIndex={-1}
          className="absolute z-50 top-full mt-1.5 w-full rounded-xl border border-border bg-surface-raised dark:bg-inset shadow-2xl backdrop-blur-md overflow-hidden animate-fadeIn"
        >
          {/* Search bar when > 8 options */}
          {normalizedOptions.length > 8 && (
            <div className="p-2 border-b border-border/50 bg-black/[0.02] dark:bg-white/[0.02] sticky top-0 z-10">
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 text-text-muted absolute start-2.5 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setActiveIndex(0);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Search options..."
                  className="w-full text-xs ps-8 pe-3 py-1.5 rounded-lg border border-border bg-surface-raised dark:bg-inset text-text focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          )}

          <div ref={optionsListRef} className="max-h-56 overflow-y-auto p-1.5 space-y-0.5">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-xs text-text-muted">{emptyText}</div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = selectedOption?.value === opt.value;
                const isActive = activeIndex === idx;

                return (
                  <div
                    key={opt.value}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => !opt.disabled && selectOptionValue(opt.value)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={clsx(
                      'px-3 py-2 text-xs rounded-lg cursor-pointer flex items-center justify-between gap-2 transition-colors select-none',
                      isSelected
                        ? 'bg-primary-wash text-primary font-semibold'
                        : isActive
                        ? 'bg-black/[0.04] dark:bg-white/[0.06] text-text'
                        : 'text-text hover:bg-black/[0.03] dark:hover:bg-white/[0.04]',
                      opt.disabled && 'opacity-40 cursor-not-allowed pointer-events-none'
                    )}
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate">{opt.label}</span>
                        {opt.chip && (
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-black/5 dark:bg-white/10 text-text-muted">
                            {opt.chip}
                          </span>
                        )}
                      </div>
                      {opt.meta && (
                        <span className="text-[11px] text-text-muted truncate">
                          {opt.meta}
                        </span>
                      )}
                    </div>

                    {isSelected && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0 ms-2" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Helper / Error Text */}
      {effectiveHelper && (
        <span
          className={clsx(
            'text-xs transition-colors',
            error ? 'text-danger-text font-medium' : 'text-text-muted'
          )}
        >
          {effectiveHelper}
        </span>
      )}
    </div>
  );
}
