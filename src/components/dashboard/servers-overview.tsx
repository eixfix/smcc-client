'use client';

import { Fragment, useMemo, useState, useTransition } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

import { Badge } from '@/src/components/ui/badge';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { StatCard } from '@/src/components/dashboard/stat-card';
import type { OrganizationSummary, ServerSummary } from '@/src/lib/api';

interface ServersOverviewProps {
  servers: ServerSummary[];
  organizations: OrganizationSummary[];
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.loadtest.dev';

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: '2-digit'
});

function formatDate(dateInput: string | null): string {
  if (!dateInput) {
    return '—';
  }

  const value = new Date(dateInput);

  if (Number.isNaN(value.getTime())) {
    return '—';
  }

  return dateFormatter.format(value);
}

type AgentCredentials = {
  accessKey: string;
  secret: string;
};

type CredentialsMap = Record<string, AgentCredentials | undefined>;
type InstallCommand = {
  command: string;
  expiresInMinutes: number;
  fetchedAt: number;
};
type InstallCommandMap = Record<string, InstallCommand | undefined>;

type ErrorMap = Record<string, string | undefined>;
type InstallErrorMap = Record<string, string | undefined>;

type ServerFormState = {
  organizationId: string;
  name: string;
  hostname: string;
  allowedIp: string;
  description: string;
};

const INITIAL_FORM_STATE: ServerFormState = {
  organizationId: '',
  name: '',
  hostname: '',
  allowedIp: '',
  description: ''
};

