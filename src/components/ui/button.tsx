'use client';

import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';

import { cn } from '@/src/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost';

const baseClasses =
  'inline-flex items-center justify-center rounded-md text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-soft focus-visible:ring-offset-2 focus-visible:ring-offset-background';

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-accent-strong text-slate-950 hover:bg-accent-soft disabled:bg-accent-soft/50 disabled:text-slate-900/60',
  secondary:
    'bg-surface-muted text-slate-100 hover:bg-surface-subtle disabled:opacity-60 border border-slate-700/60',
  ghost:
    'bg-transparent text-slate-300 hover:bg-surface-subtle/50 disabled:opacity-40'
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(baseClasses, variantClasses[variant], 'px-4 py-2', className)}
      {...props}
    />
  )
);

Button.displayName = 'Button';
