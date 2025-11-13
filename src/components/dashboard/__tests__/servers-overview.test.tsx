import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { ServersOverview } from '../servers-overview';
import type {
  OrganizationSummary,
  ServerSummary,
  ServerTelemetrySnapshot
} from '@/src/lib/api';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: jest.fn()
  })
}));

const organizations: OrganizationSummary[] = [
  {
    id: 'org_1',
    name: 'Acme',
    slug: 'acme',
    credits: 250,
    projectCount: 2
  }
];

const latestTelemetry: ServerTelemetrySnapshot = {
  id: 'telemetry_latest',
  collectedAt: new Date('2025-01-01T00:00:00.000Z').toISOString(),
  cpuPercent: 51,
  memoryPercent: 62,
  diskPercent: 43,
  raw: null
};

const servers: ServerSummary[] = [
  {
    id: 'srv_1',
    name: 'Primary',
    hostname: 'primary.internal',
    allowedIp: '10.0.0.10',
    description: 'Primary load injector',
    isSuspended: false,
    createdAt: new Date('2024-12-01T10:00:00.000Z').toISOString(),
    updatedAt: new Date('2024-12-10T10:00:00.000Z').toISOString(),
    organization: {
      id: 'org_1',
      name: 'Acme',
      credits: 250,
      lastCreditedAt: null,
      lastDebitAt: null,
      scanSuspendedAt: null
    },
    latestTelemetry
  }
];

const sampleTelemetryHistory: ServerTelemetrySnapshot[] = [
  {
    id: 'telemetry_1',
    collectedAt: new Date('2025-01-02T08:00:00.000Z').toISOString(),
    cpuPercent: 42,
    memoryPercent: 57,
    diskPercent: 70,
    raw: null
  }
];

const originalFetch = global.fetch;

afterEach(() => {
  jest.resetAllMocks();
  global.fetch = originalFetch;
});

describe('ServersOverview telemetry drawer', () => {
  it('fetches and renders telemetry history when the panel opens', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(sampleTelemetryHistory)
    }) as unknown as typeof fetch;

    render(<ServersOverview servers={servers} organizations={organizations} />);

    fireEvent.click(screen.getByRole('button', { name: /view telemetry history/i }));

    expect(await screen.findByText(/Loading telemetry/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/servers/srv_1/telemetry?limit=25');
    });

    await waitFor(() => {
      expect(screen.getAllByText('42%')[0]).toBeInTheDocument();
    });
  });

  it('shows a descriptive error when telemetry history fails to load', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: jest.fn().mockResolvedValue({ error: 'Telemetry offline' })
    }) as unknown as typeof fetch;

    render(<ServersOverview servers={servers} organizations={organizations} />);

    fireEvent.click(screen.getByRole('button', { name: /view telemetry history/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText('Telemetry offline')).toBeInTheDocument();
    });
  });
});
