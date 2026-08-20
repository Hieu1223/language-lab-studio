// User management endpoints
// Matches: /user/* routes from OpenAPI spec
import { apiCall } from './client';
import type { components } from './types.gen';

// ─── Types ──────────────────────────────────────────────────────────────────

export type UserResponse = components['schemas']['UserResponse'];
export type UserSettingsResponse = components['schemas']['UserSettingsResponse'];
export type RegisterRequest = components['schemas']['RegisterRequest'];
export type UpdateUserRequest = components['schemas']['UpdateUserRequest'];
export type UpdateUserPartialRequest = components['schemas']['UpdateUserPartialRequest'];
export type SaveUserSettingsRequest = components['schemas']['SaveUserSettingsRequest'];

// ─── Registration ───────────────────────────────────────────────────────────

/** POST /user/register — Register new user */
export async function register(
  username: string,
  password: string,
  displayName?: string | null,
): Promise<UserResponse> {
  return apiCall<UserResponse>('/user/register', {
    method: 'POST',
    body: { username, password, display_name: displayName ?? null } as RegisterRequest,
  });
}

// ─── Current User ───────────────────────────────────────────────────────────

/** GET /user/check — Validate current token and get user */
export async function checkValid(): Promise<UserResponse> {
  return apiCall<UserResponse>('/user/check');
}

/** GET /user/me — Get current user profile */
export async function getMe(): Promise<UserResponse> {
  return apiCall<UserResponse>('/user/me');
}

// ─── Settings ───────────────────────────────────────────────────────────────

/** GET /user/settings — Get current user settings */
export async function getUserSettings(): Promise<UserSettingsResponse> {
  return apiCall<UserSettingsResponse>('/user/settings');
}

/** POST /user/settings — Save current user settings */
export async function saveUserSettings(settings: Record<string, unknown>): Promise<UserSettingsResponse> {
  return apiCall<UserSettingsResponse>('/user/settings', {
    method: 'POST',
    body: { settings } as SaveUserSettingsRequest,
  });
}

// ─── User Management ────────────────────────────────────────────────────────

/** GET /user/{user_id} — Get user by ID */
export async function getUser(userId: string): Promise<UserResponse> {
  return apiCall<UserResponse>(`/user/${encodeURIComponent(userId)}`);
}

/** PUT /user/{user_id} — Fully update user (owner only) */
export async function updateUser(userId: string, data: UpdateUserRequest): Promise<UserResponse> {
  return apiCall<UserResponse>(`/user/${encodeURIComponent(userId)}`, {
    method: 'PUT',
    body: data,
  });
}

/** PATCH /user/{user_id} — Partially update user (owner only) */
export async function updateUserPartial(
  userId: string,
  data: UpdateUserPartialRequest,
): Promise<UserResponse> {
  return apiCall<UserResponse>(`/user/${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    body: data,
  });
}

/** DELETE /user/{user_id} — Delete user (owner only) */
export async function deleteUser(userId: string): Promise<void> {
  await apiCall(`/user/${encodeURIComponent(userId)}`, { method: 'DELETE' });
}

/** GET /user/ — List users with pagination */
export async function listUsers(offset = 0, limit = 50): Promise<UserResponse[]> {
  return apiCall<UserResponse[]>('/user/', { query: { offset, limit } });
}
