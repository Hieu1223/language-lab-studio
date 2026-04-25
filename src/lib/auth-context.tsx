import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import {
  AUTH_UNAUTHORIZED_EVENT,
  apiCall,
  clearToken,
  getStoredToken,
  storeToken,
} from './api-client';

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
    if (storedToken) setToken(storedToken);
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        // ignore
      }
    }
    setIsLoading(false);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    clearToken();
    localStorage.removeItem('nihongo-user');
  }, []);

  // Global 401 interceptor: any apiCall returning 401 dispatches `auth:unauthorized`
  useEffect(() => {
    let lastForce = 0;
    const handler = () => {
      // Debounce repeated 401s in a short window
      const now = Date.now();
      if (now - lastForce < 1500) return;
      lastForce = now;
      const wasLoggedIn = !!getStoredToken();
      logout();
      if (wasLoggedIn && typeof window !== 'undefined') {
        const next = encodeURIComponent(window.location.pathname + window.location.search);
        if (!window.location.pathname.startsWith('/login')) {
          window.location.assign(`/login?expired=1&next=${next}`);
        }
      }
    };
    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handler);
    return () => window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handler);
  }, [logout]);

  const login = async (username: string, password: string) => {
    const data = await apiCall<{ access_token: string; token_type: string }>('/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        username,
        password,
        grant_type: 'password',
      }).toString(),
      skipAuthInterceptor: true,
    });

    const newToken = data.access_token;
    setToken(newToken);
    storeToken(newToken);

    // Fetch user info via /check
    let mockUser: User;
    try {
      const checked = await apiCall<{ id?: string; display_name?: string; name?: string }>(
        '/check',
        { method: 'GET', token: newToken },
      );
      mockUser = {
        id: checked.id || '8d0d3722-3169-4fe8-aa3b-5d41f06ba1d0',
        name: checked.display_name || checked.name || username,
        email: `${username}@example.com`,
        createdAt: new Date().toISOString(),
      };
    } catch {
      mockUser = {
        id: '8d0d3722-3169-4fe8-aa3b-5d41f06ba1d0',
        name: username,
        email: `${username}@example.com`,
        createdAt: new Date().toISOString(),
      };
    }
    setUser(mockUser);
    localStorage.setItem('nihongo-user', JSON.stringify(mockUser));
  };

  const register = async (username: string, password: string, displayName?: string) => {
    await apiCall('/register', {
      method: 'POST',
      body: { username, password, display_name: displayName },
      skipAuthInterceptor: true,
    });
    // Auto-login after registration
    await login(username, password);
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
