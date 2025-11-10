import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

type Params = {
  params: {
    serverId: string;
  };
};

export async function POST(request: Request, { params }: Params) {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const token = cookies().get('lt_token')?.value;

  if (!apiBaseUrl || !token) {
    return NextResponse.json(
      { error: 'Unable to authenticate with the API. Please sign in again.' },
      { status: 401 }
    );
  }

  const response = await fetch(`${apiBaseUrl}/servers/${params.serverId}/install-link`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`
    },
    cache: 'no-store'
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { message?: string };
    return NextResponse.json(
      { error: payload.message ?? 'Unable to generate install link.' },
      { status: response.status }
    );
  }

  const data = await response.json();
  return NextResponse.json(data);
}
