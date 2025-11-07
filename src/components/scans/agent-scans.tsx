'use client';

import { useMemo, useState } from 'react';
import { CpuChipIcon } from '@heroicons/react/24/outline';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import type { AgentScanSummary } from '@/src/lib/api';
import { formatDateTime, formatDuration } from '@/src/lib/formatters';

interface AgentScansProps {
  scans: AgentScanSummary[];
}

export function AgentScans({ scans }: AgentScansProps) {
  const [selected, setSelected] = useState<AgentScanSummary | null>(null);
  const grouped = useMemo(() => {
    const map = new Map<string, { server: AgentScanSummary['server']; items: AgentScanSummary[] }>();
    scans.forEach((scan) => {
      const existing = map.get(scan.server.id);
      if (existing) {
        existing.items.push(scan);
      } else {
        map.set(scan.server.id, { server: scan.server, items: [scan] });
      }
    });
    return Array.from(map.values());
  }, [scans]);

  if (scans.length === 0) {
    return (
      <Card className="border-slate-800/70 bg-slate-950/60">
        <CardHeader>
          <CardTitle className="text-slate-100 flex items-center gap-3">
            <CpuChipIcon className="h-5 w-5 text-accent-soft" />
            Agent Scans
            <span className="rounded-full border border-accent-soft/40 bg-accent-soft/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-soft">
              Beta
            </span>
          </CardTitle>
          <CardDescription className="text-slate-400">
            No agent-driven scans yet. Once agents report back, historical jobs will appear here.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {grouped.map(({ server, items }) => (
        <Card key={server.id} className="border-slate-800/70 bg-slate-950/50 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-slate-100 flex items-center gap-3">
              <CpuChipIcon className="h-5 w-5 text-accent-soft" />
              {server.name}
              <span className="rounded-full border border-accent-soft/40 bg-accent-soft/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-soft">
                Beta
              </span>
            </CardTitle>
            <CardDescription className="text-slate-400">
              {server.hostname ?? 'Hostname pending'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-800 text-sm">
                <thead className="bg-slate-900/60 text-slate-400">
                  <tr>
                    <th className="px-4 py-3 text-left">Playbook</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Queued</th>
                    <th className="px-4 py-3 text-left">Duration</th>
                    <th className="px-4 py-3 text-left">Agent</th>
                    <th className="px-4 py-3 text-right">Credits</th>
                    <th className="px-4 py-3 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-200">
                  {items.map((scan) => {
                    const queued = new Date(scan.queuedAt);
                    const started = scan.startedAt ? new Date(scan.startedAt) : null;
                    const completed = scan.completedAt ? new Date(scan.completedAt) : null;
                    const duration = started && completed ? formatDuration(started, completed) : '—';

                    return (
                      <tr key={scan.id} className="hover:bg-slate-900/40">
                        <td className="px-4 py-3 font-semibold">{scan.playbook}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-lg bg-slate-800/60 px-2 py-1 text-xs uppercase tracking-wide">
                            {scan.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400">{formatDateTime(queued)}</td>
                        <td className="px-4 py-3 text-xs text-slate-400">{duration}</td>
                        <td className="px-4 py-3 text-xs text-slate-400">
                          {scan.agent ? `${scan.agent.accessKey} · ${scan.agent.status}` : 'No agent'}
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-slate-400">
                          {scan.creditsCharged ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button variant="ghost" onClick={() => setSelected(scan)}>
                            View
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ))}

      {selected ? (
        <Card className="border-slate-800/70 bg-slate-950/70">
          <CardHeader>
            <CardTitle className="text-slate-100">Agent scan details</CardTitle>
            <CardDescription className="text-slate-400">
              Playbook {selected.playbook} · {selected.status}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-300">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Server</p>
                <p className="font-medium text-slate-200">{selected.server.name}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Queued</p>
                <p className="text-slate-300">{formatDateTime(new Date(selected.queuedAt))}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Started</p>
                <p className="text-slate-300">
                  {selected.startedAt ? formatDateTime(new Date(selected.startedAt)) : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Completed</p>
                <p className="text-slate-300">
                  {selected.completedAt ? formatDateTime(new Date(selected.completedAt)) : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Credits charged</p>
                <p className="text-slate-300">{selected.creditsCharged ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Failure reason</p>
                <p className="text-slate-300">{selected.failureReason ?? '—'}</p>
              </div>
            </div>
            <pre className="overflow-x-auto rounded-xl bg-slate-950/80 p-4 text-xs text-slate-200">
              {JSON.stringify(selected.result ?? {}, null, 2)}
            </pre>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
