export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  googleLinked: boolean;
  createdAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}

export interface UpdateProfileRequest {
  name: string;
  email: string;
  avatarUrl: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface GoogleLinkResponse {
  success: boolean;
  googleEmail: string;
}
