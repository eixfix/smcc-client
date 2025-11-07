import { cookies } from 'next/headers';

import { ServersOverview } from '@/src/components/dashboard/servers-overview';
import { fetchOrganizations, fetchServers } from '@/src/lib/api';

export default async function ServersPage() {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const token = cookies().get('lt_token')?.value;

  const [servers, organizations] = await Promise.all([
    fetchServers(apiBaseUrl, token),
    fetchOrganizations(apiBaseUrl, token)
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-semibold text-slate-100">Servers</h2>
          <span className="rounded-full border border-accent-soft/40 bg-accent-soft/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-accent-soft">
            Beta
          </span>
        </div>
        <p className="text-sm text-slate-400">
          Track infrastructure connected to the Server Monitoring Command Center, monitor credit
          impact, and verify which organizations are ready for the next scan run.
        </p>
      </div>
      <ServersOverview servers={servers} organizations={organizations} />
    </div>
  );
}
