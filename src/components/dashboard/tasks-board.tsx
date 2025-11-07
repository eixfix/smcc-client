'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Badge } from '@/src/components/ui/badge';
import {
  CREDIT_COST_CREATE_TASK,
  CREDIT_COST_RUN_TASK
} from '@/src/lib/credit-costs';

const taskModes = ['SMOKE', 'STRESS', 'SOAK', 'SPIKE', 'CUSTOM'] as const;
const httpMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] as const;
const DEFAULT_CUSTOM_VUS = 20;
const scenarioDurationDefaults: Record<string, number> = {
  SMOKE: 30,
  STRESS: 60,
  SOAK: 120,
  SPIKE: 20,
  CUSTOM: 60
};

const secondsToFields = (seconds: number) => {
  const safeSeconds = Math.max(0, seconds);
  return {
    minutes: String(Math.floor(safeSeconds / 60)),
    seconds: String(safeSeconds % 60)
  };
};

const createDefaultTaskFormState = () => ({
  label: '',
  targetUrl: '',
  mode: 'SMOKE',
  scheduleAt: '',
  method: 'GET',
  payload: '',
  customVus: String(DEFAULT_CUSTOM_VUS),
  durationMinutes: secondsToFields(scenarioDurationDefaults.SMOKE).minutes,
  durationSeconds: secondsToFields(scenarioDurationDefaults.SMOKE).seconds,
  headers: [{ key: '', value: '' }],
  showAdvanced: false
});

interface OrganizationOption {
  id: string;
  name: string;
  slug: string;
  credits: number;
}

interface CurrentUser {
  role: string;
}

interface ProjectSummary {
  id: string;
  name: string;
  description?: string | null;
}

interface Task {
  id: string;
  label: string;
  targetUrl: string;
  mode: string;
  scheduleAt?: string | null;
  projectId: string;
  method: string;
  headers?: Record<string, string> | null;
  payload?: string | null;
  customVus?: number | null;
  durationSeconds?: number | null;
}

interface TaskReportSummary {
  scenario?: {
    mode?: string;
    totalRequests?: number;
  };
  metrics?: {
    averageMs?: number;
    minMs?: number;
    maxMs?: number;
    p95Ms?: number;
    successRate?: number;
  };
  results?: {
    totalRequests?: number;
    successCount?: number;
    failureCount?: number;
  };
  raw?: Record<string, unknown>;
  request?: {
    method?: string;
    headers?: Record<string, string>;
    hasPayload?: boolean;
  };
}

interface TaskReport {
  id: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  summaryJson?: TaskReportSummary;
}

interface TaskFormState {
  label: string;
  targetUrl: string;
  mode: string;
  scheduleAt: string;
  method: string;
  payload: string;
  customVus: string;
  durationMinutes: string;
  durationSeconds: string;
  headers: Array<{ key: string; value: string }>;
  showAdvanced: boolean;
}

