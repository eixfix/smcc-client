import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

function getApiBaseUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.API_BASE_URL;
}

export async function POST(
  _request: Request,
  { params }: { params: { projectId: string; taskId: string } }
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
    const response = await fetch(
      `${apiBaseUrl}/projects/${params.projectId}/tasks/${params.taskId}/run`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    const body = await response
      .json()
      .catch(() => (response.ok ? {} : { error: 'Unexpected API response.' }));

    return NextResponse.json(body, { status: response.status });
  } catch (error) {
    console.warn('Failed to proxy task run', error);
    return NextResponse.json({ error: 'Unable to reach the API.' }, { status: 502 });
  }
}
