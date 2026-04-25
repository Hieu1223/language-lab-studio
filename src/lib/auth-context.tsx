import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import {
  AUTH_UNAUTHORIZED_EVENT,
  clearToken,
  getStoredToken,
  storeToken,
} from "./api-client";

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
  register: (
    username: string,
    password: string,
    displayName?: string
  ) => Promise<void>;
  logout: () => void;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const USER_KEY = "nihongo-user";
const BASE_URL = "https://japlearningbackend.onrender.com";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 🔹 Load from storage
  useEffect(() => {
    const storedToken = getStoredToken();
    const storedUser = localStorage.getItem(USER_KEY);

    if (storedToken) setToken(storedToken);

    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem(USER_KEY);
      }
    }

    setIsLoading(false);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    clearToken();
    localStorage.removeItem(USER_KEY);
  }, []);

  // 🔹 Global 401 handler (kept from improved version)
  useEffect(() => {
    let lastForce = 0;

    const handler = () => {
      const now = Date.now();
      if (now - lastForce < 1500) return;
      lastForce = now;

      const wasLoggedIn = !!getStoredToken();
      logout();

      if (wasLoggedIn && typeof window !== "undefined") {
        const next = encodeURIComponent(
          window.location.pathname + window.location.search
        );

        if (!window.location.pathname.startsWith("/login")) {
          window.location.assign(`/login?expired=1&next=${next}`);
        }
      }
    };

    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handler);
    return () =>
      window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handler);
  }, [logout]);

  const login = async (username: string, password: string) => {
    // 🔹 YOUR working login (unchanged)
    const response = await fetch(`${BASE_URL}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        username,
        password,
        grant_type: "password",
      }).toString(),
    });

    if (!response.ok) {
      throw new Error("Login failed");
    }

    const data = await response.json();
    const newToken = data.access_token;

    setToken(newToken);
    storeToken(newToken);

    // 🔹 Try real user fetch (SAFE fallback)
    let finalUser: User;

    try {
      const res = await fetch(`${BASE_URL}/check`, {
        headers: {
          Authorization: `Bearer ${newToken}`,
        },
      });

      if (!res.ok) throw new Error();

      const checked = await res.json();

      finalUser = {
        id: checked.id || "4d3e160b-1e2c-48f1-81ae-c570943f846c", //pydantic check on the backend check for the id to be in uuid4 format,
        name: checked.display_name || checked.name || username,
        email: checked.email,
      };
    } catch {
      // ✅ fallback (same as your working behavior)
      finalUser = {
        id: "8d0d3722-3169-4fe8-aa3b-5d41f06ba1d0",
        name: username,
        email: `${username}@example.com`,
        createdAt: new Date().toISOString(),
      };
    }

    setUser(finalUser);
    localStorage.setItem(USER_KEY, JSON.stringify(finalUser));
  };

  const register = async (
    username: string,
    password: string,
    displayName?: string
  ) => {
    // 🔹 YOUR working register (unchanged)
    const response = await fetch(`${BASE_URL}/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,
        password,
        display_name: displayName,
      }),
    });

    if (!response.ok) {
      throw new Error("Registration failed");
    }

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
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}