export function TasksBoard({
  organizations,
  currentUser,
  initialOrganizationId,
  initialProjectId
}: {
  organizations: OrganizationOption[];
  currentUser: CurrentUser | null;
  initialOrganizationId?: string | null;
  initialProjectId?: string | null;
}) {
  const router = useRouter();
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(
    initialOrganizationId ?? organizations[0]?.id ?? null
  );
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(initialProjectId ?? null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskReports, setTaskReports] = useState<Record<string, TaskReport[]>>({});
  const [taskForms, setTaskForms] = useState<Record<string, TaskFormState>>({});
  const [runningTaskId, setRunningTaskId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const initialProjectRef = useRef<string | null>(initialProjectId ?? null);

  const canManage = useMemo(() => currentUser?.role === 'ADMINISTRATOR' || currentUser?.role === 'OWNER', [
    currentUser
  ]);

  const selectedOrganization = useMemo(() => {
    return organizations.find((organization) => organization.id === selectedOrganizationId) ?? null;
  }, [organizations, selectedOrganizationId]);

  const hasCreditsForTaskCreation = useMemo(() => {
    if (!selectedOrganization) {
      return false;
    }
    return selectedOrganization.credits >= CREDIT_COST_CREATE_TASK;
  }, [selectedOrganization]);

  const hasCreditsForTaskRun = useMemo(() => {
    if (!selectedOrganization) {
      return false;
    }
    return selectedOrganization.credits >= CREDIT_COST_RUN_TASK;
  }, [selectedOrganization]);

  const getForm = useCallback(
    (projectId: string): TaskFormState => taskForms[projectId] ?? createDefaultTaskFormState(),
    [taskForms]
  );

  const updateTaskForm = useCallback(
    (projectId: string, updater: (state: TaskFormState) => TaskFormState) => {
      setTaskForms((prev) => {
        const current = prev[projectId] ?? createDefaultTaskFormState();
        return {
          ...prev,
          [projectId]: updater(current)
        };
      });
    },
    []
  );

  const handleTaskFormChange = useCallback(
    (
      projectId: string,
      field: keyof Omit<TaskFormState, 'headers' | 'showAdvanced'>,
      value: string
    ) => {
      updateTaskForm(projectId, (state) => {
        if (field === 'mode') {
          const durationDefault = scenarioDurationDefaults[value] ?? scenarioDurationDefaults.SMOKE;
          const { minutes, seconds } = secondsToFields(durationDefault);
          return {
            ...state,
            mode: value,
            durationMinutes: minutes,
            durationSeconds: seconds
          };
        }

        return {
          ...state,
          [field]: value
        };
      });
    },
    [updateTaskForm]
  );

  const loadProjects = useCallback(
    async (organizationId: string) => {
      setLoadingProjects(true);
      setError(null);
      try {
        const response = await fetch(`/api/organizations/${organizationId}/projects`, {
          cache: 'no-store'
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as { error?: string };
          setError(payload.error ?? 'Unable to load projects.');
          setProjects([]);
          setSelectedProjectId(null);
          return;
        }

        const data = (await response.json()) as ProjectSummary[];
        setProjects(data);

        setSelectedProjectId((prev) => {
          const preferred = initialProjectRef.current ?? prev;
          if (preferred && data.some((project) => project.id === preferred)) {
            initialProjectRef.current = null;
            return preferred;
          }
          initialProjectRef.current = null;
          return data[0]?.id ?? null;
        });
      } catch (fetchError) {
        console.warn('Failed to load projects', fetchError);
        setError('Unexpected error loading projects.');
        setProjects([]);
        setSelectedProjectId(null);
      } finally {
        setLoadingProjects(false);
      }
    },
    []
  );

  const loadTasks = useCallback(async (projectId: string) => {
    setLoadingTasks(true);
    setError(null);
    try {
      const taskResponse = await fetch(`/api/projects/${projectId}/tasks`, { cache: 'no-store' });

      if (!taskResponse.ok) {
        const payload = (await taskResponse.json().catch(() => ({}))) as { error?: string };
        setError(payload.error ?? 'Unable to load tasks.');
        setTasks([]);
        setTaskReports({});
        return;
      }

      const taskData = (await taskResponse.json()) as Task[];
      setTasks(taskData);

      const reports: Record<string, TaskReport[]> = {};
      await Promise.all(
        taskData.map(async (task) => {
          const reportsResponse = await fetch(
            `/api/projects/${projectId}/tasks/${task.id}/reports`,
            { cache: 'no-store' }
          );

          if (!reportsResponse.ok) {
            const payload = (await reportsResponse.json().catch(() => ({}))) as { error?: string };
            setError((prev) => prev ?? payload.error ?? 'Unable to load task reports.');
            reports[task.id] = [];
            return;
          }

          reports[task.id] = (await reportsResponse.json()) as TaskReport[];
        })
      );
      setTaskReports(reports);
    } catch (fetchError) {
      console.warn('Failed to load tasks', fetchError);
      setError('Unexpected error loading tasks.');
      setTasks([]);
      setTaskReports({});
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedOrganizationId) {
      setProjects([]);
      setSelectedProjectId(null);
      return;
    }
    void loadProjects(selectedOrganizationId);
  }, [selectedOrganizationId, loadProjects]);

  useEffect(() => {
    if (!selectedProjectId) {
      setTasks([]);
      setTaskReports({});
      return;
    }
    void loadTasks(selectedProjectId);
  }, [selectedProjectId, loadTasks]);

  const formatMs = (value?: number) =>
    typeof value === 'number' ? `${value.toFixed(2)}ms` : '—';

  const handleTaskSubmit = (projectId: string) => async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedOrganizationId) {
      setError('Select an organization before creating tasks.');
      return;
    }

    const formState = getForm(projectId);
    const headersPayload = formState.headers
      .filter((header) => header.key.trim())
      .map((header) => ({ key: header.key.trim(), value: header.value }));
    const customVusValue =
      formState.mode === 'CUSTOM' && formState.customVus.trim()
        ? Number(formState.customVus)
        : undefined;
    const durationSecondsValue =
      formState.mode === 'CUSTOM'
        ? (() => {
            const minutes = Number(formState.durationMinutes);
            const seconds = Number(formState.durationSeconds);
            const normalizedMinutes = Number.isFinite(minutes) && minutes > 0 ? Math.floor(minutes) : 0;
            let normalizedSeconds = Number.isFinite(seconds) ? Math.floor(seconds) : 0;
            normalizedSeconds = Math.min(Math.max(normalizedSeconds, 0), 59);
            const total = normalizedMinutes * 60 + normalizedSeconds;
            return total > 0 ? total : scenarioDurationDefaults.CUSTOM;
          })()
        : scenarioDurationDefaults[formState.mode] ?? scenarioDurationDefaults.SMOKE;

    setFeedback(null);
    setError(null);

    if (!hasCreditsForTaskCreation) {
      setError(`Insufficient credits. Creating a task costs ${CREDIT_COST_CREATE_TASK} credits.`);
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: formState.label.trim(),
          targetUrl: formState.targetUrl.trim(),
          mode: formState.mode,
          scheduleAt: formState.scheduleAt.trim() || undefined,
          method: formState.method.toUpperCase(),
          headers: headersPayload.length > 0 ? headersPayload : undefined,
          payload: formState.payload.trim() || undefined,
          customVus: Number.isFinite(customVusValue ?? NaN) && (customVusValue ?? 0) > 0 ? customVusValue : undefined,
          durationSeconds: durationSecondsValue
        })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        setError(payload.error ?? 'Failed to create task.');
        return;
      }

      setTaskForms((prev) => ({
        ...prev,
        [projectId]: createDefaultTaskFormState()
      }));
      setFeedback('Task created. Refreshing tasks…');
      await loadTasks(projectId);
      router.refresh();
    } catch (taskError) {
      console.warn('Task creation failed', taskError);
      setError('Unexpected error creating task.');
    }
  };

  const handleDuplicateTask = useCallback(
    (task: Task) => {
      const headersObject = task.headers && typeof task.headers === 'object' ? task.headers : {};
      const headerEntries = Object.entries(headersObject as Record<string, string>);
      const durationSeconds =
        task.mode === 'CUSTOM'
          ? task.durationSeconds ?? scenarioDurationDefaults.CUSTOM
          : scenarioDurationDefaults[task.mode] ?? scenarioDurationDefaults.SMOKE;
      const duplicateHeaders =
        headerEntries.length > 0
          ? headerEntries.map(([key, value]) => ({
              key,
              value: typeof value === 'string' ? value : JSON.stringify(value ?? '')
            }))
          : [{ key: '', value: '' }];
      const durationFields = secondsToFields(durationSeconds);

      updateTaskForm(task.projectId, () => ({
        label: `${task.label} copy`,
        targetUrl: task.targetUrl,
        mode: task.mode,
        scheduleAt: '',
        method: task.method ?? 'GET',
        payload: task.payload ?? '',
        customVus:
          typeof task.customVus === 'number' && task.customVus > 0
            ? String(task.customVus)
            : String(DEFAULT_CUSTOM_VUS),
        durationMinutes: durationFields.minutes,
        durationSeconds: durationFields.seconds,
        headers: duplicateHeaders,
        showAdvanced: true
      }));

      setFeedback('Task details loaded into the form. Adjust settings before saving.');
      setError(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [setError, setFeedback, updateTaskForm]
  );

  const handleRunTask = (projectId: string, taskId: string) => async () => {
    setFeedback(null);
    setError(null);

    if (!selectedOrganizationId) {
      setError('Select an organization before running tasks.');
      return;
    }

    if (!hasCreditsForTaskRun) {
      setError(`Insufficient credits. Running a task costs ${CREDIT_COST_RUN_TASK} credits.`);
      return;
    }

    setRunningTaskId(taskId);
    try {
      const response = await fetch(`/api/projects/${projectId}/tasks/${taskId}/run`, {
        method: 'POST'
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        setError(payload.error ?? 'Failed to trigger task run.');
        return;
      }

      const report = (await response.json()) as TaskReport;
      setFeedback(
        report.status === 'completed'
          ? 'Task execution completed successfully.'
          : 'Task execution finished with errors.'
      );
      await loadTasks(projectId);
      router.refresh();
    } catch (runError) {
      console.warn('Task run failed', runError);
      setError('Unexpected error starting task run.');
    } finally {
      setRunningTaskId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <Label className="text-xs uppercase tracking-wide text-slate-400">Organization</Label>
          <select
            value={selectedOrganizationId ?? ''}
            onChange={(event) => setSelectedOrganizationId(event.target.value || null)}
            className="mt-2 w-full rounded-lg border border-slate-800/70 bg-slate-950/70 px-3 py-2 text-sm text-slate-100"
          >
            {organizations.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {`${organization.name} (${organization.credits} credits)`}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-xs uppercase tracking-wide text-slate-400">Project</Label>
          <select
            value={selectedProjectId ?? ''}
            onChange={(event) => setSelectedProjectId(event.target.value || null)}
            className="mt-2 w-full rounded-lg border border-slate-800/70 bg-slate-950/70 px-3 py-2 text-sm text-slate-100"
            disabled={loadingProjects || projects.length === 0}
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      {selectedOrganization ? (
        <p className="text-xs text-slate-500">
          Credits remaining for {selectedOrganization.name}: {selectedOrganization.credits}
        </p>
      ) : organizations.length === 0 ? (
        <p className="text-xs text-warning">No organizations available. Create one before managing tasks.</p>
      ) : null}

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

      {loadingProjects ? (
        <Card className="border-slate-800/70 bg-slate-950/60">
          <CardContent className="p-6 text-sm text-slate-400">Loading projects…</CardContent>
        </Card>
      ) : projects.length === 0 ? (
        <Card className="border-dashed border-slate-800/70 bg-slate-950/50">
          <CardContent className="p-6 text-sm text-slate-400">
            No projects available. Create one from the Projects page to begin managing tasks.
          </CardContent>
        </Card>
      ) : null}

      {selectedProjectId ? (
        (() => {
          const formState = getForm(selectedProjectId);

          return (
            <>
              {canManage ? (
                <Card className="border-slate-800/70 bg-slate-950/60">
                  <CardHeader>
                    <CardTitle>Create task</CardTitle>
                    <CardDescription>
                      Configure a request and attach k6 options before launching a run. Cost:{' '}
                      {CREDIT_COST_CREATE_TASK} credits.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form className="grid gap-4 md:grid-cols-2" onSubmit={handleTaskSubmit(selectedProjectId)}>
                      <div>
                        <Label
                          htmlFor={`task-label-${selectedProjectId}`}
                          className="text-xs uppercase tracking-wide text-slate-400"
                        >
                          Task label
                        </Label>
                        <Input
                          id={`task-label-${selectedProjectId}`}
                          value={formState.label}
                          onChange={(event) => handleTaskFormChange(selectedProjectId, 'label', event.target.value)}
                          placeholder="Homepage smoke"
                          className="mt-2 h-11 rounded-lg border-slate-800/70 bg-slate-950/70 text-slate-100 placeholder:text-slate-600"
                          required
                        />
                      </div>
                      <div>
                        <Label
                          htmlFor={`task-target-${selectedProjectId}`}
                          className="text-xs uppercase tracking-wide text-slate-400"
                        >
                          Target URL
                        </Label>
                        <Input
                          id={`task-target-${selectedProjectId}`}
                          value={formState.targetUrl}
                          onChange={(event) => handleTaskFormChange(selectedProjectId, 'targetUrl', event.target.value)}
                          placeholder="https://api.example.com/login"
                          className="mt-2 h-11 rounded-lg border-slate-800/70 bg-slate-950/70 text-slate-100 placeholder:text-slate-600"
                          required
                        />
                      </div>
                      <div>
                        <Label
                          htmlFor={`task-mode-${selectedProjectId}`}
                          className="text-xs uppercase tracking-wide text-slate-400"
                        >
                          Mode
                        </Label>
                        <select
                          id={`task-mode-${selectedProjectId}`}
                          value={formState.mode}
                          onChange={(event) => handleTaskFormChange(selectedProjectId, 'mode', event.target.value)}
                          className="mt-2 h-11 w-full rounded-lg border border-slate-800/70 bg-slate-950/70 px-3 text-sm text-slate-100"
                        >
                          {taskModes.map((mode) => (
                            <option key={mode} value={mode}>
                              {mode}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label
                          htmlFor={`task-schedule-${selectedProjectId}`}
                          className="text-xs uppercase tracking-wide text-slate-400"
                        >
                          Schedule at (optional)
                        </Label>
                        <Input
                          id={`task-schedule-${selectedProjectId}`}
                          type="datetime-local"
                          value={formState.scheduleAt}
                          onChange={(event) =>
                            handleTaskFormChange(selectedProjectId, 'scheduleAt', event.target.value)
                          }
                          className="mt-2 h-11 rounded-lg border-slate-800/70 bg-slate-950/70 text-slate-100"
                        />
                      </div>
                      <div className="md:col-span-2 flex items-center justify-between rounded-lg border border-dashed border-slate-800/60 bg-slate-900/50 px-4 py-3">
                        <p className="text-xs text-slate-400">Need custom headers, payloads, or methods?</p>
                        <Button
                          type="button"
                          variant="secondary"
                          className="text-xs"
                          onClick={() => updateTaskForm(selectedProjectId, (state) => ({
                            ...state,
                            showAdvanced: !state.showAdvanced
                          }))}
                        >
                          {formState.showAdvanced ? 'Hide advanced' : 'Show advanced'}
                        </Button>
                      </div>

                      {formState.showAdvanced ? (
                        <div className="md:col-span-2 space-y-4 rounded-lg border border-slate-800/60 bg-slate-900/50 p-4">
                          <div className="grid gap-4 md:grid-cols-2">
                            <div>
                              <Label
                                htmlFor={`task-method-${selectedProjectId}`}
                                className="text-xs uppercase tracking-wide text-slate-400"
                              >
                                HTTP method
                              </Label>
                              <select
                                id={`task-method-${selectedProjectId}`}
                                value={formState.method}
                                onChange={(event) =>
                                  handleTaskFormChange(selectedProjectId, 'method', event.target.value)
                                }
                                className="mt-2 h-11 w-full rounded-lg border border-slate-800/70 bg-slate-950/70 px-3 text-sm text-slate-100"
                              >
                                {httpMethods.map((method) => (
                                  <option key={method} value={method}>
                                    {method}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <Label
                                htmlFor={`task-payload-${selectedProjectId}`}
                                className="text-xs uppercase tracking-wide text-slate-400"
                              >
                                Request payload (optional)
                              </Label>
                              <textarea
                                id={`task-payload-${selectedProjectId}`}
                                value={formState.payload}
                                onChange={(event) =>
                                  handleTaskFormChange(selectedProjectId, 'payload', event.target.value)
                                }
                                className="mt-2 min-h-[120px] w-full rounded-lg border border-slate-800/70 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600"
                                placeholder='e.g. {"status":"ok"}'
                              />
                          </div>
                        </div>

                        {(() => {
                          const isCustomMode = formState.mode === 'CUSTOM';
                          const defaultDuration =
                            scenarioDurationDefaults[formState.mode] ?? scenarioDurationDefaults.SMOKE;
                          const durationFields = isCustomMode
                            ? { minutes: formState.durationMinutes, seconds: formState.durationSeconds }
                            : secondsToFields(defaultDuration);

                          return (
                            <>
                              {isCustomMode ? (
                                <div>
                                  <Label
                                    htmlFor={`task-custom-vus-${selectedProjectId}`}
                                    className="text-xs uppercase tracking-wide text-slate-400"
                                  >
                                    Custom virtual users
                                  </Label>
                                  <Input
                                    id={`task-custom-vus-${selectedProjectId}`}
                                    type="number"
                                    min={1}
                                    placeholder="e.g. 250"
                                    value={formState.customVus}
                                    onChange={(event) =>
                                      handleTaskFormChange(selectedProjectId, 'customVus', event.target.value)
                                    }
                                    className="mt-2 h-11 rounded-lg border-slate-800/70 bg-slate-950/70 text-sm text-slate-100 placeholder:text-slate-600"
                                  />
                                  <p className="mt-1 text-xs text-slate-500">
                                    Applied when mode is set to CUSTOM.
                                  </p>
                                </div>
                              ) : null}

                              <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                  <Label
                                    htmlFor={`task-duration-minutes-${selectedProjectId}`}
                                    className="text-xs uppercase tracking-wide text-slate-400"
                                  >
                                    Duration (minutes)
                                  </Label>
                                  <Input
                                    id={`task-duration-minutes-${selectedProjectId}`}
                                    type="number"
                                    min={0}
                                    value={durationFields.minutes}
                                    onChange={(event) =>
                                      handleTaskFormChange(
                                        selectedProjectId,
                                        'durationMinutes',
                                        event.target.value
                                      )
                                    }
                                    className="mt-2 h-11 rounded-lg border-slate-800/70 bg-slate-950/70 text-sm text-slate-100 placeholder:text-slate-600"
                                    disabled={!isCustomMode}
                                  />
                                </div>
                                <div>
                                  <Label
                                    htmlFor={`task-duration-seconds-${selectedProjectId}`}
                                    className="text-xs uppercase tracking-wide text-slate-400"
                                  >
                                    Duration (seconds)
                                  </Label>
                                  <Input
                                    id={`task-duration-seconds-${selectedProjectId}`}
                                    type="number"
                                    min={0}
                                    max={59}
                                    value={durationFields.seconds}
                                    onChange={(event) =>
                                      handleTaskFormChange(
                                        selectedProjectId,
                                        'durationSeconds',
                                        event.target.value
                                      )
                                    }
                                    className="mt-2 h-11 rounded-lg border-slate-800/70 bg-slate-950/70 text-sm text-slate-100 placeholder:text-slate-600"
                                    disabled={!isCustomMode}
                                  />
                                </div>
                              </div>
                              <p className="text-xs text-slate-500">
                                {isCustomMode
                                  ? 'Duration applies when using custom scenarios. Seconds are clamped between 0 and 59.'
                                  : 'Duration is derived from the selected scenario and cannot be edited.'}
                              </p>
                            </>
                          );
                        })()}

                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                              Request headers
                              </p>
                              <Button
                                type="button"
                                variant="ghost"
                                className="text-xs"
                                onClick={() =>
                                  updateTaskForm(selectedProjectId, (state) => ({
                                    ...state,
                                    headers: [...state.headers, { key: '', value: '' }]
                                  }))
                                }
                              >
                                Add header
                              </Button>
                            </div>
                            <div className="space-y-2">
                              {formState.headers.map((header, index) => (
                                <div
                                  key={`${selectedProjectId}-header-${index}`}
                                  className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
                                >
                                  <Input
                                    placeholder="Header name"
                                    value={header.key}
                                    onChange={(event) =>
                                      updateTaskForm(selectedProjectId, (state) => {
                                        const headers = [...state.headers];
                                        headers[index] = { ...headers[index], key: event.target.value };
                                        return { ...state, headers };
                                      })
                                    }
                                    className="h-10 rounded-lg border-slate-800/70 bg-slate-950/70 text-slate-100"
                                  />
                                  <Input
                                    placeholder="Header value"
                                    value={header.value}
                                    onChange={(event) =>
                                      updateTaskForm(selectedProjectId, (state) => {
                                        const headers = [...state.headers];
                                        headers[index] = { ...headers[index], value: event.target.value };
                                        return { ...state, headers };
                                      })
                                    }
                                    className="h-10 rounded-lg border-slate-800/70 bg-slate-950/70 text-slate-100"
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    className="justify-self-end text-xs"
                                    onClick={() =>
                                      updateTaskForm(selectedProjectId, (state) => {
                                        const headers = state.headers.filter((_, headerIndex) => headerIndex !== index);
                                        return { ...state, headers: headers.length > 0 ? headers : [{ key: '', value: '' }] };
                                      })
                                    }
                                  >
                                    Remove
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : null}

                      <div className="md:col-span-2 flex justify-end">
                        <Button
                          type="submit"
                          className="h-11 rounded-lg px-5"
                          disabled={
                            !formState.label.trim() ||
                            !formState.targetUrl.trim() ||
                            loadingTasks ||
                            !hasCreditsForTaskCreation
                          }
                        >
                          Create task
                        </Button>
                      </div>
                    </form>
                    {!hasCreditsForTaskCreation ? (
                      <p className="mt-3 text-xs text-warning">
                        Insufficient credits. You need {CREDIT_COST_CREATE_TASK} credits to create a task in this
                        organization.
                      </p>
                    ) : null}
                  </CardContent>
                </Card>
              ) : null}

              {selectedOrganization && !hasCreditsForTaskRun ? (
                <p className="text-xs text-warning">
                  Running a task costs {CREDIT_COST_RUN_TASK} credits. Top up to trigger executions in this
                  organization.
                </p>
              ) : null}

              {loadingTasks ? (
                <Card className="border-slate-800/70 bg-slate-950/60">
                  <CardContent className="p-6 text-sm text-slate-400">Loading tasks…</CardContent>
                </Card>
              ) : tasks.length === 0 ? (
                <Card className="border-dashed border-slate-800/70 bg-slate-950/50">
                  <CardContent className="p-6 text-sm text-slate-400">
                    No tasks yet. {canManage ? 'Create one using the form above.' : 'Tasks will appear once created by an owner.'}
                  </CardContent>
                </Card>
              ) : (
                tasks.map((task) => {
                  const reports = taskReports[task.id] ?? [];
                  const run = reports[0];
                  const headerCount =
                    task.headers && typeof task.headers === 'object' ? Object.keys(task.headers).length : 0;
                  const hasPayload = typeof task.payload === 'string' && task.payload.length > 0;

                  return (
                    <Card key={task.id} className="border-slate-800/70 bg-slate-900/60">
                      <CardHeader>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                              {task.label}
                              <Badge variant="default" className="bg-slate-800/70 text-[10px] uppercase">
                                {task.method}
                              </Badge>
                            </p>
                            <p className="text-xs text-slate-500">
                              Mode: {task.mode} • Target: {task.targetUrl}
                            </p>
                            <p className="text-xs text-slate-500">
                              Headers: {headerCount} • Payload: {hasPayload ? 'Yes' : 'No'}
                            </p>
                          </div>
                          {canManage ? (
                            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                              <Button
                                variant="secondary"
                                className="w-full sm:w-auto"
                                onClick={handleRunTask(task.projectId, task.id)}
                                disabled={runningTaskId === task.id || !hasCreditsForTaskRun}
                              >
                                {runningTaskId === task.id ? 'Running…' : 'Run task'}
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                className="w-full sm:w-auto"
                                onClick={() => handleDuplicateTask(task)}
                              >
                                Duplicate
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {task.scheduleAt ? (
                          <Badge variant="warning">
                            Scheduled: {new Date(task.scheduleAt).toLocaleString()}
                          </Badge>
                        ) : (
                          <Badge variant="default" className="bg-surface-muted/80 text-slate-200">
                            On-demand
                          </Badge>
                        )}

                        {reports.length === 0 ? (
                          <p className="rounded-lg border border-dashed border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-xs text-emerald-200">
                            No runs yet. Trigger a task run to capture performance metrics.
                          </p>
                        ) : null}

                        {run ? (
                          <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-200 space-y-3">
                            <div>
                              <p className="font-semibold text-emerald-200">Last run summary</p>
                              <p className="text-emerald-100">
                                Status: <span className="uppercase">{run.status}</span> • Started:{' '}
                                {new Date(run.startedAt).toLocaleString()}
                                {run.completedAt
                                  ? ` • Completed: ${new Date(run.completedAt).toLocaleString()}`
                                  : ''}
                              </p>
                            </div>
                            {run.summaryJson?.scenario ? (
                              <p>
                                Mode: {run.summaryJson.scenario.mode} • Requests:{' '}
                                {run.summaryJson.scenario.totalRequests ?? '—'}
                              </p>
                            ) : null}
                            {run.summaryJson?.metrics ? (
                              <p>
                                Avg: {formatMs(run.summaryJson.metrics.averageMs)} • P95:{' '}
                                {formatMs(run.summaryJson.metrics.p95Ms)} • Success rate:{' '}
                                {run.summaryJson.metrics.successRate ?? '—'}%
                              </p>
                            ) : null}
                            {run.summaryJson?.results ? (
                              <p>
                                Requests:{' '}
                                {run.summaryJson.results.totalRequests} • Success:{' '}
                                {run.summaryJson.results.successCount} • Failures:{' '}
                                {run.summaryJson.results.failureCount}
                              </p>
                            ) : null}
                            {(() => {
                              const request = run.summaryJson?.request;
                              if (!request) {
                                return (
                                  <p>
                                    Method: {task.method} • Headers: {headerCount} • Payload: {hasPayload ? 'Yes' : 'No'}
                                  </p>
                                );
                              }

                              const requestHeaderCount =
                                request.headers && typeof request.headers === 'object'
                                  ? Object.keys(request.headers).length
                                  : 0;
                              return (
                                <p>
                                  Method: {request.method ?? task.method} • Headers: {requestHeaderCount} • Payload: {request.hasPayload ? 'Yes' : 'No'}
                                </p>
                              );
                            })()}

                            {reports.length > 1 ? (
                              <details className="text-[11px] text-emerald-100/80">
                                <summary className="cursor-pointer">Run history ({reports.length})</summary>
                                <div className="mt-2 space-y-2">
                                  {reports.slice(1).map((report) => {
                                    const requestInfo = report.summaryJson?.request;
                                    const requestHeaderCount =
                                      requestInfo?.headers && typeof requestInfo.headers === 'object'
                                        ? Object.keys(requestInfo.headers).length
                                        : 0;
                                    return (
                                      <div
                                        key={report.id}
                                        className="rounded border border-emerald-500/20 bg-emerald-500/5 px-3 py-2"
                                      >
                                        <p>
                                          {new Date(report.startedAt).toLocaleString()} •{' '}
                                          <span className="uppercase">{report.status}</span>
                                        </p>
                                        {report.summaryJson?.metrics ? (
                                          <p>
                                            Avg: {formatMs(report.summaryJson.metrics.averageMs)} • Success:{' '}
                                            {report.summaryJson.metrics.successRate ?? '—'}%
                                          </p>
                                        ) : null}
                                        {requestInfo ? (
                                          <p>
                                            Method: {requestInfo.method ?? task.method} • Headers: {requestHeaderCount} • Payload:{' '}
                                            {requestInfo.hasPayload ? 'Yes' : 'No'}
                                          </p>
                                        ) : null}
                                      </div>
                                    );
                                  })}
                                </div>
                              </details>
                            ) : null}
                            {run.summaryJson?.raw ? (
                              <details className="text-[11px] text-emerald-100/80">
                                <summary className="cursor-pointer">Raw metrics</summary>
                                <pre className="mt-2 max-h-48 overflow-auto rounded-lg border border-emerald-500/20 bg-black/40 p-3 text-[10px] text-slate-200">
                                  {JSON.stringify(run.summaryJson.raw, null, 2)}
                                </pre>
                              </details>
                            ) : null}
                          </div>
                        ) : null}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </>
          );
        })()
      ) : null}
    </div>
  );
}
