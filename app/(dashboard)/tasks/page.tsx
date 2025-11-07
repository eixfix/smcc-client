import { cookies } from 'next/headers';

import { TasksBoard } from '@/src/components/dashboard/tasks-board';
import { fetchOrganizations } from '@/src/lib/api';
import { fetchCurrentUser } from '@/src/lib/auth';

interface TasksPageProps {
  searchParams?: Record<string, string | string[] | undefined>;
}

export default async function TasksPage({ searchParams }: TasksPageProps) {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const token = cookies().get('lt_token')?.value;

  const initialOrganizationId = typeof searchParams?.organizationId === 'string'
    ? searchParams?.organizationId
    : undefined;
  const initialProjectId = typeof searchParams?.projectId === 'string'
    ? searchParams?.projectId
    : undefined;

  const [organizations, currentUser] = await Promise.all([
    fetchOrganizations(apiBaseUrl, token),
    fetchCurrentUser(apiBaseUrl, token)
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-semibold text-slate-100">Tasks</h2>
        <p className="text-sm text-slate-400">
          Manage task definitions, configure advanced request options, and execute load scenarios for any project you have access to.
        </p>
      </div>
      <TasksBoard
        organizations={organizations}
        currentUser={currentUser}
        initialOrganizationId={initialOrganizationId}
        initialProjectId={initialProjectId}
      />
    </div>
  );
}
