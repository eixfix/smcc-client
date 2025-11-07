'use client';

import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';

import { cn } from '@/src/lib/utils';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = 'text', ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        'w-full rounded-md border border-slate-800 bg-background-subtle px-3 py-2 text-sm text-slate-100 shadow-sm transition focus:border-accent-soft focus:ring-2 focus:ring-accent-soft/60',
        className
      )}
      {...props}
    />
  )
);

Input.displayName = 'Input';
