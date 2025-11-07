import { cookies } from 'next/headers';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';
import { DownloadReportButton } from '@/src/components/dashboard/download-report-button';
import { fetchRecentReports } from '@/src/lib/api';

const statusVariantMap: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  completed: 'success',
  failed: 'danger'
};

type ReportSummary = {
  scenario?: {
    mode?: string;
    totalRequests?: number;
  };
  metrics?: {
    averageMs?: number;
    minMs?: number;
    maxMs?: number;
    p95Ms?: number;
    successRate?: number;
  };
  results?: {
    totalRequests?: number;
    successCount?: number;
    failureCount?: number;
  };
  request?: {
    method?: string;
    headers?: Record<string, string>;
    hasPayload?: boolean;
  };
  raw?: Record<string, unknown>;
};

function formatMode(mode?: string): string {
  if (!mode) {
    return '—';
  }
  return mode.charAt(0).toUpperCase() + mode.slice(1).toLowerCase();
}

function formatMetric(value?: number): string {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '—';
  }
  return `${value.toFixed(2)} ms`;
}

export default async function ReportsPage() {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const token = cookies().get('lt_token')?.value;
  const reports = await fetchRecentReports(apiBaseUrl, token);

  const aggregate = (() => {
    if (reports.length === 0) {
      return null;
    }

    let successCount = 0;
    let failureCount = 0;
    const modeCounts: Record<string, number> = {};
    let totalAvg = 0;
    let totalP95 = 0;
    let latencySamples = 0;

    reports.forEach((report) => {
      if (report.status.toLowerCase() === 'completed') {
        successCount += 1;
      } else {
        failureCount += 1;
      }

      const mode = report.summaryJson?.scenario?.mode ?? report.task.label;
      if (mode) {
        modeCounts[mode] = (modeCounts[mode] ?? 0) + 1;
      }

      if (typeof report.summaryJson?.metrics?.averageMs === 'number') {
        totalAvg += report.summaryJson.metrics.averageMs;
        latencySamples += 1;
      }

      if (typeof report.summaryJson?.metrics?.p95Ms === 'number') {
        totalP95 += report.summaryJson.metrics.p95Ms;
      }
    });

    const overallCount = reports.length;
    const successRate = (successCount / overallCount) * 100;
    const topMode = Object.entries(modeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';

    const averageLatency = latencySamples ? totalAvg / latencySamples : null;
    const averageP95 = latencySamples ? totalP95 / latencySamples : null;

    let recommendation = 'Healthy baseline; continue to monitor trending latency.';
    if (successRate < 95) {
      recommendation = 'Elevated failure rate detected; prioritize investigating degraded tasks.';
    } else if (averageP95 && averageP95 > 1200) {
      recommendation = 'High P95 latency suggests capacity issues; consider scaling or tuning scenarios.';
    }

    return {
      overallCount,
      successRate,
      topMode,
      averageLatency,
      averageP95,
      recommendation
    };
  })();

  return (
    <div className="space-y-6 max-h-[calc(100vh-12rem)] overflow-y-auto pr-1 sm:pr-2">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-semibold text-slate-100">Reports</h2>
        <p className="text-sm text-slate-400">
          Review the latest load-test executions across your organizations. Drill into the metrics and
          pull detail snapshots for stakeholders.
        </p>
      </div>

      <Card className="shadow-card">
        <CardHeader className="sm:flex sm:items-center sm:justify-between">
          <div>
            <CardTitle>Recent Task Runs</CardTitle>
            <CardDescription>
              Last 25 executions across your accessible organizations. Filtered to your membership.
            </CardDescription>
          </div>
          <DownloadReportButton />
        </CardHeader>
        <CardContent className="space-y-4">
          {aggregate ? (
            <div className="grid gap-4 rounded-xl border border-slate-800/70 bg-surface-subtle/60 p-5 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Runs analysed</p>
                <p className="text-lg font-semibold text-slate-100">{aggregate.overallCount}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Success rate</p>
                <p className="text-lg font-semibold text-slate-100">{aggregate.successRate.toFixed(2)}%</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Dominant mode</p>
                <p className="text-lg font-semibold text-slate-100">{formatMode(aggregate.topMode)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Avg latency (P95)</p>
                <p className="text-lg font-semibold text-slate-100">
                  {aggregate.averageP95 ? formatMetric(aggregate.averageP95) : '—'}
                </p>
              </div>
              <div className="sm:col-span-2 lg:col-span-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Prediction & insight</p>
                <p className="text-sm text-slate-300">{aggregate.recommendation}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Avg latency</p>
                <p className="text-lg font-semibold text-slate-100">
                  {aggregate.averageLatency ? formatMetric(aggregate.averageLatency) : '—'}
                </p>
              </div>
            </div>
          ) : null}
          {reports.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-700/70 bg-surface-muted/40 px-5 py-6 text-sm text-slate-400">
              No task runs yet. Launch a scenario from the Projects tab to see detail here.
            </div>
          ) : (
            reports.map((report) => {
              const organization = report.task.project.organization;
              const summary = (report.summaryJson as ReportSummary | undefined) ?? {};
              const mode = summary.scenario?.mode ?? report.task.label;
              const metrics = summary.metrics;
              const results = summary.results;
              const requestInfo = summary.request;
              const method = (requestInfo?.method ?? report.task.method ?? 'GET').toUpperCase();
              const headerCount =
                requestInfo?.headers && typeof requestInfo.headers === 'object'
                  ? Object.keys(requestInfo.headers).length
                  : 0;
              const badgeVariant =
                statusVariantMap[report.status.toLowerCase()] ?? 'default';

              return (
                <div
                  key={report.id}
                  className="rounded-xl border border-slate-800/70 bg-surface-subtle/60 px-5 py-4 space-y-3"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-100">
                        {report.task.label}{' '}
                        <span className="text-xs font-normal text-slate-500">
                          • {report.task.project.name} ({organization.name})
                        </span>
                      </p>
                      <p className="text-xs text-slate-500">
                        Started {new Date(report.startedAt).toLocaleString()}
                        {report.completedAt
                          ? ` • Finished ${new Date(report.completedAt).toLocaleString()}`
                          : ''}
                      </p>
                    </div>
                    <Badge variant={badgeVariant}>{report.status.toUpperCase()}</Badge>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-xs text-slate-300">
                    <div className="rounded-lg border border-slate-800/60 bg-slate-900/60 px-4 py-3">
                      <p className="font-semibold text-slate-200">Scenario</p>
                      <p className="mt-1">Mode: {formatMode(mode)}</p>
                      <p>Total Requests: {results?.totalRequests ?? '—'}</p>
                      <p>Method: {method}</p>
                    </div>
                    <div className="rounded-lg border border-slate-800/60 bg-slate-900/60 px-4 py-3">
                      <p className="font-semibold text-slate-200">Latency</p>
                      <p className="mt-1">Avg: {formatMetric(metrics?.averageMs)}</p>
                      <p>P95: {formatMetric(metrics?.p95Ms)}</p>
                    </div>
                    <div className="rounded-lg border border-slate-800/60 bg-slate-900/60 px-4 py-3">
                      <p className="font-semibold text-slate-200">Result</p>
                      <p className="mt-1">Success: {results?.successCount ?? '—'}</p>
                      <p>Failures: {results?.failureCount ?? '—'}</p>
                      <p>
                        Success rate:{' '}
                        {typeof metrics?.successRate === 'number'
                          ? `${metrics.successRate.toFixed(2)}%`
                          : '—'}
                      </p>
                      <p>Headers: {headerCount}</p>
                      <p>Payload: {requestInfo?.hasPayload ? 'Yes' : 'No'}</p>
                    </div>
                  </div>

                  {report.summaryJson?.raw ? (
                    <details className="text-[11px] text-slate-400">
                      <summary className="cursor-pointer">View raw k6 export</summary>
                      <pre className="mt-2 max-h-48 overflow-auto rounded-lg border border-slate-800/60 bg-black/40 p-3 text-[10px] text-slate-200">
                        {JSON.stringify(report.summaryJson.raw, null, 2)}
                      </pre>
                    </details>
                  ) : null}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
