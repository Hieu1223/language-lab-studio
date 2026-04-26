export const API_BASE_URL = 'https://japlearningbackend.onrender.com';

export class APIError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'APIError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  token?: string;
  formData?: boolean;
  query?: Record<string, string | number | boolean | undefined | null>;
  /** Skip the global 401 interceptor (used by login/register flows). */
  skipAuthInterceptor?: boolean;
}

/** Custom event name dispatched on the window when a request returns 401. */
export const AUTH_UNAUTHORIZED_EVENT = 'auth:unauthorized';

function emitUnauthorized() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(AUTH_UNAUTHORIZED_EVENT));
  }
}

export async function apiCall<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    method = 'GET',
    headers = {},
    body,
    token,
    formData,
    query,
    skipAuthInterceptor = false,
  } = options;

  let url = `${API_BASE_URL}${endpoint}`;

  // Add query parameters
  if (query) {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      params.append(key, String(value));
    });
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }
  const requestHeaders: Record<string, string> = {
    ...headers,
  };

  // Only set Content-Type if not already set and not using form data
  if (!headers['Content-Type'] && !formData) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  // Auto-attach bearer token from localStorage if not explicitly set
  const effectiveToken = token ?? getStoredToken();
  if (effectiveToken) {
    requestHeaders['Authorization'] = `Bearer ${effectiveToken}`;
  }

  const requestConfig: RequestInit = {
    method,
    headers: requestHeaders,
  };

  if (body !== undefined && body !== null) {
    if (formData && body instanceof URLSearchParams) {
      requestConfig.body = body;
    } else {
      requestConfig.body = JSON.stringify(body);
    }
  }

  try {
    const response = await fetch(url, requestConfig);

    if (response.status === 401 && !skipAuthInterceptor) {
      emitUnauthorized();
    }

    if (!response.ok) {
      let errorDetails: unknown;
      try {
        errorDetails = await response.json();
      } catch {
        try {
          errorDetails = await response.text();
        } catch {
          errorDetails = null;
        }
      }
      throw new APIError(response.status, `API Error: ${response.statusText}`, errorDetails);
    }

    // Some endpoints (DELETE) may have empty bodies
    const text = await response.text();
    if (!text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      return text as unknown as T;
    }
  } catch (error) {
    if (error instanceof APIError) throw error;
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new APIError(0, 'Network error: Could not connect to server. Please check your connection and try again.', error);
    }
    throw new APIError(0, error instanceof Error ? error.message : 'Unknown error');
  }
}

// Auth endpoints
export async function registerUser(username: string, password: string, displayName?: string) {
  return apiCall('/register', {
    method: 'POST',
    body: { username, password, display_name: displayName },
    skipAuthInterceptor: true,
  });
}

export async function loginUser(username: string, password: string) {
  const response = await apiCall<{ access_token: string; token_type: string }>('/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      username,
      password,
      grant_type: 'password',
    }).toString(),
    skipAuthInterceptor: true,
  });
  return response;
}

// Utility to get stored token
export function getStoredToken(): string | null {
  return localStorage.getItem('nihongo-token');
}

// Utility to store token
export function storeToken(token: string): void {
  localStorage.setItem('nihongo-token', token);
}

// Utility to clear token
export function clearToken(): void {
  localStorage.removeItem('nihongo-token');
}

// ─── App-wide background ping ───────────────────────────────────────────────
/**
 * Starts a background ping loop. Pings /ping every `intervalMs`.
 * If the server is unreachable for too long or returns 5xx, we just log;
 * 401 is *not* expected on /ping but if it happens we fall through to the interceptor.
 *
 * Returns a stop function.
 */
export function startBackgroundPing(intervalMs: number = 3 * 60 * 1000) {
  let stopped = false;
  let timer: number | null = null;

  const tick = async () => {
    if (stopped) return;
    try {
      const ctl = new AbortController();
      const to = setTimeout(() => ctl.abort(), 10_000);
      await fetch(`${API_BASE_URL}/ping`, {
        method: 'GET',
        signal: ctl.signal,
        cache: 'no-store',
      });
      clearTimeout(to);
    } catch {
      /* ignore — server may be cold/sleeping */
    } finally {
      if (!stopped) {
        timer = window.setTimeout(tick, intervalMs);
      }
    }
  };

  // Schedule first tick after the interval (initial /ping is handled by SplashScreen)
  timer = window.setTimeout(tick, intervalMs);

  return () => {
    stopped = true;
    if (timer != null) clearTimeout(timer);
  };
}
