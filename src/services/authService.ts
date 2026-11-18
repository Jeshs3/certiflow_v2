export interface OfficerUser {
  username: string;
  name: string;
  role: 'admin_officer';
}

const TOKEN_STORAGE_KEY = 'certiflow_admin_token_v1';

export function getStoredAuthToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredAuthToken(token: string | null): void {
  try {
    if (token) {
      sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors in restricted environments
  }
}

export function getAuthHeaders(): Record<string, string> {
  const token = getStoredAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function safeParseJson<T>(res: Response): Promise<T | null> {
  try {
    const text = await res.text();
    if (!text) return null;
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function getFriendlyHttpError(status: number, serverMessage?: string): string {
  const cleaned = typeof serverMessage === 'string' ? serverMessage.trim() : '';
  const looksTechnical =
    !cleaned ||
    cleaned.startsWith('<') ||
    /SUPABASE_|SESSION_SECRET|ECONNREFUSED|ETIMEDOUT|SyntaxError|TypeError|Unexpected token/i.test(
      cleaned
    );

  if (!looksTechnical) {
    return cleaned;
  }

  if (status === 400) {
    return 'Please check your entered information and try again.';
  }
  if (status === 401) {
    return 'Incorrect email or password, or your session has expired. Please sign in again.';
  }
  if (status === 403) {
    return 'Your account does not have permission to perform this action.';
  }
  if (status === 404) {
    return 'The requested service could not be found. Please refresh the page and try again.';
  }
  if (status === 413) {
    return 'The document data is too large to process right now. Please try again.';
  }
  if (status === 429) {
    return 'Too many requests right now. Please wait a moment and try again.';
  }
  if (status === 502 || status === 503 || status === 504) {
    return 'Our server is temporarily unavailable. Please try again in a few moments.';
  }
  return 'Something went wrong on our side. Please try again in a moment.';
}

export async function fetchAuthSession(): Promise<{
  authenticated: boolean;
  user?: OfficerUser;
  backendError?: string;
}> {
  try {
    const res = await fetch('/api/auth/session', {
      method: 'GET',
      credentials: 'include',
      headers: {
        ...getAuthHeaders(),
      },
    });
    if (res.status === 401) {
      return { authenticated: false };
    }
    if (!res.ok) {
      const data = await safeParseJson<{ error?: string }>(res);
      return {
        authenticated: false,
        backendError:
          res.status >= 500
            ? getFriendlyHttpError(res.status, data?.error)
            : undefined,
      };
    }
    const data = await safeParseJson<{ authenticated?: boolean; user?: OfficerUser }>(res);
    if (data?.authenticated && data.user) {
      return { authenticated: true, user: data.user };
    }
    return { authenticated: false };
  } catch {
    return {
      authenticated: false,
      backendError:
        'Could not connect to the server. Please check your internet connection and refresh.',
    };
  }
}

export async function loginAdminOfficer(
  username: string,
  password: string
): Promise<{ ok: boolean; user?: OfficerUser; error?: string }> {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });
    const data = await safeParseJson<{
      ok?: boolean;
      token?: string;
      user?: OfficerUser;
      error?: string;
    }>(res);
    if (!res.ok || !data?.ok || !data.user) {
      return {
        ok: false,
        error: getFriendlyHttpError(res.status, data?.error),
      };
    }
    if (data.token) {
      setStoredAuthToken(data.token);
    }
    return { ok: true, user: data.user };
  } catch {
    return {
      ok: false,
      error: 'Unable to reach the sign-in service. Please check your connection and try again.',
    };
  }
}

export async function logoutAdminOfficer(): Promise<void> {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
      headers: {
        ...getAuthHeaders(),
      },
    });
  } catch {
    // Best-effort server logout
  } finally {
    setStoredAuthToken(null);
  }
}

export async function fetchBackendStats(): Promise<number | null> {
  try {
    const res = await fetch('/api/stats', {
      method: 'GET',
      credentials: 'include',
      headers: {
        ...getAuthHeaders(),
      },
    });
    if (!res.ok) return null;
    const data = await safeParseJson<{ ok?: boolean; totalExports?: number }>(res);
    return typeof data?.totalExports === 'number' ? data.totalExports : null;
  } catch {
    return null;
  }
}

export async function recordBackendExport(params: {
  certificateType: 'birth' | 'marriage';
  documentTitle: string;
  action: 'print' | 'pdf' | 'pdf-lib';
  pages: number;
}): Promise<number | null> {
  try {
    const res = await fetch('/api/print/log', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(params),
    });
    if (!res.ok) return null;
    const data = await safeParseJson<{ ok?: boolean; totalExports?: number }>(res);
    return typeof data?.totalExports === 'number' ? data.totalExports : null;
  } catch {
    return null;
  }
}
