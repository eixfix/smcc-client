import { cookies } from 'next/headers';

import { StatCard } from '@/src/components/dashboard/stat-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';
import type { TaskReportActivity } from '@/src/lib/api';
import { fetchLatencyAnomalies, fetchOrganizations, fetchRecentReports } from '@/src/lib/api';

type SnapshotDelta = {
  value: string;
  intent: 'up' | 'down' | 'steady';
};

type SnapshotMetric = {
  value: string;
  delta?: SnapshotDelta;
};

const PERFORMANCE_SAMPLE_SIZE = 10;

type SnapshotOptions = {
  unit: 'ms' | '%';
  fractionDigits: number;
  invertDelta?: boolean;
};

export function buildPerformanceSnapshot(
  reports: TaskReportActivity[]
): { latency: SnapshotMetric; successRate: SnapshotMetric } {
  const latencies: number[] = [];
  const successRates: number[] = [];

  for (const report of reports) {
    const metrics = report.summaryJson?.metrics;
    let successRecorded = false;
    if (metrics && typeof metrics === 'object') {
      const latency =
        typeof metrics.p95Ms === 'number'
          ? metrics.p95Ms
          : typeof metrics.averageMs === 'number'
            ? metrics.averageMs
            : null;
      if (typeof latency === 'number' && Number.isFinite(latency)) {
        latencies.push(latency);
      }
      if (typeof metrics.successRate === 'number' && Number.isFinite(metrics.successRate)) {
        successRates.push(metrics.successRate);
        successRecorded = true;
      }
    }

    if (
      !successRecorded &&
      successRates.length < PERFORMANCE_SAMPLE_SIZE &&
      report.summaryJson?.results &&
      typeof report.summaryJson.results === 'object'
    ) {
      const results = report.summaryJson.results;
      const successCount =
        typeof results.successCount === 'number' ? results.successCount : undefined;
      const failureCount =
        typeof results.failureCount === 'number' ? results.failureCount : undefined;
      const totalRequests =
        typeof results.totalRequests === 'number'
          ? results.totalRequests
          : typeof successCount === 'number' && typeof failureCount === 'number'
            ? successCount + failureCount
            : undefined;

      if (
        typeof totalRequests === 'number' &&
        totalRequests > 0 &&
        typeof successCount === 'number'
      ) {
        const derivedRate = (successCount / totalRequests) * 100;
        successRates.push(derivedRate);
      }
    }

    if (
      latencies.length >= PERFORMANCE_SAMPLE_SIZE &&
      successRates.length >= PERFORMANCE_SAMPLE_SIZE
    ) {
      break;
    }
  }

  return {
    latency: computeSnapshotMetric(latencies, {
      unit: 'ms',
      fractionDigits: 0,
      invertDelta: true
    }),
    successRate: computeSnapshotMetric(successRates, {
      unit: '%',
      fractionDigits: 1
    })
  };
}

function computeSnapshotMetric(values: number[], options: SnapshotOptions): SnapshotMetric {
  const sample = values.slice(0, PERFORMANCE_SAMPLE_SIZE);
  if (sample.length === 0) {
    return { value: '—' };
  }

  const avg = average(sample);
  if (avg === null) {
    return { value: '—' };
  }

  const formattedValue = formatMetricValue(avg, options.unit, options.fractionDigits);

  if (sample.length === 1) {
    return { value: formattedValue };
  }

  const trailingAvg = average(sample.slice(1));
  if (trailingAvg === null) {
    return { value: formattedValue };
  }

  const deltaRaw = sample[0] - trailingAvg;
  const intent: SnapshotDelta['intent'] =
    Math.abs(deltaRaw) < Number.EPSILON
      ? 'steady'
      : options.invertDelta
        ? deltaRaw < 0
          ? 'up'
          : 'down'
        : deltaRaw > 0
          ? 'up'
          : 'down';

  const deltaValue = formatMetricValue(deltaRaw, options.unit, options.fractionDigits, true);

  return {
    value: formattedValue,
    delta: {
      value: deltaValue,
      intent
    }
  };
}

function average(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  const sum = values.reduce((acc, value) => acc + value, 0);
  return sum / values.length;
}

function formatMetricValue(
  value: number,
  unit: SnapshotOptions['unit'],
  fractionDigits: number,
  includeSign = false
): string {
  const sign = includeSign
    ? value > 0
      ? '+'
      : value < 0
        ? '−'
        : ''
    : '';
  const magnitude = Math.abs(value);
  return `${sign}${magnitude.toFixed(fractionDigits)} ${unit}`;
}

