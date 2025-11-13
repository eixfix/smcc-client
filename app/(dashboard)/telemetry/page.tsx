import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { StatCard } from '@/src/components/dashboard/stat-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';
import { fetchServers } from '@/src/lib/api';
import type { ServerSummary, ServerTelemetrySnapshot } from '@/src/lib/api';

const STALE_THRESHOLD_MINUTES = Number(process.env.NEXT_PUBLIC_TELEMETRY_STALE_MINUTES ?? '15');
const CRITICAL_THRESHOLD = 90;
const WARNING_THRESHOLD = 80;

type TelemetryStatus = 'healthy' | 'warning' | 'critical' | 'offline';

type TelemetrySummary = {
  server: ServerSummary;
  telemetry: ServerTelemetrySnapshot | null;
  status: TelemetryStatus;
  reason?: string;
};

const relativeTimeFormatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
const timestampFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short'
});

const STATUS_META: Record<
  TelemetryStatus,
  { label: string; badgeClass: string; priority: number }
> = {
  healthy: {
    label: 'Healthy',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
    priority: 3
  },
  warning: {
    label: 'Warning',
    badgeClass: 'bg-amber-500/15 text-amber-200 border border-amber-500/30',
    priority: 2
  },
  critical: {
    label: 'Critical',
    badgeClass: 'bg-rose-500/15 text-rose-200 border border-rose-500/30',
    priority: 1
  },
  offline: {
    label: 'Offline',
    badgeClass: 'bg-slate-600/30 text-slate-200 border border-slate-600/40',
    priority: 2
  }
};

function formatPercent(value: number | null): string {
  if (value === null || Number.isNaN(value)) {
    return '—';
  }
  return `${Math.round(value)}%`;
}

function formatRelativeTimeLabel(dateInput: string | null, now: number): string {
  if (!dateInput) {
    return 'Awaiting telemetry';
  }
  const value = new Date(dateInput);
  if (Number.isNaN(value.getTime())) {
    return 'Unknown';
  }
  const diffMs = value.getTime() - now;
  const absMs = Math.abs(diffMs);

  if (absMs < 60_000) {
    return relativeTimeFormatter.format(Math.round(diffMs / 1000), 'second');
  }

  if (absMs < 3_600_000) {
    return relativeTimeFormatter.format(Math.round(diffMs / 60_000), 'minute');
  }

  if (absMs < 86_400_000) {
    return relativeTimeFormatter.format(Math.round(diffMs / 3_600_000), 'hour');
  }

  return relativeTimeFormatter.format(Math.round(diffMs / 86_400_000), 'day');
}

function formatTimestamp(dateInput: string | null): string {
  if (!dateInput) {
    return '—';
  }
  const value = new Date(dateInput);
  if (Number.isNaN(value.getTime())) {
    return '—';
  }
  return timestampFormatter.format(value);
}

function calcAverage(values: Array<number | null | undefined>): number | null {
  const filtered = values.filter(
    (value): value is number => typeof value === 'number' && Number.isFinite(value)
  );
  if (!filtered.length) {
    return null;
  }
  const sum = filtered.reduce((acc, value) => acc + value, 0);
  return sum / filtered.length;
}

function evaluateServerHealth(server: ServerSummary, now: number): TelemetrySummary {
  const telemetry = server.latestTelemetry;

  if (!telemetry) {
    return {
      server,
      telemetry,
      status: 'offline',
      reason: 'No telemetry reported yet.'
    };
  }

  const collectedAt = new Date(telemetry.collectedAt);
  const ageMinutes = (now - collectedAt.getTime()) / 60_000;

  if (!Number.isNaN(ageMinutes) && ageMinutes > STALE_THRESHOLD_MINUTES) {
    return {
      server,
      telemetry,
      status: 'warning',
      reason: `Last heartbeat ${Math.round(ageMinutes)}m ago`
    };
  }

  const metrics = [
    { label: 'CPU', value: telemetry.cpuPercent },
    { label: 'Memory', value: telemetry.memoryPercent },
    { label: 'Disk', value: telemetry.diskPercent }
  ];

  for (const metric of metrics) {
    if (typeof metric.value === 'number' && metric.value >= CRITICAL_THRESHOLD) {
      return {
        server,
        telemetry,
        status: 'critical',
        reason: `${metric.label} at ${Math.round(metric.value)}%`
      };
    }
  }

  for (const metric of metrics) {
    if (typeof metric.value === 'number' && metric.value >= WARNING_THRESHOLD) {
      return {
        server,
        telemetry,
        status: 'warning',
        reason: `${metric.label} at ${Math.round(metric.value)}%`
      };
    }
  }

  return {
    server,
    telemetry,
    status: 'healthy'
  };
}

