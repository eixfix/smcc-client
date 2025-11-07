import { cookies } from 'next/headers';

import { ProjectsOverview } from '@/src/components/dashboard/projects-overview';
import { fetchOrganizations } from '@/src/lib/api';
import { fetchCurrentUser } from '@/src/lib/auth';

export default async function ProjectsPage() {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const token = cookies().get('lt_token')?.value;

  const [organizations, currentUser] = await Promise.all([
    fetchOrganizations(apiBaseUrl, token),
    fetchCurrentUser(apiBaseUrl, token)
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-semibold text-slate-100">Projects</h2>
        <p className="text-sm text-slate-400">
          Curate smoke, stress, and soak suites, then deploy them confidently into production-like
          environments.
        </p>
      </div>
      <ProjectsOverview organizations={organizations} currentUser={currentUser} />
    </div>
  );
}
