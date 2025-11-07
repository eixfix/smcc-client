import { cookies } from 'next/headers';

import { CreateOrganizationForm } from '@/src/components/dashboard/create-organization-form';
import { OrganizationCreditsTopUp } from '@/src/components/dashboard/organization-credits-topup';
import { Badge } from '@/src/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card';
import { fetchOrganizations } from '@/src/lib/api';
import { fetchCurrentUser } from '@/src/lib/auth';

export default async function OrganizationsPage() {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const token = cookies().get('lt_token')?.value;
  const [organizations, currentUser] = await Promise.all([
    fetchOrganizations(apiBaseUrl, token),
    fetchCurrentUser(apiBaseUrl, token)
  ]);

  const isAdministrator = currentUser?.role === 'ADMINISTRATOR';

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-semibold text-slate-100">Organizations</h2>
        <p className="text-sm text-slate-400">
          Track ownership, project load, and credit balances for each load-test portfolio. Credits power key
          actions: 15 per project creation, 5 per task or task run, and 2 per security check.
        </p>
      </div>

      {isAdministrator ? (
        <CreateOrganizationForm />
      ) : (
        <Card className="border-dashed border-slate-800/70 bg-slate-950/40">
          <CardContent className="flex flex-col gap-2 p-6 text-sm text-slate-400">
            <p className="font-medium text-slate-200">Limited access</p>
            <p>
              Only administrators can create new organizations. Reach out to the support team if you
              need an additional portfolio.
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Portfolio Overview</CardTitle>
          <CardDescription>Every organization synced from the orchestration API.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-800/70 text-sm">
            <thead className="text-left uppercase tracking-wider text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3">Organization</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Projects</th>
                <th className="px-4 py-3">Credits</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-sm text-slate-200">
              {organizations.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-center text-slate-500" colSpan={5}>
                    No organizations available. {isAdministrator ? 'Create one to get started.' : 'Ask an administrator to create one.'}
                  </td>
                </tr>
              ) : (
                organizations.map((organization) => (
                  <tr key={organization.id}>
                    <td className="px-4 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-100">{organization.name}</span>
                        <span className="text-xs text-slate-500">Owner managed</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-xs uppercase tracking-wide text-slate-400">
                      {organization.slug}
                    </td>
                    <td className="px-4 py-4">
                      <Badge variant="default" className="bg-surface-muted/80 text-slate-200">
                        {organization.projectCount} active
                      </Badge>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                        <Badge variant="default" className="bg-slate-800/70 text-slate-200">
                          {organization.credits} credits
                        </Badge>
                        {isAdministrator ? (
                          <OrganizationCreditsTopUp
                            organizationId={organization.id}
                            organizationName={organization.name}
                          />
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <Badge variant="success">Operational</Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
