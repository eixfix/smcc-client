'use client';

import { useState } from 'react';
import { ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import type { ManualScanSummary } from '@/src/lib/api';
import { formatDateTime, formatDuration } from '@/src/lib/formatters';

interface ManualScansProps {
  scans: ManualScanSummary[];
}

export function ManualScans({ scans }: ManualScansProps) {
  const [selected, setSelected] = useState<ManualScanSummary | null>(null);

  if (scans.length === 0) {
    return (
      <Card className="border-slate-800/70 bg-slate-950/60">
        <CardHeader>
          <CardTitle className="text-slate-100 flex items-center gap-3">
            <ClipboardDocumentCheckIcon className="h-5 w-5 text-accent-soft" />
            Manual Scans
            <span className="rounded-full border border-accent-soft/40 bg-accent-soft/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-soft">
              Beta
            </span>
          </CardTitle>
          <CardDescription className="text-slate-400">
            No manual scans have been triggered yet. Use the API to launch a run and it will appear here instantly.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-slate-800/70 bg-slate-950/50 shadow-2xl">
        <CardHeader>
          <CardTitle className="text-slate-100 flex items-center gap-3">
            <ClipboardDocumentCheckIcon className="h-5 w-5 text-accent-soft" />
            Manual Scans
            <span className="rounded-full border border-accent-soft/40 bg-accent-soft/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-soft">
              Beta
            </span>
          </CardTitle>
          <CardDescription className="text-slate-400">
            Review HTTP load tests kicked off manually across your organizations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-800 text-sm">
              <thead className="bg-slate-900/60 text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left">Task</th>
                  <th className="px-4 py-3 text-left">Organization</th>
                  <th className="px-4 py-3 text-left">Triggered by</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Started</th>
                  <th className="px-4 py-3 text-left">Duration</th>
                  <th className="px-4 py-3 text-right">Credits</th>
                  <th className="px-4 py-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200">
                {scans.map((scan) => {
                  const started = scan.startedAt ? new Date(scan.startedAt) : null;
                  const completed = scan.completedAt ? new Date(scan.completedAt) : null;
                  const duration = started && completed ? formatDuration(started, completed) : '—';

                  return (
                    <tr key={scan.id} className="hover:bg-slate-900/40">
                      <td className="px-4 py-3">
                        <div className="font-semibold">{scan.task.label}</div>
                        <div className="text-xs text-slate-400 uppercase">
                          {scan.task.mode}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold">{scan.organization.name}</div>
                        <div className="text-xs text-slate-500">{scan.project.name}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {scan.triggeredBy ? scan.triggeredBy.name : 'System'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-lg bg-slate-800/60 px-2 py-1 text-xs uppercase tracking-wide">
                          {scan.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {started ? formatDateTime(started) : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">{duration}</td>
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

      {selected ? (
        <Card className="border-slate-800/70 bg-slate-950/70">
          <CardHeader>
            <CardTitle className="text-slate-100">Manual scan details</CardTitle>
            <CardDescription className="text-slate-400">
              Task {selected.task.label} · {selected.status}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-300">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Organization</p>
                <p className="font-medium text-slate-200">{selected.organization.name}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Project</p>
                <p className="font-medium text-slate-200">{selected.project.name}</p>
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
            </div>
            <pre className="overflow-x-auto rounded-xl bg-slate-950/80 p-4 text-xs text-slate-200">
              {JSON.stringify(selected.summary ?? {}, null, 2)}
            </pre>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
