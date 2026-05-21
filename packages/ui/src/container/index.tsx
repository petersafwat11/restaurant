import * as React from 'react';
import { cn } from '../lib/cn';

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'narrow' | 'default' | 'wide';
  as?: React.ElementType;
}

/**
 * Standard responsive container. Caps width at 1280px (or 720px for narrow,
 * full-bleed for wide) and applies responsive horizontal padding that scales
 * with viewport width — `clamp(20px, 4vw, 48px)`.
 *
 * Used as the inner wrapper for every section + the hero text column.
 */
export function Container({
  size = 'default',
  as: Tag = 'div',
  className,
  children,
  ...rest
}: ContainerProps) {
  const widthClass =
    size === 'narrow' ? 'max-w-container-narrow' : size === 'wide' ? '' : 'max-w-container';
  return (
    <Tag
      className={cn(
        'mx-auto w-full px-[clamp(1.25rem,4vw,3rem)]',
        widthClass,
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}
