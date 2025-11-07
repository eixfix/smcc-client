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

  const response = await fetch(`${apiBaseUrl}/projects/_/tasks/reports/recent/export`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const arrayBuffer = await response.arrayBuffer();

  return new NextResponse(arrayBuffer, {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('content-type') ?? 'application/pdf',
      'Content-Disposition':
        response.headers.get('content-disposition') ?? 'attachment; filename="load-test-report.pdf"'
    }
  });
}
