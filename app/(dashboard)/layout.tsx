import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { LogoutButton } from '@/src/components/logout-button';
import { SidebarNav } from '@/src/components/layout/sidebar-nav';
import type { NavLink } from '@/src/components/layout/sidebar-nav';
import { Topbar } from '@/src/components/layout/topbar';
import { Badge } from '@/src/components/ui/badge';
import { fetchCurrentUser } from '@/src/lib/auth';
import { fetchOrganizations } from '@/src/lib/api';

const NAV_LINKS: NavLink[] = [
  { href: '/', label: 'Overview', icon: 'overview' },
  { href: '/organizations', label: 'Organizations', icon: 'organizations' },
  { href: '/projects', label: 'Projects', icon: 'projects', group: 'Load Test' },
  { href: '/tasks', label: 'Tasks', icon: 'tasks', group: 'Load Test' },
  { href: '/reports', label: 'Reports', icon: 'reports', group: 'Load Test' },
  { href: '/servers', label: 'Servers', icon: 'servers', badge: 'BETA', group: 'Monitoring' },
  { href: '/telemetry', label: 'Telemetry', icon: 'telemetry', badge: 'BETA', group: 'Monitoring' },
  { href: '/scans/manual', label: 'Manual Scans', icon: 'manualScans', badge: 'BETA', group: 'Monitoring' },
  { href: '/scans/agents', label: 'Agent Scans', icon: 'agentScans', badge: 'BETA', group: 'Monitoring' },
  { href: '/security', label: 'Security Check', icon: 'security' },
  { href: '/settings', label: 'Settings', icon: 'settings' },
  { href: '/user-guide', label: 'User Guide', icon: 'guide' }
];

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const token = cookies().get('lt_token')?.value;

  if (!token) {
    redirect('/login');
  }

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const currentUser = await fetchCurrentUser(apiBaseUrl, token);
  const organizations = await fetchOrganizations(apiBaseUrl, token);

  const totalCredits = organizations.reduce((acc, org) => acc + org.credits, 0);

  if (!currentUser) {
    redirect('/login');
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-3 pb-16 pt-6 sm:flex-row sm:px-6 lg:gap-10">
      <aside className="hidden sm:block sm:w-64 sm:flex-none sm:sticky sm:top-8">
        <div className="flex h-[calc(100vh-4rem)] flex-col gap-6 overflow-y-auto rounded-3xl border border-slate-800/70 bg-slate-900/60 p-6 shadow-[0_45px_110px_-60px_rgba(15,118,110,0.45)] backdrop-blur-2xl">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-strong/25 text-lg font-semibold text-accent-soft">
                SM
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-100">Server Monitoring Command Center</p>
                <p className="text-xs text-slate-500">Infrastructure performance & health</p>
              </div>
            </div>
            <Badge variant="default" className="bg-accent-strong/15 text-accent-soft">
              Live
            </Badge>
          </div>
          <div className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4 space-y-4">
            <SidebarNav links={NAV_LINKS} variant="desktop" />
            <div className="rounded-xl border border-accent-strong/30 bg-accent-strong/10 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-accent-soft">Credits</p>
              <p className="mt-1 text-lg font-semibold text-slate-100">{totalCredits}</p>
              <p className="text-[11px] text-accent-soft/80">
                15/project · 5/task · 2/security check · 30/server scan · 5/telemetry
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-5">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-200">{currentUser.name}</p>
              <p className="text-xs text-slate-500">{currentUser.email}</p>
            </div>
            <Badge
              variant="default"
              className="mt-3 w-fit bg-accent-strong/20 text-accent-soft capitalize"
            >
              {currentUser.role.toLowerCase()}
            </Badge>
            <LogoutButton className="mt-4 w-full" />
          </div>
        </div>
      </aside>
      <div className="flex-1">
        <div className="flex flex-col gap-6">
          <div className="sm:hidden sticky top-4 z-20">
            <div className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-4 shadow-[0_30px_60px_-45px_rgba(15,118,110,0.4)] backdrop-blur-xl">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-strong/25 text-sm font-semibold text-accent-soft">
                    SM
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-100">Server Monitoring Command Center</p>
                    <p className="text-xs text-slate-500">Credits: {totalCredits}</p>
                  </div>
                </div>
                <SidebarNav links={NAV_LINKS} variant="mobile" />
              </div>
            </div>
          </div>
          <Topbar
            eyebrow="Command Center"
            title="Server Monitoring Command Center"
            description="Monitor server performance, coordinate scans, and keep stakeholders informed in real time."
            actions={
              <>
                <Badge variant="default" className="hidden sm:inline-flex bg-surface-muted/80 text-slate-300">
                  {currentUser.role}
                </Badge>
                <LogoutButton className="w-full sm:w-auto sm:px-4" />
              </>
            }
          />
          <div className="rounded-3xl border border-slate-800/70 bg-slate-950/50 p-4 shadow-[0_60px_120px_-80px_rgba(15,118,110,0.5)] backdrop-blur-2xl sm:p-8 space-y-6">
            {children}
            <footer className="border-t border-slate-800/60 pt-6 text-xs text-slate-500 sm:flex sm:items-center sm:justify-between">
              <span>&copy; {new Date().getFullYear()} Server Monitoring Command Center</span>
              <span className="font-medium text-slate-400">
                Powered by <span className="text-accent-soft">TrickyLabs</span>
              </span>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}
