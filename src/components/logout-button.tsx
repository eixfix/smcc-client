'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { cn } from '@/src/lib/utils';

interface LogoutButtonProps {
  className?: string;
}

export function LogoutButton({ className }: LogoutButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
    await fetch('/api/session', { method: 'DELETE' });
    router.replace('/login');
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isLoading}
      className={cn(
        'rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60',
        className
      )}
    >
      {isLoading ? 'Signing Out…' : 'Sign Out'}
    </button>
  );
}
