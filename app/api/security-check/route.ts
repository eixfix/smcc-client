import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

function getApiBaseUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.API_BASE_URL;
}

export async function POST(request: Request) {
  const apiBaseUrl = getApiBaseUrl();
  const token = cookies().get('lt_token')?.value;

  if (!apiBaseUrl) {
    return NextResponse.json({ error: 'API base URL is not configured.' }, { status: 500 });
  }

  if (!token) {
    return NextResponse.json({ error: 'You are not authenticated.' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 });
  }

  const { organizationId, url } =
    typeof body === 'object' && body !== null
      ? (body as { organizationId?: unknown; url?: unknown })
      : { organizationId: undefined, url: undefined };

  if (!organizationId || typeof organizationId !== 'string') {
    return NextResponse.json({ error: 'The "organizationId" field is required.' }, { status: 400 });
  }

  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'The "url" field is required.' }, { status: 400 });
  }

  const response = await fetch(`${apiBaseUrl}/security/check`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ organizationId, url }),
    cache: 'no-store'
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    return NextResponse.json(
      { error: data?.message ?? data?.error ?? 'Security check failed.' },
      { status: response.status }
    );
  }

  return NextResponse.json(data);
}
