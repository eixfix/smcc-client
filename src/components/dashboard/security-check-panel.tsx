'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Button } from '@/src/components/ui/button';
import { Badge } from '@/src/components/ui/badge';
import type { OrganizationSummary, SecurityCheckResult } from '@/src/lib/api';
import { runSecurityCheck } from '@/src/lib/api';
import { CREDIT_COST_SECURITY_CHECK } from '@/src/lib/credit-costs';

export function SecurityCheckPanel({
  organizations
}: {
  organizations: OrganizationSummary[];
}) {
  const router = useRouter();
  const [organizationOptions, setOrganizationOptions] = useState<OrganizationSummary[]>(organizations);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(
    organizations[0]?.id ?? null
  );
  useEffect(() => {
    setOrganizationOptions(organizations);
    if (!organizations.some((org) => org.id === selectedOrganizationId)) {
      setSelectedOrganizationId(organizations[0]?.id ?? null);
    }
  }, [organizations, selectedOrganizationId]);

  const selectedOrganization = useMemo(() => {
    return organizationOptions.find((organization) => organization.id === selectedOrganizationId) ?? null;
  }, [organizationOptions, selectedOrganizationId]);

  const hasSufficientCredits = useMemo(() => {
    if (!selectedOrganization) {
      return false;
    }
    return selectedOrganization.credits >= CREDIT_COST_SECURITY_CHECK;
  }, [selectedOrganization]);

  const [url, setUrl] = useState('https://example.com');
  const [result, setResult] = useState<SecurityCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedOrganizationId) {
      setError('Select an organization to charge credits against.');
      return;
    }
    if (!hasSufficientCredits) {
      setError(`Insufficient credits. Security checks cost ${CREDIT_COST_SECURITY_CHECK} credits.`);
      return;
    }
    setError(null);
    setIsLoading(true);

    try {
      const payload = await runSecurityCheck(selectedOrganizationId, url.trim());
      setResult(payload);
      setOrganizationOptions((prev) =>
        prev.map((organization) =>
          organization.id === selectedOrganizationId
            ? { ...organization, credits: organization.credits - CREDIT_COST_SECURITY_CHECK }
            : organization
        )
      );
      router.refresh();
    } catch (err) {
      setResult(null);
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Inspect Endpoint</CardTitle>
          <CardDescription>
            Validate security headers, extract page metadata, and surface ownership hints for any HTTP(S) target.
            Cost: {CREDIT_COST_SECURITY_CHECK} credits.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="security-organization" className="text-xs uppercase tracking-wide text-slate-400">
                Organization
              </Label>
              <select
                id="security-organization"
                value={selectedOrganizationId ?? ''}
                onChange={(event) => setSelectedOrganizationId(event.target.value || null)}
                className="w-full rounded-lg border border-slate-800/70 bg-slate-950/70 px-3 py-2 text-sm text-slate-100"
              >
                {organizationOptions.map((organization) => (
                  <option key={organization.id} value={organization.id}>
                    {`${organization.name} (${organization.credits} credits)`}
                  </option>
                ))}
              </select>
              {selectedOrganization ? (
                <p className="text-xs text-slate-500">
                  Credits remaining: {selectedOrganization.credits}
                </p>
              ) : (
                <p className="text-xs text-warning">
                  No organizations available. Create one or request access before running checks.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="security-url" className="text-xs uppercase tracking-wide text-slate-400">
                Target URL
              </Label>
              <Input
                id="security-url"
                name="url"
                type="url"
                autoComplete="off"
                placeholder="https://your-service.com"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                required
              />
            </div>
            {error ? (
              <div className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
                {error}
              </div>
            ) : null}
            <Button
              type="submit"
              disabled={isLoading || !selectedOrganizationId || !hasSufficientCredits}
              className="w-full sm:w-auto"
            >
              {isLoading ? 'Running checks…' : 'Run security check'}
            </Button>
            {!hasSufficientCredits ? (
              <p className="text-xs text-warning">
                Insufficient credits. Security checks cost {CREDIT_COST_SECURITY_CHECK} credits.
              </p>
            ) : null}
          </form>
        </CardContent>
      </Card>

      {result ? (
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Summary</CardTitle>
              <CardDescription>
                {result.finalUrl} • HTTP {result.statusCode} • {new Date(result.fetchedAt).toLocaleString()}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-300">
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                <Badge variant={result.usesHttps ? 'success' : 'warning'}>
                  {result.usesHttps ? 'HTTPS enforced' : 'HTTP fallback'}
                </Badge>
                <Badge variant="default">Requested: {result.requestedUrl}</Badge>
                <Badge variant="default">Resolved: {result.finalUrl}</Badge>
              </div>
              {result.warnings.length > 0 ? (
                <div className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
                  <p className="font-semibold">Warnings</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {result.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-xs text-slate-500">No warnings. Endpoint meets baseline controls.</p>
              )}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-slate-800/70 bg-slate-900/60 p-4">
                  <h4 className="text-sm font-semibold text-slate-100">Metadata</h4>
                  <dl className="mt-2 space-y-1 text-xs text-slate-400">
                    <div>
                      <dt className="uppercase tracking-wide text-slate-500">Title</dt>
                      <dd className="text-slate-300">{result.metadata.title ?? '—'}</dd>
                    </div>
                    <div>
                      <dt className="uppercase tracking-wide text-slate-500">Description</dt>
                      <dd className="text-slate-300">{result.metadata.description ?? '—'}</dd>
                    </div>
                    <div>
                      <dt className="uppercase tracking-wide text-slate-500">OG Title</dt>
                      <dd className="text-slate-300">{result.metadata.openGraphTitle ?? '—'}</dd>
                    </div>
                    <div>
                      <dt className="uppercase tracking-wide text-slate-500">OG Site</dt>
                      <dd className="text-slate-300">{result.metadata.openGraphSiteName ?? '—'}</dd>
                    </div>
                  </dl>
                </div>
                <div className="rounded-lg border border-slate-800/70 bg-slate-900/60 p-4">
                  <h4 className="text-sm font-semibold text-slate-100">Ownership</h4>
                  {result.ownership ? (
                    <dl className="mt-2 space-y-1 text-xs text-slate-400">
                      <div>
                        <dt className="uppercase tracking-wide text-slate-500">Domain</dt>
                        <dd className="text-slate-300">{result.ownership.domain}</dd>
                      </div>
                      <div>
                        <dt className="uppercase tracking-wide text-slate-500">Primary NS</dt>
                        <dd className="text-slate-300">{result.ownership.primaryNameServer ?? '—'}</dd>
                      </div>
                      <div>
                        <dt className="uppercase tracking-wide text-slate-500">Responsible Email</dt>
                        <dd className="text-slate-300">{result.ownership.responsibleEmail ?? '—'}</dd>
                      </div>
                      <div>
                        <dt className="uppercase tracking-wide text-slate-500">Registry / WHOIS</dt>
                        <dd className="text-slate-300">{result.ownership.registry ?? '—'}</dd>
                      </div>
                      <div>
                        <dt className="uppercase tracking-wide text-slate-500">Registrar</dt>
                        <dd className="text-slate-300">
                          {result.ownership.registrarName ?? '—'}
                          {result.ownership.registrarEmail ? (
                            <span className="block text-[11px] text-slate-500">{result.ownership.registrarEmail}</span>
                          ) : null}
                        </dd>
                      </div>
                      <div>
                        <dt className="uppercase tracking-wide text-slate-500">Registrant</dt>
                        <dd className="text-slate-300">
                          {result.ownership.registrantName ?? '—'}
                          {result.ownership.registrantEmail ? (
                            <span className="block text-[11px] text-slate-500">{result.ownership.registrantEmail}</span>
                          ) : null}
                        </dd>
                      </div>
                      <div>
                        <dt className="uppercase tracking-wide text-slate-500">WHOIS Registrar</dt>
                        <dd className="text-slate-300">{result.ownership.whoisRegistrar ?? '—'}</dd>
                      </div>
                      <div>
                        <dt className="uppercase tracking-wide text-slate-500">WHOIS Registrant</dt>
                        <dd className="text-slate-300">{result.ownership.whoisRegistrant ?? '—'}</dd>
                      </div>
                    </dl>
                  ) : (
                    <p className="mt-2 text-xs text-slate-500">
                      Ownership details unavailable. Review the warnings above or provide a public domain.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Security Headers</CardTitle>
              <CardDescription>Must-have controls and their current status.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-slate-300">
              {result.securityHeaders.map((header) => (
                <div
                  key={header.header}
                  className="rounded-lg border border-slate-800/60 bg-slate-900/60 px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-100">{header.header}</p>
                    <Badge variant={header.present ? 'success' : 'danger'}>
                      {header.present ? 'Present' : 'Missing'}
                    </Badge>
                  </div>
                  <p className="mt-1 text-slate-400">
                    {header.value ? header.value : 'No value detected.'}
                  </p>
                  {!header.present ? (
                    <p className="mt-2 text-[11px] text-warning">{header.recommendation}</p>
                  ) : null}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>TLS Overview</CardTitle>
                <CardDescription>Certificate, cipher, and protocol details.</CardDescription>
              </div>
              {result.tls ? (
                <Badge variant={result.tls.isExpired ? 'danger' : 'success'}>
                  {result.tls.isExpired ? 'Expired' : 'Valid'}
                </Badge>
              ) : null}
            </CardHeader>
            <CardContent>
              {result.tls ? (
                <dl className="grid gap-4 text-xs text-slate-400 sm:grid-cols-2">
                  <div>
                    <dt className="uppercase tracking-wide text-slate-500">Protocol</dt>
                    <dd className="text-slate-300">{result.tls.protocol ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-wide text-slate-500">Cipher Suite</dt>
                    <dd className="text-slate-300">{result.tls.cipherSuite ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-wide text-slate-500">Issuer</dt>
                    <dd className="text-slate-300">{result.tls.issuer ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-wide text-slate-500">Subject</dt>
                    <dd className="text-slate-300">{result.tls.subject ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-wide text-slate-500">Valid From</dt>
                    <dd className="text-slate-300">
                      {result.tls.validFrom ? new Date(result.tls.validFrom).toLocaleString() : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-wide text-slate-500">Valid To</dt>
                    <dd className="text-slate-300">
                      {result.tls.validTo ? new Date(result.tls.validTo).toLocaleString() : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-wide text-slate-500">Days Remaining</dt>
                    <dd className="text-slate-300">
                      {typeof result.tls.daysUntilExpiry === 'number'
                        ? `${result.tls.daysUntilExpiry} days`
                        : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-wide text-slate-500">SANs</dt>
                    <dd className="text-slate-300">
                      {result.tls.subjectAlternativeNames.length > 0
                        ? result.tls.subjectAlternativeNames.join(', ')
                        : '—'}
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="text-xs text-slate-500">TLS inspection unavailable for this endpoint.</p>
              )}
              {result.tls?.authorizationError ? (
                <p className="mt-3 text-[11px] text-warning">
                  TLS validation issue: {result.tls.authorizationError}
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
