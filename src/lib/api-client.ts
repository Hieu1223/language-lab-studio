const API_BASE_URL = 'https://japlearningbackend.onrender.com';

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
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  token?: string;
  formData?: boolean;
  query?: Record<string, string | number>;
}

export async function apiCall<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = 'GET', headers = {}, body, token, formData, query } = options;

  let url = `${API_BASE_URL}${endpoint}`;

  // Add query parameters
  if (query) {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      params.append(key, String(value));
    });
    url += `?${params.toString()}`;
  }
  const requestHeaders: Record<string, string> = {
    ...headers,
  };

  // Only set Content-Type if not already set and not using form data
  if (!headers['Content-Type'] && !formData) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }

  const requestConfig: RequestInit = {
    method,
    headers: requestHeaders,
  };

  if (body) {
    if (formData && body instanceof URLSearchParams) {
      requestConfig.body = body;
    } else {
      requestConfig.body = JSON.stringify(body);
    }
  }

  try {
    const response = await fetch(url, requestConfig);

    if (!response.ok) {
      let errorDetails: unknown;
      try {
        errorDetails = await response.json();
      } catch {
        errorDetails = await response.text();
      }
      throw new APIError(response.status, `API Error: ${response.statusText}`, errorDetails);
    }

    const data = await response.json();
    return data as T;
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
