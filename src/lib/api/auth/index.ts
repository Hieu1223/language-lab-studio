import type { User, LoginResponse, GoogleLinkResponse } from './types';

export type { User, LoginRequest, RegisterRequest, LoginResponse, UpdateProfileRequest, ChangePasswordRequest, GoogleLinkResponse } from './types';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

let currentUser: User | null = null;

const mockUser: User = {
  id: 'user-1',
  name: 'Nguyễn Văn A',
  email: 'nguyen@example.com',
  avatarUrl: '',
  googleLinked: false,
  createdAt: '2026-01-01T00:00:00Z',
};

export async function login(email: string, password: string): Promise<LoginResponse> {
  await delay(500);
  currentUser = { ...mockUser, email };
  return { user: currentUser, token: 'mock-token-123' };
}

export async function register(name: string, email: string, password: string): Promise<LoginResponse> {
  await delay(500);
  currentUser = { ...mockUser, name, email };
  return { user: currentUser, token: 'mock-token-123' };
}

export async function loginWithGoogle(): Promise<LoginResponse> {
  await delay(500);
  currentUser = { ...mockUser, name: 'Google User', email: 'google@example.com', googleLinked: true };
  return { user: currentUser, token: 'mock-token-google' };
}

export async function getCurrentUser(): Promise<User | null> {
  await delay(200);
  return currentUser;
}

export async function updateProfile(name: string, email: string, avatarUrl: string): Promise<User> {
  await delay(300);
  if (!currentUser) throw new Error('Not logged in');
  currentUser = { ...currentUser, name, email, avatarUrl };
  return currentUser;
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<boolean> {
  await delay(300);
  return true;
}

export async function linkGoogle(): Promise<GoogleLinkResponse> {
  await delay(500);
  if (!currentUser) throw new Error('Not logged in');
  currentUser = { ...currentUser, googleLinked: true };
  return { success: true, googleEmail: 'linked@google.com' };
}

export async function unlinkGoogle(): Promise<boolean> {
  await delay(300);
  if (!currentUser) throw new Error('Not logged in');
  currentUser = { ...currentUser, googleLinked: false };
  return true;
}

export async function logout(): Promise<void> {
  await delay(100);
  currentUser = null;
}
