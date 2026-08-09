// Auth endpoints: POST /token, /token/refresh, /token/revoke (doc §5.2).
import { apiCall, storeToken, storeRefreshToken, clearToken } from './client';

export interface TokenResponse {
  access_token: string;
  token_type: string;
  refresh_token?: string;
}

/**
 * OAuth2 password grant. `POST /token` expects a form-encoded body
 * (`Body_login_token_post`), not JSON.
 */
export async function login(username: string, password: string): Promise<TokenResponse> {
  const res = await apiCall<TokenResponse>('/token', {
    method: 'POST',
    skipAuth: true,
    form: { grant_type: 'password', username, password },
  });
  storeToken(res.access_token);
  if (res.refresh_token) storeRefreshToken(res.refresh_token);
  return res;
}

/** `POST /token/refresh` — `refresh_token` is a query parameter. */
export async function refresh(refreshToken: string): Promise<TokenResponse> {
  const res = await apiCall<TokenResponse>('/token/refresh', {
    method: 'POST',
    skipAuth: true,
    query: { refresh_token: refreshToken },
  });
  storeToken(res.access_token);
  if (res.refresh_token) storeRefreshToken(res.refresh_token);
  return res;
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
