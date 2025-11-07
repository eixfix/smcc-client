export type OrganizationSummary = {
  id: string;
  name: string;
  slug: string;
  credits: number;
  projectCount: number;
};


export type ManualScanSummary = {
  id: string;
  organization: {
    id: string;
    name: string;
  };
  project: {
    id: string;
    name: string;
  };
  task: {
    id: string;
    label: string;
    mode: string;
  };
  triggeredBy: {
    id: string;
    name: string;
  } | null;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  creditsCharged: number | null;
  summary?: Record<string, unknown> | null;
};

export type AgentScanSummary = {
  id: string;
  server: {
    id: string;
    name: string;
    hostname: string | null;
  };
  organization: {
    id: string;
    name: string;
  };
  agent: {
    id: string;
    accessKey: string;
    status: string;
  } | null;
  playbook: string;
  status: string;
  queuedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  failureReason: string | null;
  creditsCharged: number | null;
  result?: {
    summaryJson?: Record<string, unknown> | null;
    securityFindingsJson?: Record<string, unknown> | null;
    storageMetricsJson?: Record<string, unknown> | null;
    memoryMetricsJson?: Record<string, unknown> | null;
  } | null;
};

export type ServerSummary = {
  id: string;
  name: string;
  hostname: string | null;
  description: string | null;
  isSuspended: boolean;
  createdAt: string;
  updatedAt: string;
  organization: {
    id: string;
    name: string;
    credits: number;
    lastCreditedAt: string | null;
    lastDebitAt: string | null;
    scanSuspendedAt: string | null;
  };
};

export type TaskReportActivity = {
  id: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  summaryJson?: {
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
  };
  task: {
    id: string;
    label: string;
    method?: string;
    project: {
      id: string;
      name: string;
      organization: {
        id: string;
        name: string;
        slug: string;
      };
    };
  };
};

export type SecurityHeaderCheck = {
  header: string;
  present: boolean;
  value: string | null;
  recommendation: string;
};

export type SecurityCheckResult = {
  requestedUrl: string;
  finalUrl: string;
  statusCode: number;
  usesHttps: boolean;
  securityHeaders: SecurityHeaderCheck[];
  metadata: {
    title: string | null;
    description: string | null;
    openGraphTitle: string | null;
    openGraphSiteName: string | null;
  };
  ownership: {
    domain: string;
    primaryNameServer: string | null;
    responsibleEmail: string | null;
    registry: string | null;
    registrarName: string | null;
    registrarEmail: string | null;
    registrantName: string | null;
    registrantEmail: string | null;
    whoisRegistrar: string | null;
    whoisRegistrant: string | null;
  } | null;
  tls: {
    protocol: string | null;
    cipherSuite: string | null;
    issuer: string | null;
    subject: string | null;
    validFrom: string | null;
    validTo: string | null;
    daysUntilExpiry: number | null;
    isExpired: boolean;
    authorizationError: string | null;
    subjectAlternativeNames: string[];
  } | null;
  warnings: string[];
  fetchedAt: string;
};

export type LatencyAnomaly = {
  reportId: string;
  taskId: string;
  taskLabel: string;
  projectName: string;
  organizationName: string;
  startedAt: string;
  metric: 'p95Ms';
  value: number;
  baselineMean: number;
  baselineStdDev: number;
  zScore: number;
  successRate: number | null;
};

export async function fetchOrganizations(
  apiBaseUrl?: string,
  token?: string
): Promise<OrganizationSummary[]> {
  if (!apiBaseUrl || !token) {
    return [];
  }

  try {
    const response = await fetch(`${apiBaseUrl}/organizations`, {
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as Array<{
      id: string;
      name: string;
      slug: string;
      credits: number;
      _count?: {
        projects?: number;
      };
    }>;

    return data.map((organization) => ({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      credits: organization.credits ?? 0,
      projectCount: organization._count?.projects ?? 0
    }));
  } catch (error) {
    console.warn('Failed to fetch organizations', error);
    return [];
  }
}

export async function fetchRecentReports(
  apiBaseUrl?: string,
  token?: string
): Promise<TaskReportActivity[]> {
  if (!apiBaseUrl || !token) {
    return [];
  }

  try {
    const response = await fetch(`${apiBaseUrl}/projects/_/tasks/reports/recent`, {
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      return [];
    }

    return (await response.json()) as TaskReportActivity[];
  } catch (error) {
    console.warn('Failed to fetch recent reports', error);
    return [];
  }
}

export async function runSecurityCheck(
  organizationId: string,
  url: string
): Promise<SecurityCheckResult> {
  const response = await fetch('/api/security-check', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ organizationId, url })
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error ?? 'Security check failed.');
  }

  return (await response.json()) as SecurityCheckResult;
}

export async function fetchServers(
  apiBaseUrl?: string,
  token?: string
): Promise<ServerSummary[]> {
  if (!apiBaseUrl || !token) {
    return [];
  }

  try {
    const response = await fetch(`${apiBaseUrl}/servers`, {
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as Array<{
      id: string;
      name: string;
      hostname?: string | null;
      description?: string | null;
      isSuspended: boolean;
      createdAt: string;
      updatedAt: string;
      organization: {
        id: string;
        name: string;
        credits?: number;
        lastCreditedAt?: string | null;
        lastDebitAt?: string | null;
        scanSuspendedAt?: string | null;
      };
    }>;

    return data.map((server) => ({
      id: server.id,
      name: server.name,
      hostname: server.hostname ?? null,
      description: server.description ?? null,
      isSuspended: server.isSuspended,
      createdAt: server.createdAt,
      updatedAt: server.updatedAt,
      organization: {
        id: server.organization.id,
        name: server.organization.name,
        credits: server.organization.credits ?? 0,
        lastCreditedAt: server.organization.lastCreditedAt ?? null,
        lastDebitAt: server.organization.lastDebitAt ?? null,
        scanSuspendedAt: server.organization.scanSuspendedAt ?? null
      }
    }));
  } catch (error) {
    console.warn('Failed to fetch servers', error);
    return [];
  }
}

export async function fetchLatencyAnomalies(
  apiBaseUrl?: string,
  token?: string
): Promise<LatencyAnomaly[]> {
  if (!apiBaseUrl || !token) {
    return [];
  }

  try {
    const response = await fetch(`${apiBaseUrl}/analytics/anomalies`, {
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      return [];
    }

    return (await response.json()) as LatencyAnomaly[];
  } catch (error) {
    console.warn('Failed to fetch latency anomalies', error);
    return [];
  }
}


export async function fetchManualScanHistory(
  apiBaseUrl?: string,
  token?: string
): Promise<ManualScanSummary[]> {
  if (!apiBaseUrl || !token) {
    return [];
  }

  try {
    const response = await fetch(`${apiBaseUrl}/tasks/manual-scans`, {
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      return [];
    }

    return (await response.json()) as ManualScanSummary[];
  } catch (error) {
    console.warn('Failed to fetch manual scan history', error);
    return [];
  }
}


export async function fetchAgentScanHistory(
  apiBaseUrl?: string,
  token?: string
): Promise<AgentScanSummary[]> {
  if (!apiBaseUrl || !token) {
    return [];
  }

  try {
    const response = await fetch(`${apiBaseUrl}/servers/scans`, {
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      return [];
    }

    return (await response.json()) as AgentScanSummary[];
  } catch (error) {
    console.warn('Failed to fetch agent scan history', error);
    return [];
  }
}
