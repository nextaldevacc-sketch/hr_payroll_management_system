'use client';

import React from 'react';
import clsx from 'clsx';

/**
 * ListDivided Primitive
 * Rows separated by a 1px var(--border) divider, no outer box.
 */
export function ListDivided({
  children,
  className = '',
  as: Component = 'div',
  id,
  ...props
}) {
  return (
    <Component
      id={id}
      className={clsx('list-divided', className)}
      {...props}
    >
      {children}
    </Component>
  );
}