export default async function OverviewPage() {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const token = cookies().get('lt_token')?.value;
  const [organizations, anomalies, recentReports] = await Promise.all([
    fetchOrganizations(apiBaseUrl, token),
    fetchLatencyAnomalies(apiBaseUrl, token),
    fetchRecentReports(apiBaseUrl, token)
  ]);

  const totalProjects = organizations.reduce((acc, org) => acc + org.projectCount, 0);
  const performanceSnapshot = buildPerformanceSnapshot(recentReports);

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <header className="space-y-1">
          <h3 className="text-lg font-semibold text-slate-100">Operational Footprint</h3>
          <p className="text-sm text-slate-400">
            High-level metrics showing portfolio breadth and coverage.
          </p>
        </header>
        <div className="grid gap-6 md:grid-cols-2">
          <StatCard
            title="Organizations"
            description="Active teams orchestrating load tests"
            value={organizations.length.toString().padStart(2, '0')}
            delta={{ value: '+3 MoM', intent: 'up' }}
          />
          <StatCard
            title="Projects"
            description="Test suites monitored across environments"
            value={totalProjects.toString().padStart(2, '0')}
            delta={{ value: '+12%', intent: 'up' }}
          />
        </div>
      </section>

      <section className="space-y-4">
        <header className="space-y-1">
          <h3 className="text-lg font-semibold text-slate-100">Performance Snapshot</h3>
          <p className="text-sm text-slate-400">
            Recent execution performance and reliability at a glance.
          </p>
        </header>
        <div className="grid gap-6 md:grid-cols-2">
          <StatCard
            title="Avg. Response"
            description="95th percentile across last 10 runs"
            value={performanceSnapshot.latency.value}
            delta={performanceSnapshot.latency.delta}
          />
          <StatCard
            title="Success Rate"
            description="Requests served without degradation"
            value={performanceSnapshot.successRate.value}
            delta={performanceSnapshot.successRate.delta}
          />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Active Organizations</CardTitle>
            <CardDescription>
              Snapshots of the orgs currently executing load campaigns.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {organizations.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-700/70 bg-surface-muted/40 px-6 py-12 text-center">
                <p className="text-sm font-medium text-slate-300">No organizations yet</p>
                <p className="mt-1 text-xs text-slate-500">
                  Create one via the API to see it reflected here instantly.
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {organizations.map((organization) => (
                  <li
                    key={organization.id}
                    className="flex items-center justify-between rounded-lg border border-slate-800/70 bg-surface-subtle/60 px-4 py-4"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-100">{organization.name}</p>
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        {organization.slug}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center sm:gap-3">
                      <Badge variant="default" className="bg-accent-strong/15 text-accent-soft">
                        {organization.projectCount} Projects
                      </Badge>
                      <Badge variant="default" className="bg-slate-800/70 text-slate-200">
                        {organization.credits} credits
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Anomaly Watch</CardTitle>
            <CardDescription>
              Highlighted runs where latency deviates materially from historical baselines.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {anomalies.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-700/70 bg-surface-muted/40 px-6 py-8 text-center">
                <p className="text-sm font-medium text-slate-300">No latency anomalies detected</p>
                <p className="mt-1 text-xs text-slate-500">
                  Runs are performing within {`±`}2.25σ of their historical baseline.
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {anomalies.map((anomaly) => {
                  const startedLabel = new Date(anomaly.startedAt).toLocaleString();
                  return (
                    <li
                      key={anomaly.reportId}
                      className="flex flex-col gap-2 rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger sm:flex-row sm:items-center sm:gap-4"
                    >
                      <div className="flex-1">
                        <p className="font-semibold text-danger">{anomaly.taskLabel}</p>
                        <p className="text-xs text-danger/80">
                          {anomaly.organizationName} · {anomaly.projectName}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-danger/80">
                        <span>
                          p95 {anomaly.value} ms · baseline {anomaly.baselineMean} ms (
                          {anomaly.zScore}σ)
                        </span>
                        {anomaly.successRate !== null ? (
                          <span>Success {anomaly.successRate}%</span>
                        ) : null}
                        <span>{startedLabel}</span>
                        <Badge variant="danger" className="uppercase">
                          anomalous
                        </Badge>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