export function ServersOverview({ servers, organizations }: ServersOverviewProps) {
  const router = useRouter();
  const [credentials, setCredentials] = useState<CredentialsMap>({});
  const [errors, setErrors] = useState<ErrorMap>({});
  const [pendingServerId, setPendingServerId] = useState<string | null>(null);
  const [installCommands, setInstallCommands] = useState<InstallCommandMap>({});
  const [installErrors, setInstallErrors] = useState<InstallErrorMap>({});
  const [installPendingServerId, setInstallPendingServerId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [isCreatingServer, setCreatingServer] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [formState, setFormState] = useState<ServerFormState>(INITIAL_FORM_STATE);

  const totalServers = servers.length;
  const suspendedServers = servers.filter((server) => server.isSuspended).length;
  const organizationsImpacted = servers.filter((server) => Boolean(server.organization.scanSuspendedAt)).length;
  const uniqueOrganizations = new Set(servers.map((server) => server.organization.id)).size;

  const sortedOrganizations = useMemo(
    () =>
      [...organizations].sort((a, b) => a.name.localeCompare(b.name)),
    [organizations]
  );

  const handleCreateAgent = (serverId: string) => {
    setPendingServerId(serverId);
    startTransition(async () => {
      setErrors((prev) => ({ ...prev, [serverId]: undefined }));

      try {
        const response = await fetch(`/api/servers/${serverId}/agents`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(payload.error ?? 'Failed to create agent.');
        }

        const data = (await response.json()) as {
          credentials?: AgentCredentials;
        };

        if (!data.credentials) {
          throw new Error('Agent credentials were not returned.');
        }

        setCredentials((prev) => ({
          ...prev,
          [serverId]: data.credentials
        }));
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred while creating the agent.';
        setErrors((prev) => ({
          ...prev,
          [serverId]: message
        }));
      } finally {
        setPendingServerId(null);
      }
    });
  };

  const handleGenerateInstallCommand = (serverId: string) => {
    setInstallPendingServerId(serverId);
    setInstallErrors((prev) => ({ ...prev, [serverId]: undefined }));

    void (async () => {
      try {
        const response = await fetch(`/api/servers/${serverId}/install-link`, {
          method: 'POST'
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(payload.error ?? 'Failed to generate install command.');
        }

        const data = (await response.json()) as {
          command?: string;
          expiresInMinutes?: number;
        };

        if (!data.command || !data.expiresInMinutes) {
          throw new Error('Install command response was incomplete.');
        }

        const command = data.command as string;
        const expiresInMinutes = data.expiresInMinutes as number;

        setInstallCommands((prev) => ({
          ...prev,
          [serverId]: {
            command,
            expiresInMinutes,
            fetchedAt: Date.now()
          }
        }));
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred while generating the install command.';
        setInstallErrors((prev) => ({
          ...prev,
          [serverId]: message
        }));
      } finally {
        setInstallPendingServerId(null);
      }
    })();
  };

  const resetForm = () => {
    setFormState(INITIAL_FORM_STATE);
    setCreateError(null);
  };

  const handleFormFieldChange = (field: keyof ServerFormState) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormState((prev) => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handleCreateServer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formState.organizationId || !formState.name.trim()) {
      setCreateError('Organization and server name are required.');
      return;
    }

    if (!formState.allowedIp.trim()) {
      setCreateError('Server IP address is required.');
      return;
    }

    setCreatingServer(true);
    setCreateError(null);

    try {
      const response = await fetch('/api/servers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          organizationId: formState.organizationId,
          name: formState.name.trim(),
          hostname: formState.hostname.trim() || undefined,
          allowedIp: formState.allowedIp.trim(),
          description: formState.description.trim() || undefined
        })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? 'Failed to register server.');
      }

      resetForm();
      setCreateOpen(false);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'An unexpected error occurred while registering the server.';
      setCreateError(message);
    } finally {
      setCreatingServer(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-3xl border border-slate-800/70 bg-slate-950/50 p-5 shadow-[0_45px_120px_-90px_rgba(15,118,110,0.45)] backdrop-blur-xl">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-slate-100">Register a new server</h3>
            <p className="text-sm text-slate-400">
              Servers must belong to an organization you manage. After registration, mint an agent token to bootstrap the host.
            </p>
          </div>
          <Button variant="primary" className="w-full md:w-auto" onClick={() => setCreateOpen((value) => !value)}>
            {isCreateOpen ? 'Close form' : 'Register Server'}
          </Button>
        </div>
        {isCreateOpen ? (
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleCreateServer}
        >
            <div className="space-y-2 md:col-span-1">
              <Label htmlFor="server-organization">Organization</Label>
              <select
                id="server-organization"
                name="organizationId"
                className="w-full rounded-md border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:border-accent-soft focus:outline-none"
                value={formState.organizationId}
                onChange={handleFormFieldChange('organizationId')}
                required
              >
                <option value="" disabled>
                  Select organization…
                </option>
                {sortedOrganizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name} · {org.credits} credits
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2 md:col-span-1">
              <Label htmlFor="server-name">Server name</Label>
              <Input
                id="server-name"
                name="name"
                placeholder="Primary staging node"
                value={formState.name}
                onChange={handleFormFieldChange('name')}
                required
              />
            </div>
            <div className="space-y-2 md:col-span-1">
              <Label htmlFor="server-hostname">Hostname (optional)</Label>
              <Input
                id="server-hostname"
                name="hostname"
                placeholder="staging01.internal"
                value={formState.hostname}
                onChange={handleFormFieldChange('hostname')}
              />
            </div>
            <div className="space-y-2 md:col-span-1">
              <Label htmlFor="server-ip">Allowed server IP</Label>
              <Input
                id="server-ip"
                name="allowedIp"
                placeholder="203.0.113.42"
                value={formState.allowedIp}
                onChange={handleFormFieldChange('allowedIp')}
                required
              />
              <p className="text-xs text-slate-500">
                Only requests originating from this IP will be accepted by the agent endpoints.
              </p>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="server-description">Description (optional)</Label>
              <textarea
                id="server-description"
                name="description"
                placeholder="Kubernetes worker node in the staging cluster."
                className="min-h-[90px] w-full rounded-md border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:border-accent-soft focus:outline-none"
                value={formState.description}
                onChange={handleFormFieldChange('description')}
              />
            </div>
            {createError ? (
              <p className="md:col-span-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                {createError}
              </p>
            ) : null}
            <div className="md:col-span-2 flex flex-col gap-3 md:flex-row md:items-center md:justify-end">
              <Button
                type="submit"
                disabled={isCreatingServer}
                className="w-full md:w-auto"
              >
                {isCreatingServer ? 'Registering…' : 'Save server'}
              </Button>
            </div>
          </form>
        ) : null}
      </div>

      <Card className="border-slate-800/70 bg-slate-950/60">
        <CardHeader>
          <CardTitle className="text-slate-100">Agent installation guide</CardTitle>
          <CardDescription className="text-slate-400">
            Generate a short-lived install command from the desired server card below. These steps target Ubuntu/Debian hosts with sudo access.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-300">
          <ol className="space-y-3 pl-4">
            <li className="list-decimal">
              Generate the install command from the server card and run it from the registered IP address. Commands expire after 1 hour by default.
            </li>
            <li className="list-decimal">
              Encrypt the agent config with your credentials (recommended):
              <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-900/80 p-3 text-xs text-accent-soft">{`sudo loadtest-agent config --server-id <server-id> --access-key <access-key> --secret <secret> --api-url ${API_BASE_URL}`}</pre>
              This command rewrites the encrypted JSON config at <code>/etc/loadtest-agent/config.yaml</code>. If you prefer to edit manually, provide the same fields (server id, access key, secret, API URL) in that file before restarting the service.
            </li>
            <li className="list-decimal">
              Restart the service and confirm it is running:
              <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-950/80 p-3 text-xs text-accent-soft">{`sudo systemctl restart loadtest-agent && sudo systemctl status loadtest-agent`}</pre>
            </li>
          </ol>
          <p className="text-xs text-slate-500">
            <code>AGENT_INSTALL_DIR</code> defines where the API writes the agent bundle (default <code>$HOME/loadtest-agent</code>). Override it in the API environment if your hosts need a different path. Need more detail? Check <code>docs/server-agent-plan.md</code> for architecture notes and troubleshooting.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Registered Servers"
          description="Hosts monitored by the command center"
          value={totalServers.toString()}
        />
        <StatCard
          title="Suspended Servers"
          description="Hosts paused due to manual or credit actions"
          value={suspendedServers.toString()}
        />
        <StatCard
          title="Orgs with Scan Suspension"
          description="Organizations blocked from agent activity"
          value={organizationsImpacted.toString()}
        />
        <StatCard
          title="Active Organizations"
          description="Unique orgs represented across servers"
          value={uniqueOrganizations.toString()}
        />
      </div>

      <div className="space-y-4">
        {servers.length === 0 ? (
          <Card className="border-dashed border-slate-800 bg-slate-950/60">
            <CardHeader>
              <CardTitle className="text-slate-200">No servers yet</CardTitle>
              <CardDescription className="text-slate-400">
                Provision a server from the API or the form above to start orchestrating scan jobs and telemetry ingestion.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          servers.map((server) => {
            const org = server.organization;
            const isOrgSuspended = Boolean(org.scanSuspendedAt);
            const statusLabel = server.isSuspended
              ? 'Server suspended'
              : isOrgSuspended
                ? 'Org suspended'
                : 'Active';
            const statusIntent = server.isSuspended || isOrgSuspended ? 'warning' : 'success';
            const serverCredentials = credentials[server.id];
            const errorMessage = errors[server.id];
            const installCommand = installCommands[server.id];
            const installError = installErrors[server.id];
            const isServerPending = isPending && pendingServerId === server.id;
            const isInstallPending = installPendingServerId === server.id;

            return (
              <Card
                key={server.id}
                className="border-slate-800/80 bg-slate-950/50 shadow-[0_40px_120px_-90px_rgba(15,118,110,0.45)] backdrop-blur-xl"
              >
                <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <CardTitle className="text-slate-100">{server.name}</CardTitle>
                    <CardDescription className="text-slate-400">
                      {server.hostname ?? 'Hostname pending'}
                    </CardDescription>
                  </div>
                  <Badge
                    variant="default"
                    className={
                      statusIntent === 'success'
                        ? 'bg-emerald-500/10 text-emerald-300'
                        : 'bg-amber-500/10 text-amber-200'
                    }
                  >
                    {statusLabel}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-slate-300">
                  <p className="text-xs text-slate-500">
                    Allowed IP: <span className="font-mono text-slate-200">{server.allowedIp ?? 'Not set'}</span>
                  </p>
                  <Button
                    variant="primary"
                    className="w-full md:w-auto"
                    onClick={() => handleCreateAgent(server.id)}
                    disabled={isServerPending}
                  >
                    {isServerPending ? 'Creating agent…' : 'Create Agent Token'}
                  </Button>
                  <Button
                    variant="secondary"
                    className="w-full md:w-auto"
                    onClick={() => handleGenerateInstallCommand(server.id)}
                    disabled={isInstallPending}
                  >
                    {isInstallPending ? 'Preparing command…' : 'Generate Install Command'}
                  </Button>
                  <p className="text-xs text-slate-500">
                    This action revokes previous agent credentials and displays the new secret once.
                  </p>
                  {errorMessage ? (
                    <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                      {errorMessage}
                    </p>
                  ) : null}
                  {installError ? (
                    <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                      {installError}
                    </p>
                  ) : null}
                  {serverCredentials ? (
                    <div className="space-y-2 rounded-xl border border-accent-strong/30 bg-accent-strong/10 p-3 text-xs">
                      <p className="font-semibold text-accent-soft">
                        Agent credentials for this server · shown only once. Store them in your secrets manager immediately.
                      </p>
                      <div className="grid gap-2 md:grid-cols-2">
                        <div>
                          <p className="uppercase tracking-wide text-[11px] text-accent-soft/70">Access key</p>
                          <pre className="mt-1 select-all overflow-x-auto rounded-lg bg-slate-950/80 p-2 text-[11px] text-accent-soft">
                            {serverCredentials.accessKey}
                          </pre>
                        </div>
                        <div>
                          <p className="uppercase tracking-wide text-[11px] text-accent-soft/70">Secret</p>
                          <pre className="mt-1 select-all overflow-x-auto rounded-lg bg-slate-950/80 p-2 text-[11px] text-amber-200">
                            {serverCredentials.secret}
                          </pre>
                        </div>
                      </div>
                    </div>
                  ) : null}
                  {installCommand ? (
                    <div className="space-y-2 rounded-xl border border-slate-700/70 bg-slate-950/60 p-3 text-xs">
                      <p className="font-semibold text-slate-200">
                        Install command · valid for approximately {installCommand.expiresInMinutes} minutes
                      </p>
                      <pre className="overflow-x-auto rounded-lg bg-slate-900/80 p-3 text-accent-soft">
                        {installCommand.command}
                      </pre>
                      <p className="text-xs text-slate-500">
                        Run this command from the registered server IP. The script refuses requests from other addresses.
                      </p>
                    </div>
                  ) : null}
                  {server.description ? (
                    <p className="text-slate-400">{server.description}</p>
                  ) : null}
                  <dl className="grid gap-3 md:grid-cols-2">
                    <Fragment>
                      <div className="space-y-1">
                        <dt className="text-xs uppercase tracking-wide text-slate-500">
                          Organization
                        </dt>
                        <dd className="text-slate-200">{org.name}</dd>
                      </div>
                      <div className="space-y-1">
                        <dt className="text-xs uppercase tracking-wide text-slate-500">
                          Credits Remaining
                        </dt>
                        <dd className="font-medium text-slate-200">{org.credits}</dd>
                      </div>
                      <div className="space-y-1">
                        <dt className="text-xs uppercase tracking-wide text-slate-500">
                          Last Scan Debit
                        </dt>
                        <dd>{formatDate(org.lastDebitAt)}</dd>
                      </div>
                      <div className="space-y-1">
                        <dt className="text-xs uppercase tracking-wide text-slate-500">
                          Last Credit Top-up
                        </dt>
                        <dd>{formatDate(org.lastCreditedAt)}</dd>
                      </div>
                      <div className="space-y-1">
                        <dt className="text-xs uppercase tracking-wide text-slate-500">
                          Registered On
                        </dt>
                        <dd>{formatDate(server.createdAt)}</dd>
                      </div>
                      <div className="space-y-1">
                        <dt className="text-xs uppercase tracking-wide text-slate-500">
                          Last Updated
                        </dt>
                        <dd>{formatDate(server.updatedAt)}</dd>
                      </div>
                    </Fragment>
                  </dl>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
