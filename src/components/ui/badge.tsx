import type { HTMLAttributes } from 'react';

import { cn } from '@/src/lib/utils';

type Variant = 'success' | 'warning' | 'danger' | 'default';

const styles: Record<Variant, string> = {
  default: 'bg-surface-muted text-slate-200',
  success: 'bg-success/20 text-success border border-success/40',
  warning: 'bg-warning/20 text-warning border border-warning/40',
  danger: 'bg-danger/20 text-danger border border-danger/40'
};

export function Badge({
  className,
  variant = 'default',
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide',
        styles[variant],
        className
      )}
      {...props}
    />
  );
}
