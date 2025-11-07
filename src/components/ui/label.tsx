import type { LabelHTMLAttributes } from 'react';

import { cn } from '@/src/lib/utils';

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn('block text-sm font-medium text-slate-300 tracking-wide', className)}
      {...props}
    />
  );
}
