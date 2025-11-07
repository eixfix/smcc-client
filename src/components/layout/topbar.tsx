import type { ReactNode } from 'react';

import { cn } from '@/src/lib/utils';

interface TopbarProps {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function Topbar({ eyebrow, title, description, actions, className }: TopbarProps) {
  return (
    <header
      className={cn(
        'flex flex-col gap-6 rounded-3xl border border-slate-800/80 bg-slate-900/50 px-6 py-6 shadow-[0_25px_60px_-45px_rgba(56,189,248,0.35)] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:px-10 sm:py-8',
        className
      )}
    >
      <div className="space-y-3">
        {eyebrow ? (
          <span className="text-xs font-semibold uppercase tracking-[0.35em] text-accent-soft/70">
            {eyebrow}
          </span>
        ) : null}
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">{title}</h1>
        {description ? <p className="max-w-2xl text-sm text-slate-400">{description}</p> : null}
      </div>
      {actions ? (
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
          {actions}
        </div>
      ) : null}
    </header>
  );
}
