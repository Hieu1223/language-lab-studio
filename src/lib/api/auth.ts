// Auth endpoints: POST /token, /token/refresh, /token/revoke (doc §5.2).
import { apiCall, storeToken, storeRefreshToken, clearToken } from './client';

export interface TokenResponse {
  access_token: string;
  token_type: string;
  refresh_token?: string;
}

/**
 * The `/token` endpoints are typed as a free-form object in the OpenAPI spec,
 * so the refresh token can arrive under a few different names (and sometimes
 * nested). Pull it out of whatever shape came back.
 */
export function extractRefreshToken(res: unknown): string | null {
  if (!res || typeof res !== 'object') return null;
  const obj = res as Record<string, unknown>;
  const keys = ['refresh_token', 'refreshToken', 'refresh'];
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === 'string' && value) return value;
  }
  for (const nested of ['data', 'tokens', 'token']) {
    const child = obj[nested];
    if (child && typeof child === 'object') {
      const found = extractRefreshToken(child);
      if (found) return found;
    }
  }
  return null;
}

/** Same tolerance for the access token. */
export function extractAccessToken(res: unknown): string | null {
  if (!res || typeof res !== 'object') return null;
  const obj = res as Record<string, unknown>;
  for (const key of ['access_token', 'accessToken', 'token']) {
    const value = obj[key];
    if (typeof value === 'string' && value) return value;
  }
  for (const nested of ['data', 'tokens']) {
    const child = obj[nested];
    if (child && typeof child === 'object') {
      const found = extractAccessToken(child);
      if (found) return found;
    }
  }
  return null;
}

/** Persist whatever tokens a `/token*` response carried. */
function persistTokens(res: unknown): TokenResponse {
  const access = extractAccessToken(res);
  const refresh = extractRefreshToken(res);
  if (access) storeToken(access);
  if (refresh) storeRefreshToken(refresh);
  return {
    access_token: access ?? '',
    token_type: (res as { token_type?: string })?.token_type ?? 'bearer',
    refresh_token: refresh ?? undefined,
  };
}

/**
 * OAuth2 password grant. `POST /token` expects a form-encoded body
 * (`Body_login_token_post`), not JSON.
 */
export async function login(username: string, password: string): Promise<TokenResponse> {
  const res = await apiCall<unknown>('/token', {
    method: 'POST',
    skipAuth: true,
    form: { grant_type: 'password', username, password },
  });
  return persistTokens(res);
}

/** `POST /token/refresh` — `refresh_token` is a query parameter. */
export async function refresh(refreshToken: string): Promise<TokenResponse> {
  const res = await apiCall<unknown>('/token/refresh', {
    method: 'POST',
    skipAuth: true,
    query: { refresh_token: refreshToken },
  });
  return persistTokens(res);
}

/** `POST /token/revoke` — `refresh_token` is a query parameter. */
export async function revoke(refreshToken: string): Promise<void> {
  await apiCall('/token/revoke', {
    method: 'POST',
    query: { refresh_token: refreshToken },
  });
}

/** Best-effort server-side revoke followed by an unconditional local clear. */
export async function logout(refreshToken?: string | null): Promise<void> {
  if (refreshToken) {
    try {
      await revoke(refreshToken);
    } catch {
      /* logging out locally matters more than the server round-trip */
    }
  }
  clearToken();
}
