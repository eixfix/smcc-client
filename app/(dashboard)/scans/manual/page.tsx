import { Metadata } from 'next';
import { cookies } from 'next/headers';

import { ManualScans } from '@/src/components/scans/manual-scans';
import { fetchManualScanHistory } from '@/src/lib/api';

export const metadata: Metadata = {
  title: 'Manual Scans',
  description: 'Review and trigger manual load tests across your projects.'
};

export default async function ManualScansPage() {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const token = cookies().get('lt_token')?.value;

  const scans = await fetchManualScanHistory(apiBaseUrl, token);

  return <ManualScans scans={scans} />;
}
