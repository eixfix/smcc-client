import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

function getApiBaseUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.API_BASE_URL;
}

export async function GET() {
  const token = cookies().get('lt_token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) {
    return NextResponse.json({ error: 'API base URL is not configured.' }, { status: 500 });
  }

  try {
    const response = await fetch(`${apiBaseUrl}/projects/_/tasks/reports/recent`, {
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
    console.warn('Failed to proxy recent reports', error);
    return NextResponse.json({ error: 'Unable to reach the API.' }, { status: 502 });
  }
}
