// Authentication endpoints
// Matches: /token/* routes from OpenAPI spec
import { apiCall, storeToken, storeRefreshToken, clearToken } from './client';

/** POST /token — Login with username/password */
export async function login(username: string, password: string): Promise<{ access_token: string; refresh_token?: string }> {
  const result = await apiCall<Record<string, unknown>>('/token', {
    method: 'POST',
    form: {
      grant_type: 'password',
      username,
      password,
      scope: '',
    },
    skipAuth: true,
  });
  
  const accessToken = result.access_token as string | undefined;
  const refreshToken = result.refresh_token as string | undefined;
  
  if (accessToken) {
    storeToken(accessToken);
    if (refreshToken) storeRefreshToken(refreshToken);
  }
  
  return { access_token: accessToken!, refresh_token: refreshToken };
}

/** POST /token/refresh — Refresh access token */
export async function refreshToken(refreshToken: string): Promise<string> {
  const result = await apiCall<Record<string, unknown>>('/token/refresh', {
    method: 'POST',
    body: { refresh_token: refreshToken },
    skipAuth: true,
  });
  
  const newAccessToken = result.access_token as string | undefined;
  const newRefreshToken = result.refresh_token as string | undefined;
  
  if (newAccessToken) {
    storeToken(newAccessToken);
    if (newRefreshToken) storeRefreshToken(newRefreshToken);
  }
  
  return newAccessToken!;
}

/** POST /token/revoke — Revoke refresh token */
export async function revokeToken(refreshToken: string): Promise<void> {
  await apiCall('/token/revoke', {
    method: 'POST',
    body: { refresh_token: refreshToken },
  });
  clearToken();
}

/** Logout helper — clears local tokens */
export function logout(): void {
  clearToken();
}
