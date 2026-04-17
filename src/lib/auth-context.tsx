import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { clearToken, getStoredToken, storeToken } from './api-client';

export interface User {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  createdAt?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, displayName?: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = getStoredToken();
    const storedUser = localStorage.getItem('nihongo-user');
    if (storedToken) {
      setToken(storedToken);
    }
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    const response = await fetch('https://japlearningbackend.onrender.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        username,
        password,
        grant_type: 'password',
      }).toString(),
    });

    if (!response.ok) {
      throw new Error('Login failed');
    }

    const data = await response.json();
    const newToken = data.access_token;
    setToken(newToken);
    storeToken(newToken);

    // Extract user info (in a real app, you'd fetch the user info separately)
    const mockUser: User = {
      id: '8d0d3722-3169-4fe8-aa3b-5d41f06ba1d0',
      name: username,
      email: `${username}@example.com`,
      createdAt: new Date().toISOString(),
    };
    setUser(mockUser);
    localStorage.setItem('nihongo-user', JSON.stringify(mockUser));
  };

  const register = async (username: string, password: string, displayName?: string) => {
    const response = await fetch('https://japlearningbackend.onrender.com/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        password,
        display_name: displayName,
      }),
    });

    if (!response.ok) {
      throw new Error('Registration failed');
    }

    // After successful registration, auto-login
    await login(username, password);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    clearToken();
    localStorage.removeItem('nihongo-user');
  };

  return (
    <AuthContext.Provider
      value={{ user, token, isLoading, login, register, logout, setUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
