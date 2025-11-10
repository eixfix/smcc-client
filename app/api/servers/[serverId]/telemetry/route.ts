import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  context: { params: { serverId?: string } }
) {
  const { serverId } = context.params;

  if (!serverId) {
    return NextResponse.json({ error: 'Server identifier is required.' }, { status: 400 });
  }

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const token = cookies().get('lt_token')?.value;

  if (!apiBaseUrl || !token) {
    return NextResponse.json(
      { error: 'Unable to authenticate with the API. Please sign in again.' },
      { status: 401 }
    );
  }

  const url = new URL(request.url);
  const limitParam = url.searchParams.get('limit');
  const parsedLimit = limitParam ? Number.parseInt(limitParam, 10) : undefined;
  const sanitizedLimit =
    parsedLimit !== undefined && !Number.isNaN(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 1), 100)
      : undefined;
  const query = sanitizedLimit ? `?limit=${sanitizedLimit}` : '';

  const response = await fetch(`${apiBaseUrl}/servers/${serverId}/telemetry${query}`, {
    headers: {
      Authorization: `Bearer ${token}`
    },
    cache: 'no-store'
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
    return NextResponse.json(
      { error: payload.error ?? payload.message ?? 'Failed to load telemetry history.' },
      { status: response.status }
    );
  }

  const data = await response.json();
  return NextResponse.json(data);
}
