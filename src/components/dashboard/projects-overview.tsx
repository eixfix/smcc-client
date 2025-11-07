'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Badge } from '@/src/components/ui/badge';
import { CREDIT_COST_CREATE_PROJECT } from '@/src/lib/credit-costs';

type OrganizationOption = {
  id: string;
  name: string;
  slug: string;
  credits: number;
};

type CurrentUser = {
  role: string;
};

type ProjectSummary = {
  id: string;
  name: string;
  description?: string | null;
};

export function ProjectsOverview({
  organizations,
  currentUser
}: {
  organizations: OrganizationOption[];
  currentUser: CurrentUser | null;
}) {
  const router = useRouter();
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(
    organizations[0]?.id ?? null
  );
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projectForm, setProjectForm] = useState({ name: '', description: '' });
  const [feedback, setFeedback] = useState<string | null>(null);

  const canManage = useMemo(() => {
    if (!currentUser) {
      return false;
    }
    return currentUser.role === 'ADMINISTRATOR' || currentUser.role === 'OWNER';
  }, [currentUser]);

  const loadProjects = useCallback(async (organizationId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/organizations/${organizationId}/projects`, {
        cache: 'no-store'
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        setError(payload.error ?? 'Unable to load projects.');
        setProjects([]);
        return;
      }

      const data = (await response.json()) as ProjectSummary[];
      setProjects(data);
    } catch (fetchError) {
      console.warn('Failed to load projects', fetchError);
      setError('Unexpected error loading projects.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedOrganizationId) {
      setProjects([]);
      return;
    }

    void loadProjects(selectedOrganizationId);
  }, [selectedOrganizationId, loadProjects]);

  const selectedOrganization = useMemo(() => {
    return organizations.find((organization) => organization.id === selectedOrganizationId) ?? null;
  }, [organizations, selectedOrganizationId]);

  const hasSufficientCredits = useMemo(() => {
    if (!selectedOrganization) {
      return false;
    }
    return selectedOrganization.credits >= CREDIT_COST_CREATE_PROJECT;
  }, [selectedOrganization]);

  const handleProjectSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedOrganizationId) {
      return;
    }

    setFeedback(null);
    setError(null);

    try {
      const response = await fetch(`/api/organizations/${selectedOrganizationId}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: projectForm.name.trim(),
          description: projectForm.description.trim() || undefined
        })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        setError(payload.error ?? 'Failed to create project.');
        return;
      }

      setProjectForm({ name: '', description: '' });
      setFeedback('Project created successfully.');
      await loadProjects(selectedOrganizationId);
      router.refresh();
    } catch (projectError) {
      console.warn('Project creation failed', projectError);
      setError('Unexpected error creating project.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-200">Organization scope</p>
          <p className="text-xs text-slate-500">
            Projects and actions are filtered to the selected organization.
          </p>
        </div>
        <select
          value={selectedOrganizationId ?? ''}
          onChange={(event) => setSelectedOrganizationId(event.target.value || null)}
          className="w-full rounded-lg border border-slate-800/70 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 sm:w-72"
        >
          {organizations.map((organization) => (
            <option key={organization.id} value={organization.id}>
              {`${organization.name} (${organization.credits} credits)`}
            </option>
          ))}
        </select>
      </div>
      {selectedOrganization ? (
        <p className="text-xs text-slate-500">
          Credits remaining for {selectedOrganization.name}: {selectedOrganization.credits}
        </p>
      ) : organizations.length === 0 ? (
        <p className="text-xs text-warning">No organizations available. Create one before adding projects.</p>
      ) : null}

      {canManage ? (
        <Card className="border-slate-800/70 bg-slate-950/60">
          <CardHeader>
            <CardTitle>Create project</CardTitle>
            <CardDescription>
              Define a new load-test project within the selected organization. Cost:{' '}
              {CREDIT_COST_CREATE_PROJECT} credits.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-2" onSubmit={handleProjectSubmit}>
              <div>
                <Label htmlFor="project-name" className="text-xs uppercase tracking-wide text-slate-400">
                  Project name
                </Label>
                <Input
                  id="project-name"
                  value={projectForm.name}
                  onChange={(event) => setProjectForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Baseline Smoke Tests"
                  className="mt-2 h-11 rounded-lg border-slate-800/70 bg-slate-950/70 text-slate-100 placeholder:text-slate-600"
                  required
                />
              </div>
              <div>
                <Label
                  htmlFor="project-description"
                  className="text-xs uppercase tracking-wide text-slate-400"
                >
                  Description
                </Label>
                <Input
                  id="project-description"
                  value={projectForm.description}
                  onChange={(event) =>
                    setProjectForm((prev) => ({ ...prev, description: event.target.value }))
                  }
                  placeholder="Optional summary for collaborators"
                  className="mt-2 h-11 rounded-lg border-slate-800/70 bg-slate-950/70 text-slate-100 placeholder:text-slate-600"
                />
              </div>
              <div className="md:col-span-2 flex justify-end">
                <Button
                  type="submit"
                  className="h-11 rounded-lg px-5"
                  disabled={
                    !projectForm.name.trim() ||
                    loading ||
                    !selectedOrganization ||
                    !hasSufficientCredits
                  }
                >
                  Create project
                </Button>
              </div>
            </form>
            {selectedOrganization && !hasSufficientCredits ? (
              <p className="mt-3 text-xs text-warning">
                Insufficient credits. You need {CREDIT_COST_CREATE_PROJECT} credits to create a project in
                this organization.
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed border-slate-800/70 bg-slate-950/50">
          <CardContent className="p-6 text-sm text-slate-400">
            Only administrators and organization owners can create new projects.
          </CardContent>
        </Card>
      )}

      {feedback ? (
        <Card className="border border-slate-800/60 bg-emerald-500/10">
          <CardContent className="p-4 text-sm text-emerald-300">{feedback}</CardContent>
        </Card>
      ) : null}

      {error ? (
        <Card className="border border-danger/40 bg-danger/10">
          <CardContent className="p-4 text-sm text-danger">{error}</CardContent>
        </Card>
      ) : null}

      {loading ? (
        <Card className="border-slate-800/70 bg-slate-950/60">
          <CardContent className="p-6 text-sm text-slate-400">Loading projects…</CardContent>
        </Card>
      ) : projects.length === 0 ? (
        <Card className="border-dashed border-slate-800/70 bg-slate-950/50">
          <CardContent className="p-6 text-sm text-slate-400">
            No projects found. {canManage ? 'Create your first project above.' : 'Ask an owner to create one.'}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {projects.map((project) => (
            <Card key={project.id} className="border-slate-800/70 bg-slate-950/60">
              <CardHeader>
                <CardTitle className="text-lg text-slate-100">{project.name}</CardTitle>
                {project.description ? (
                  <CardDescription>{project.description}</CardDescription>
                ) : null}
              </CardHeader>
              <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Badge variant="default" className="bg-surface-muted/70 text-slate-300">
                  {organizations.find((org) => org.id === selectedOrganizationId)?.name ?? '—'}
                </Badge>
                <Link
                  href={`/tasks?projectId=${project.id}&organizationId=${selectedOrganizationId ?? ''}`}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-800/70 bg-slate-900/70 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-900"
                >
                  Manage tasks
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
