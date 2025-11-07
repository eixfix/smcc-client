export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  role: string;
};

export async function fetchCurrentUser(
  apiBaseUrl?: string,
  token?: string
): Promise<CurrentUser | null> {
  if (!apiBaseUrl || !token) {
    return null;
  }

  try {
    const response = await fetch(`${apiBaseUrl}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as CurrentUser;
  } catch (error) {
    console.warn('Failed to fetch current user', error);
    return null;
  }
}
