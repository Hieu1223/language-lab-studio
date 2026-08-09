// Central fetch wrapper (doc §6 / §6.7.1).
//
// Responsibilities:
//  - Resolve the single backend base URL.
//  - Inject `Authorization: Bearer <token>`.
//  - Normalize every failure into one `ApiError` shape:
//      * 422 -> FastAPI `HTTPValidationError` parsed into `fields`
//      * other statuses -> `message`
//      * network failures -> `isNetwork: true`
//  - On 401, attempt exactly one `POST /token/refresh` + retry, else route to logout.
//
// This module is the ONLY place that talks to `fetch` for JSON endpoints.

// ─── Base URL ───────────────────────────────────────────────────────────────

const ENV = (import.meta as unknown as { env?: Record<string, string> }).env ?? {};

export const API_BASE_URL = (
  ENV.VITE_API_BASE_URL ||
  ENV.REACT_APP_BACKEND_URL ||
  'http://localhost:8000'
).replace(/\/+$/, '');

// ─── Token storage (§6.7.3: localStorage is a deliberate choice) ────────────

const ACCESS_TOKEN_KEY = 'nihongo-token';
const REFRESH_TOKEN_KEY = 'nihongo-refresh-token';

export function getStoredToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function storeToken(token: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function getStoredRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function storeRefreshToken(token: string): void {
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

// ─── Error normalization ────────────────────────────────────────────────────

export interface FieldError {
  loc: (string | number)[];
  msg: string;
  type: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly fields?: FieldError[];
  /** True when the failure was network-level (no HTTP status was received). */
  readonly isNetwork: boolean;

  constructor(status: number, message: string, fields?: FieldError[], isNetwork = false) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fields = fields;
    this.isNetwork = isNetwork;
  }

  /** Map 422 field errors back onto form inputs by field name. */
  fieldError(name: string): string | undefined {
    return this.fields?.find((f) => f.loc[f.loc.length - 1] === name)?.msg;
  }
}

function parseFieldErrors(detail: unknown): FieldError[] | undefined {
  if (!Array.isArray(detail)) return undefined;
  const fields = detail
    .filter((d): d is Record<string, unknown> => !!d && typeof d === 'object' && 'loc' in d)
    .map((d) => ({
      loc: Array.isArray(d.loc) ? (d.loc as (string | number)[]) : [],
      msg: typeof d.msg === 'string' ? d.msg : 'Invalid value',
      type: typeof d.type === 'string' ? d.type : '',
    }));
  return fields.length > 0 ? fields : undefined;
}

/** Extract a human-readable message from a FastAPI error body. */
function parseMessage(parsed: unknown, status: number): string {
  const detail = (parsed as { detail?: unknown } | null)?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    const first = detail.find((d) => d && typeof d === 'object' && 'msg' in d);
    if (first) return String((first as { msg: unknown }).msg);
  }
  return `Request failed with status ${status}`;
}

// ─── Connectivity signalling (§6.7.2) ───────────────────────────────────────
// A transient network error does NOT flip the app offline directly; it notifies
// subscribers, which debounce a verification ping before changing status.

type NetworkListener = (ok: boolean) => void;
const networkListeners = new Set<NetworkListener>();

export function subscribeNetworkStatus(listener: NetworkListener): () => void {
  networkListeners.add(listener);
  return () => networkListeners.delete(listener);
}

function notifyNetwork(ok: boolean) {
  for (const listener of networkListeners) listener(ok);
}

// ─── Unauthorized handling ──────────────────────────────────────────────────

let onUnauthorizedCb: (() => void) | null = null;

/** Register the logout routine invoked when refreshing fails. */
export function onUnauthorized(cb: (() => void) | null): void {
  onUnauthorizedCb = cb;
}

/** In-flight refresh, shared so concurrent 401s trigger only one refresh. */
let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refresh = getStoredRefreshToken();
  if (!refresh) return null;

  // POST /token/refresh takes `refresh_token` as a QUERY parameter.
  const url = `${API_BASE_URL}/token/refresh?refresh_token=${encodeURIComponent(refresh)}`;
  try {
    const res = await fetch(url, { method: 'POST' });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      access_token?: string;
      refresh_token?: string;
    };
    if (!data.access_token) return null;
    storeToken(data.access_token);
    if (data.refresh_token) storeRefreshToken(data.refresh_token);
    return data.access_token;
  } catch {
    return null;
  }
}

function requestRefresh(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = refreshAccessToken().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

// ─── Request ────────────────────────────────────────────────────────────────

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** JSON body. Ignored when `form` is set. */
  body?: unknown;
  /** Form-encoded body (used by the OAuth2 `POST /token` endpoint). */
  form?: Record<string, string>;
  query?: Record<string, QueryValue>;
  headers?: Record<string, string>;
  /** Explicit bearer token; defaults to the stored access token. */
  token?: string;
  /** Skip bearer injection and the 401-refresh-retry interceptor. */
  skipAuth?: boolean;
  signal?: AbortSignal;
}

export function buildUrl(endpoint: string, query?: Record<string, QueryValue>): string {
  let url = `${API_BASE_URL}${endpoint}`;
  if (query) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue;
      params.append(key, String(value));
    }
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }
  return url;
}

export async function apiCall<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, form, query, skipAuth = false, signal } = options;
  const url = buildUrl(endpoint, query);

  const doFetch = (accessToken?: string | null): Promise<Response> => {
    const headers: Record<string, string> = { ...options.headers };
    let payload: BodyInit | undefined;

    if (form) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      payload = new URLSearchParams(form).toString();
    } else if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    }

    if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

    return fetch(url, { method, headers, body: payload, signal });
  };

  const token = skipAuth ? undefined : (options.token ?? getStoredToken());

  let response: Response;
  try {
    response = await doFetch(token);
    notifyNetwork(true);
  } catch (err) {
    // Aborts are caller-intended, not connectivity problems.
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    notifyNetwork(false);
    throw new ApiError(
      0,
      'Could not reach the server. Check your connection and try again.',
      undefined,
      true,
    );
  }

  // 401 -> one refresh + retry, else logout.
  if (response.status === 401 && !skipAuth) {
    const newToken = await requestRefresh();
    if (newToken) {
      try {
        response = await doFetch(newToken);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') throw err;
        notifyNetwork(false);
        throw new ApiError(0, 'Could not reach the server.', undefined, true);
      }
    } else {
      clearToken();
      onUnauthorizedCb?.();
    }
  }

  if (!response.ok) {
    let parsed: unknown = null;
    try {
      parsed = await response.json();
    } catch {
      /* body was empty or not JSON */
    }
    if (response.status === 422) {
      throw new ApiError(
        422,
        parseMessage(parsed, 422),
        parseFieldErrors((parsed as { detail?: unknown } | null)?.detail),
      );
    }
    throw new ApiError(response.status, parseMessage(parsed, response.status));
  }

  // 204 / empty bodies (DELETE endpoints).
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  if (!text) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

/** GET /ping — liveness probe used by the splash loop and connectivity monitor. */
export async function ping(signal?: AbortSignal): Promise<void> {
  await apiCall('/ping', { skipAuth: true, signal });
}
