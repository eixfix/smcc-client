import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { email, password } = (await request.json()) as {
    email?: string;
    password?: string;
  };

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
  }

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!apiBaseUrl) {
    return NextResponse.json(
      { error: 'API base URL is not configured.' },
      { status: 500 }
    );
  }

  const response = await fetch(`${apiBaseUrl}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password }),
    cache: 'no-store'
  });

  if (!response.ok) {
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
  }

  const data = (await response.json()) as { accessToken?: string };

  if (!data.accessToken) {
    return NextResponse.json(
      { error: 'Authentication response was invalid.' },
      { status: 500 }
    );
  }

  const secure = process.env.NODE_ENV === 'production';

  cookies().set('lt_token', data.accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: 60 * 60
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  cookies().delete('lt_token');
  return NextResponse.json({ ok: true });
}
