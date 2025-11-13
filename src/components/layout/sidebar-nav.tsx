'use client';

import React, {
  Fragment,
  useEffect,
  useId,
  useMemo,
  useState,
  type JSX,
} from 'react';
import { usePathname } from 'next/navigation';
import {
  Bars3Icon,
  BuildingOffice2Icon,
  ClipboardDocumentListIcon,
  DocumentChartBarIcon,
  HomeIcon,
  ShieldCheckIcon,
  Squares2X2Icon,
  XMarkIcon,
  Cog6ToothIcon,
  ServerStackIcon,
  BoltIcon,
  CpuChipIcon,
  ChevronDownIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import type { SVGProps } from 'react';

import { Button } from '@/src/components/ui/button';
import { cn } from '@/src/lib/utils';

export type NavLink = {
  href: string;
  label: string;
  icon: IconKey;
  badge?: string;
  group?: string; // items with same non-empty group go into one submenu
};

type IconKey =
  | 'overview'
  | 'organizations'
  | 'projects'
  | 'servers'
  | 'tasks'
  | 'reports'
  | 'security'
  | 'manualScans'
  | 'agentScans'
  | 'telemetry'
  | 'guide'
  | 'settings';

type SidebarNavVariant = 'mobile' | 'desktop';

const iconMap: Record<IconKey, (props: SVGProps<SVGSVGElement>) => JSX.Element> = {
  overview: (props) => <HomeIcon {...props} />,
  organizations: (props) => <BuildingOffice2Icon {...props} />,
  projects: (props) => <Squares2X2Icon {...props} />,
  servers: (props) => <ServerStackIcon {...props} />,
  manualScans: (props) => <BoltIcon {...props} />,
  agentScans: (props) => <CpuChipIcon {...props} />,
  telemetry: (props) => <ChartBarIcon {...props} />,
  tasks: (props) => <ClipboardDocumentListIcon {...props} />,
  reports: (props) => <DocumentChartBarIcon {...props} />,
  security: (props) => <ShieldCheckIcon {...props} />,
  guide: (props) => <DocumentChartBarIcon {...props} />,
  settings: (props) => <Cog6ToothIcon {...props} />,
};

interface SidebarNavProps {
  links: NavLink[];
  variant?: SidebarNavVariant;
}

function normalizePath(p: string) {
  if (p === '/') return '/';
  return p.endsWith('/') ? p.slice(0, -1) : p;
}

export function SidebarNav({ links, variant = 'mobile' }: SidebarNavProps) {
  const pathname = normalizePath(usePathname());
  const [isMobileOpen, setMobileOpen] = useState(false);
  const navId = useId();

  const handleToggle = () => setMobileOpen((v) => !v);
  const closeMobile = () => setMobileOpen(false);

  // Pre-bucket items by group name
  const groupedMap = useMemo(() => {
    const m = new Map<string, NavLink[]>();
    for (const item of links) {
      if (!item.group) continue;
      if (!m.has(item.group)) m.set(item.group, []);
      m.get(item.group)!.push(item);
    }
    return m;
  }, [links]);

  // Auto-open groups if a child route is active
  const initialOpen = useMemo(() => {
    const s = new Set<string>();
    for (const [g, items] of groupedMap) {
      if (
        items.some(({ href }) => {
          const nh = normalizePath(href);
          return pathname === nh || (nh !== '/' && pathname.startsWith(`${nh}/`));
        })
      ) {
        s.add(g);
      }
    }
    return s;
  }, [groupedMap, pathname]);

  const [openGroups, setOpenGroups] = useState<Set<string>>(initialOpen);
  useEffect(() => {
    // re-sync when route changes
    setOpenGroups(initialOpen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const toggleGroup = (g: string) =>
    setOpenGroups((prev) => {
      const next = new Set(prev);
      next.has(g) ? next.delete(g) : next.add(g);
      return next;
    });

  const NavItem = ({ item }: { item: NavLink }) => {
    const Icon = iconMap[item.icon];
    const nh = normalizePath(item.href);
    const isActive =
      pathname === nh || (nh !== '/' && pathname.startsWith(`${nh}/`));
    const handleClick = variant === 'mobile' ? closeMobile : undefined;

    return (
      <Link
        href={item.href}
        aria-current={isActive ? 'page' : undefined}
        data-active={isActive}
        className={cn(
          'group relative flex items-center gap-3 overflow-hidden rounded-xl px-3 py-2.5 text-sm font-semibold transition-all',
          isActive
            ? 'bg-gradient-to-r from-accent-strong/20 to-transparent text-slate-100 shadow-[0_18px_32px_-24px_rgba(56,189,248,0.5)]'
            : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
        )}
        onClick={handleClick}
      >
        <span
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800/70 bg-slate-900/70 text-slate-500 transition-colors',
            isActive && 'border-accent-strong/60 bg-accent-strong/15 text-accent-soft'
          )}
        >
          <Icon width={16} height={16} strokeWidth={1.4} aria-hidden="true" />
        </span>
        <span className="relative z-10 flex items-center gap-2">
          {item.label}
          {item.badge ? (
            <span className="rounded-full border border-accent-soft/40 bg-accent-soft/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-soft">
              {item.badge}
            </span>
          ) : null}
        </span>
        <span
          className={cn(
            'pointer-events-none absolute inset-y-2 left-1 w-1 rounded-full bg-accent-soft/80 opacity-0 transition-opacity duration-200',
            isActive && 'opacity-100'
          )}
          aria-hidden="true"
        />
      </Link>
    );
  };

  const Group = ({ name, items }: { name: string; items: NavLink[] }) => {
    const isOpen = openGroups.has(name);
    const hasActive = items.some(({ href }) => {
      const nh = normalizePath(href);
      return pathname === nh || (nh !== '/' && pathname.startsWith(`${nh}/`));
    });

    return (
      <li className="mb-1">
        <button
          type="button"
          onClick={() => toggleGroup(name)}
          className={cn(
            'flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition-colors',
            'text-slate-500 hover:text-slate-200',
            isOpen && 'text-slate-300'
          )}
          aria-expanded={isOpen}
        >
          <span>{name}</span>
          <ChevronDownIcon
            className={cn('h-4 w-4 transition-transform', isOpen ? 'rotate-180' : 'rotate-0')}
            aria-hidden="true"
          />
        </button>

        <div
          className={cn(
            'overflow-hidden transition-[grid-template-rows] duration-200',
            isOpen ? 'grid grid-rows-[1fr]' : 'grid grid-rows-[0fr]'
          )}
        >
          <ul className="min-h-0 list-none p-0 pl-1">
            {items.map((item) => (
              <li key={item.href} className="mt-1">
                <NavItem item={item} />
              </li>
            ))}
          </ul>
        </div>

        {hasActive && !isOpen ? (
          <div className="ml-3 mt-1 h-0.5 w-10 rounded-full bg-accent-soft/70" />
        ) : null}
      </li>
    );
  };

  // INLINE RENDERING: walk links in order; when we hit a new group, render its submenu here
  const renderLinks = (orientation: 'vertical' | 'horizontal' = 'vertical', id?: string) => {
    const emittedGroups = new Set<string>();

    return (
      <nav aria-label="Primary navigation" id={id}>
        <ul
          className={cn(
            'list-none p-0',
            orientation === 'vertical'
              ? 'flex flex-col gap-1'
              : 'flex flex-wrap items-center gap-2 sm:gap-3'
          )}
        >
          {links.map((item) => {
            if (item.group) {
              // first time we see this group, render the whole submenu here
              if (!emittedGroups.has(item.group)) {
                emittedGroups.add(item.group);
                const items = groupedMap.get(item.group) ?? [];
                return <Group key={`group:${item.group}`} name={item.group} items={items} />;
              }
              // subsequent items of the same group are skipped (already rendered)
              return null;
            }

            // ungrouped item renders inline
            return (
              <li key={item.href}>
                <NavItem item={item} />
              </li>
            );
          })}
        </ul>
      </nav>
    );
  };

  if (variant === 'desktop') {
    return renderLinks('vertical');
  }

  return (
    <>
      <Button
        variant="secondary"
        className="flex items-center gap-2 rounded-full border border-slate-800/70 bg-slate-900/70 px-4 py-2 text-sm text-slate-200 shadow-[0_10px_30px_-20px_rgba(56,189,248,0.45)]"
        onClick={handleToggle}
        aria-expanded={isMobileOpen}
        aria-controls={navId}
      >
        {isMobileOpen ? <XMarkIcon className="h-4 w-4" /> : <Bars3Icon className="h-4 w-4" />}
        <span>{isMobileOpen ? 'Close' : 'Menu'}</span>
      </Button>

      {isMobileOpen ? (
        <div className="fixed inset-0 z-[2000] sm:hidden">
          <div
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={closeMobile}
            aria-hidden
          />
          <div className="absolute inset-x-4 top-24 z-[2001] rounded-2xl border border-slate-800/80 bg-slate-900/95 p-5 shadow-[0_40px_120px_-80px_rgba(56,189,248,0.5)]">
            {renderLinks('vertical', navId)}
          </div>
        </div>
      ) : null}
    </>
  );
}
