import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

function getApiBaseUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.API_BASE_URL;
}

export async function GET(
  _request: Request,
  { params }: { params: { organizationId: string } }
) {
  const token = cookies().get('lt_token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) {
    return NextResponse.json({ error: 'API base URL is not configured.' }, { status: 500 });
  }

  try {
    const response = await fetch(`${apiBaseUrl}/organizations/${params.organizationId}/projects`, {
      headers: {
        Authorization: `Bearer ${token}`
      },
      cache: 'no-store'
    });

    const body = await response
      .json()
      .catch(() => (response.ok ? [] : { error: 'Unexpected API response.' }));

    return NextResponse.json(body, { status: response.status });
  } catch (error) {
    console.warn('Failed to proxy project fetch', error);
    return NextResponse.json({ error: 'Unable to reach the API.' }, { status: 502 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { organizationId: string } }
) {
  const token = cookies().get('lt_token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) {
    return NextResponse.json({ error: 'API base URL is not configured.' }, { status: 500 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch (error) {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  try {
    const response = await fetch(`${apiBaseUrl}/organizations/${params.organizationId}/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const body = await response
      .json()
      .catch(() => (response.ok ? {} : { error: 'Unexpected API response.' }));

    return NextResponse.json(body, { status: response.status });
  } catch (error) {
    console.warn('Failed to proxy project creation', error);
    return NextResponse.json({ error: 'Unable to reach the API.' }, { status: 502 });
  }
}
