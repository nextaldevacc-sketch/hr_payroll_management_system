'use client';

import React from 'react';
import clsx from 'clsx';
import { Loader2, AlertCircle, FileX, Lock } from 'lucide-react';

/**
 * DataTable Primitive
 * Comfortable row height, zebra OFF, hover highlight ON.
 * Right-aligned tabular money figures.
 */
export function DataTable({
  columns = [],
  data = [],
  keyField = 'id',
  loading = false,
  error = null,
  noPermission = false,
  locked = false,
  emptyMessage = 'No records found',
  onRowClick,
  className = '',
}) {
  if (loading) {
    return (
      <div className="w-full min-h-[220px] flex flex-col items-center justify-center p-8 text-text-muted">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
        <span className="text-sm font-medium">Loading records...</span>
      </div>
    );
  }

  if (noPermission) {
    return (
      <div className="w-full min-h-[220px] flex flex-col items-center justify-center p-8 text-text-muted">
        <div className="w-12 h-12 rounded-full bg-warning-wash flex items-center justify-center mb-3 text-warning-text">
          <Lock className="w-6 h-6" />
        </div>
        <span className="text-sm font-semibold text-text">Restricted Access</span>
        <span className="text-xs text-text-muted mt-1">
          Your role does not have permission to view this data.
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full min-h-[220px] flex flex-col items-center justify-center p-8 text-danger-text">
        <AlertCircle className="w-8 h-8 mb-2 opacity-80" />
        <span className="text-sm font-semibold">Failed to load data</span>
        <span className="text-xs text-text-muted mt-1">{error}</span>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="w-full min-h-[220px] flex flex-col items-center justify-center p-8 text-text-muted">
        <FileX className="w-8 h-8 mb-2 opacity-40" />
        <span className="text-sm font-medium">{emptyMessage}</span>
      </div>
    );
  }

  return (
    <div className={clsx('w-full overflow-x-auto relative', className)}>
      {locked && (
        <div className="mb-3 px-3 py-1.5 rounded-lg bg-slate-500/10 border border-border flex items-center gap-2 text-xs text-text-muted">
          <Lock className="w-3.5 h-3.5" />
          <span>Pay run is locked. Editing is disabled.</span>
        </div>
      )}
      <table className="w-full text-start border-collapse">
        <thead>
          <tr className="border-b border-border/80">
            {columns.map((col, idx) => (
              <th
                key={col.key || idx}
                scope="col"
                className={clsx(
                  'py-3.5 px-4 text-xs font-semibold text-text-muted uppercase tracking-wider',
                  col.align === 'end' ? 'text-end' : col.align === 'center' ? 'text-center' : 'text-start',
                  col.isNumeric && 'tabular-nums'
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {data.map((row, rowIdx) => (
            <tr
              key={row[keyField] || rowIdx}
              onClick={() => onRowClick && onRowClick(row)}
              className={clsx(
                'transition-colors duration-150',
                onRowClick ? 'cursor-pointer hover:bg-primary-wash/30 dark:hover:bg-white/[0.03]' : 'hover:bg-black/[0.015] dark:hover:bg-white/[0.02]'
              )}
            >
              {columns.map((col, cIdx) => {
                const cellValue = col.render ? col.render(row[col.key], row) : row[col.key];
                return (
                  <td
                    key={col.key || cIdx}
                    className={clsx(
                      'py-3.5 px-4 text-sm text-text',
                      col.align === 'end' ? 'text-end' : col.align === 'center' ? 'text-center' : 'text-start',
                      col.isNumeric && 'tabular-nums font-mono',
                      col.isMoney && 'tabular-nums font-semibold text-end'
                    )}
                  >
                    {cellValue}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
