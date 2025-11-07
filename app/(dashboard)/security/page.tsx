import { cookies } from 'next/headers';

import { SecurityCheckPanel } from '@/src/components/dashboard/security-check-panel';
import { fetchOrganizations } from '@/src/lib/api';

export default async function SecurityPage() {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const token = cookies().get('lt_token')?.value;
  const organizations = await fetchOrganizations(apiBaseUrl, token);

  return (
    <div className="space-y-6 max-h-[calc(100vh-12rem)] overflow-y-auto pr-1 sm:pr-2">
      <section className="space-y-2">
        <h2 className="text-2xl font-semibold text-slate-100">Security Check</h2>
        <p className="text-sm text-slate-400">
          Run on-demand security header audits, inspect metadata, and gather ownership hints before launching load tests against a new target.
        </p>
      </section>
      <SecurityCheckPanel organizations={organizations} />
    </div>
  );
}
