// User endpoints: /user/register, /user/check, /user/me, /user/settings.
import { apiCall } from './client';
import type { components } from './types.gen';

export type UserResponse = components['schemas']['UserResponse'];
export type UserSettingsResponse = components['schemas']['UserSettingsResponse'];
type RegisterRequest = components['schemas']['RegisterRequest'];
type SaveUserSettingsRequest = components['schemas']['SaveUserSettingsRequest'];

export async function register(
  username: string,
  password: string,
  displayName?: string | null,
): Promise<UserResponse> {
  const body: RegisterRequest = {
    username,
    password,
    display_name: displayName ?? null,
  };
  return apiCall<UserResponse>('/user/register', {
    method: 'POST',
    skipAuth: true,
    body,
  });
}

/** GET /user/check — validates the current token and returns the user. */
export async function checkValid(): Promise<UserResponse> {
  return apiCall<UserResponse>('/user/check');
}

/** GET /user/me — the authenticated user's profile. */
export async function getMe(): Promise<UserResponse> {
  return apiCall<UserResponse>('/user/me');
}

/** GET /user/settings — opaque settings blob owned by the frontend (§5.7). */
export async function getUserSettings(): Promise<UserSettingsResponse> {
  return apiCall<UserSettingsResponse>('/user/settings');
}

/** POST /user/settings — writes the whole blob; the backend stores it opaquely. */
export async function saveUserSettings(
  settings: Record<string, unknown>,
): Promise<UserSettingsResponse> {
  const body: SaveUserSettingsRequest = { settings };
  return apiCall<UserSettingsResponse>('/user/settings', { method: 'POST', body });
}
