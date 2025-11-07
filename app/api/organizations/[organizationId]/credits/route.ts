import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

function getApiBaseUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.API_BASE_URL;
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

  const { amount } =
    typeof payload === 'object' && payload !== null
      ? (payload as { amount?: unknown })
      : { amount: undefined };

  if (typeof amount !== 'number') {
    return NextResponse.json({ error: 'The "amount" field must be a number.' }, { status: 400 });
  }

  try {
    const response = await fetch(`${apiBaseUrl}/organizations/${params.organizationId}/credits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ amount })
    });

    const body = await response
      .json()
      .catch(() => (response.ok ? {} : { error: 'Unexpected API response.' }));

    return NextResponse.json(body, { status: response.status });
  } catch (error) {
    console.warn('Failed to proxy credit top-up', error);
    return NextResponse.json({ error: 'Unable to reach the API.' }, { status: 502 });
  }
}
