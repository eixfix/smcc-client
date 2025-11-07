import { Metadata } from 'next';
import { cookies } from 'next/headers';

import { AgentScans } from '@/src/components/scans/agent-scans';
import { fetchAgentScanHistory } from '@/src/lib/api';

export const metadata: Metadata = {
  title: 'Agent Scans',
  description: 'Inspect server agent activity, queued jobs, and results.'
};

export default async function AgentScansPage() {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const token = cookies().get('lt_token')?.value;

  const scans = await fetchAgentScanHistory(apiBaseUrl, token);

  return <AgentScans scans={scans} />;
}