export default async function TelemetryPage() {
  const token = cookies().get('lt_token')?.value;
  if (!token) {
    redirect('/login');
  }

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const servers = await fetchServers(apiBaseUrl, token);
  const now = Date.now();
  const telemetrySummaries = servers.map((server) => evaluateServerHealth(server, now));
  const reportingCount = telemetrySummaries.filter((summary) => summary.telemetry !== null).length;
  const healthyCount = telemetrySummaries.filter((summary) => summary.status === 'healthy').length;
  const alertSummaries = telemetrySummaries.filter(
    (summary) =>
      summary.status === 'critical' ||
      summary.status === 'warning' ||
      summary.status === 'offline'
  );

  const averageCpu = calcAverage(
    telemetrySummaries.map((summary) => summary.telemetry?.cpuPercent ?? null)
  );
  const averageMemory = calcAverage(
    telemetrySummaries.map((summary) => summary.telemetry?.memoryPercent ?? null)
  );
  const averageDisk = calcAverage(
    telemetrySummaries.map((summary) => summary.telemetry?.diskPercent ?? null)
  );

  const sortedTelemetry = [...telemetrySummaries].sort((a, b) => {
    const rankDiff = STATUS_META[a.status].priority - STATUS_META[b.status].priority;
    if (rankDiff !== 0) {
      return rankDiff;
    }
    return a.server.name.localeCompare(b.server.name);
  });

  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Servers"
          description="Provisioned for monitoring"
          value={servers.length.toString()}
        />
        <StatCard
          title="Reporting Agents"
          description="Heartbeat received this cycle"
          value={reportingCount.toString()}
        />
        <StatCard
          title="Healthy Agents"
          description="Within safe operating ranges"
          value={healthyCount.toString()}
        />
        <StatCard
          title="Active Alerts"
          description="Warning, critical, or offline agents"
          value={alertSummaries.length.toString()}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="border-slate-800/70 bg-slate-950/60">
          <CardHeader>
            <CardTitle className="text-slate-100">Average CPU</CardTitle>
            <CardDescription>Across reporting agents</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-slate-50">{formatPercent(averageCpu)}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-800/70 bg-slate-950/60">
          <CardHeader>
            <CardTitle className="text-slate-100">Average Memory</CardTitle>
            <CardDescription>Snapshot of committed RAM</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-slate-50">{formatPercent(averageMemory)}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-800/70 bg-slate-950/60">
          <CardHeader>
            <CardTitle className="text-slate-100">Average Disk</CardTitle>
            <CardDescription>Root volume utilization</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-slate-50">{formatPercent(averageDisk)}</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="border-slate-800/70 bg-slate-950/60 shadow-lg">
          <CardHeader>
            <CardTitle className="text-slate-100">Health Alerts</CardTitle>
            <CardDescription className="text-slate-400">
              Servers requiring immediate investigation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {alertSummaries.length === 0 ? (
              <p className="text-sm text-slate-400">
                All monitored servers are within healthy thresholds.
              </p>
            ) : (
              alertSummaries.slice(0, 6).map((summary) => {
                const meta = STATUS_META[summary.status];
                return (
                  <div
                    key={summary.server.id}
                    className="rounded-2xl border border-slate-800/60 bg-slate-900/50 p-4 shadow-inner"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-100">{summary.server.name}</p>
                        <p className="text-xs text-slate-500">
                          {summary.server.hostname ?? summary.server.allowedIp ?? 'Hostname pending'}
                        </p>
                      </div>
                      <Badge className={meta.badgeClass}>{meta.label}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-slate-300">
                      {summary.reason ?? 'Operating within expected parameters.'}
                    </p>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
        <Card className="border-slate-800/70 bg-slate-950/60 shadow-lg">
          <CardHeader>
            <CardTitle className="text-slate-100">Fleet Activity</CardTitle>
            <CardDescription className="text-slate-400">
              Rolling status of each monitored server.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-800 text-sm">
                <thead className="bg-slate-900/60 text-slate-400">
                  <tr>
                    <th className="px-4 py-3 text-left">Server</th>
                    <th className="px-4 py-3 text-left">CPU</th>
                    <th className="px-4 py-3 text-left">Memory</th>
                    <th className="px-4 py-3 text-left">Disk</th>
                    <th className="px-4 py-3 text-left">Last Update</th>
                    <th className="px-4 py-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-200">
                  {sortedTelemetry.map((summary) => {
                    const telemetry = summary.telemetry;
                    const meta = STATUS_META[summary.status];
                    return (
                      <tr key={summary.server.id} className="hover:bg-slate-900/40">
                        <td className="px-4 py-3">
                          <div className="font-semibold">{summary.server.name}</div>
                          <div className="text-xs text-slate-500">
                            {summary.server.hostname ?? summary.server.allowedIp ?? 'Hostname pending'}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-semibold">{formatPercent(telemetry?.cpuPercent ?? null)}</td>
                        <td className="px-4 py-3 font-semibold">{formatPercent(telemetry?.memoryPercent ?? null)}</td>
                        <td className="px-4 py-3 font-semibold">{formatPercent(telemetry?.diskPercent ?? null)}</td>
                        <td className="px-4 py-3 text-xs text-slate-400">
                          {formatRelativeTimeLabel(telemetry?.collectedAt ?? null, now)}
                          <div className="text-[10px] text-slate-500">
                            {formatTimestamp(telemetry?.collectedAt ?? null)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${meta.badgeClass}`}>
                            {meta.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="text-right">
              <Link
                href="/servers"
                className="text-sm font-semibold text-accent-soft hover:text-accent-strong"
              >
                Manage servers &rarr;
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
