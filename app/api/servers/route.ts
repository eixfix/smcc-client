import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const token = cookies().get('lt_token')?.value;

  if (!apiBaseUrl || !token) {
    return NextResponse.json(
      { error: 'Unable to authenticate with the API. Please sign in again.' },
      { status: 401 }
    );
  }

  const payload = (await request.json().catch(() => ({}))) as {
    organizationId?: string;
    name?: string;
    hostname?: string;
    description?: string;
  };

  const response = await fetch(`${apiBaseUrl}/servers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload ?? {}),
    cache: 'no-store'
  });

  if (!response.ok) {
    const errorPayload = (await response.json().catch(() => ({}))) as { message?: string };
    return NextResponse.json(
      { error: errorPayload.message ?? 'Failed to register server.' },
      { status: response.status }
    );
  }

  const data = await response.json();
  return NextResponse.json(data);
}
