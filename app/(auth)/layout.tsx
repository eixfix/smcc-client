import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-16 sm:px-8 lg:px-16">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-x-0 top-[-240px] h-[520px] bg-gradient-to-br from-accent-strong/25 via-transparent to-emerald-500/20 blur-3xl" />
        <div className="absolute bottom-[-200px] left-[10%] h-[480px] w-[480px] rounded-full bg-emerald-500/15 blur-[160px]" />
        <div className="absolute right-[5%] top-[12%] h-[320px] w-[320px] rounded-full bg-accent-soft/20 blur-[120px]" />
      </div>
      <div className="relative z-10 w-full max-w-6xl">
        {children}
      </div>
    </div>
  );
}
