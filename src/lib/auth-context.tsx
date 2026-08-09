import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { jwtDecode } from 'jwt-decode';
import * as authApi from '@/lib/api/auth';
import * as userApi from '@/lib/api/user';
import {
  clearToken,
  getStoredRefreshToken,
  getStoredToken,
  onUnauthorized,
} from '@/lib/api/client';

export interface User {
  id: string;
  name: string;
  createdAt?: string;
  lastLoggedIn?: string | null;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, displayName?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const USER_KEY = 'nihongo-user';

/** Refresh this many ms before the access token actually expires. */
const REFRESH_SKEW_MS = 60_000;

function toUser(res: userApi.UserResponse, fallbackName: string): User {
  return {
    id: res.id,
    name: res.display_name || fallbackName,
    createdAt: res.created_at,
    lastLoggedIn: res.last_logged_in ?? null,
  };
}

function readCachedUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function cacheUser(user: User | null): void {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  } catch {
    /* private mode */
  }
}

/** Milliseconds until the JWT expires, or null when it carries no `exp`. */
function msUntilExpiry(token: string): number | null {
  try {
    const { exp } = jwtDecode<{ exp?: number }>(token);
    if (!exp) return null;
    return exp * 1000 - Date.now();
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(readCachedUser);
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [isLoading, setIsLoading] = useState(true);
  const refreshTimer = useRef<number | null>(null);

  const logout = useCallback(() => {
    const refreshToken = getStoredRefreshToken();
    setUser(null);
    setToken(null);
    cacheUser(null);
    clearToken();
    void authApi.logout(refreshToken);
  }, []);

  // The API client calls this when a 401 could not be resolved by refreshing.
  useEffect(() => {
    onUnauthorized(() => {
      setUser(null);
      setToken(null);
      cacheUser(null);
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        const next = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.assign(`/login?expired=1&next=${next}`);
      }
    });
    return () => onUnauthorized(null);
  }, []);

  /** Schedule a silent refresh just before the access token expires (§6.5). */
  const scheduleRefresh = useCallback((accessToken: string) => {
    if (refreshTimer.current != null) {
      window.clearTimeout(refreshTimer.current);
      refreshTimer.current = null;
    }
    const remaining = msUntilExpiry(accessToken);
    if (remaining == null) return;

    const delay = Math.max(5_000, remaining - REFRESH_SKEW_MS);
    refreshTimer.current = window.setTimeout(async () => {
      const refreshToken = getStoredRefreshToken();
      if (!refreshToken) return;
      try {
        const res = await authApi.refresh(refreshToken);
        setToken(res.access_token);
        scheduleRefresh(res.access_token);
      } catch {
        /* the next 401 drives the logout path */
      }
    }, delay);
  }, []);

  useEffect(() => {
    return () => {
      if (refreshTimer.current != null) window.clearTimeout(refreshTimer.current);
    };
  }, []);

  // Boot: validate any stored token against the server.
  useEffect(() => {
    const stored = getStoredToken();
    if (!stored) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    scheduleRefresh(stored);

    userApi
      .checkValid()
      .then((res) => {
        if (cancelled) return;
        const next = toUser(res, user?.name ?? 'me');
        setUser(next);
        cacheUser(next);
      })
      .catch(() => {
        // A 401 is handled by the interceptor; anything else (offline) keeps
        // the cached user so the app still renders.
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // Intentionally boot-only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(
    async (username: string, password: string) => {
      const res = await authApi.login(username, password);
      setToken(res.access_token);
      scheduleRefresh(res.access_token);

      const me = await userApi.checkValid();
      const next = toUser(me, username);
      setUser(next);
      cacheUser(next);
    },
    [scheduleRefresh],
  );

  const register = useCallback(
    async (username: string, password: string, displayName?: string) => {
      await userApi.register(username, password, displayName);
      await login(username, password);
    },
    [login],
  );

  const value = useMemo<AuthContextValue>(
    () => ({ user, token, isLoading, login, register, logout }),
    [user, token, isLoading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
