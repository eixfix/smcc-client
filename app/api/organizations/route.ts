import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  const token = cookies().get('lt_token')?.value;

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.API_BASE_URL;

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
    const response = await fetch(`${apiBaseUrl}/organizations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const responseBody = await response
      .json()
      .catch(() => (response.ok ? {} : { error: 'Unexpected API response.' }));

    return NextResponse.json(responseBody, { status: response.status });
  } catch (error) {
    console.warn('Failed to proxy organization creation', error);
    return NextResponse.json({ error: 'Unable to reach the API.' }, { status: 502 });
  }
}
