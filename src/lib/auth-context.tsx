import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User } from './api/auth/types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('nihongo-user');
    if (stored) setUser(JSON.parse(stored));
    setIsLoading(false);
  }, []);

  const login = async () => {
    await new Promise(r => setTimeout(r, 800));
    const mockUser: User = { id: 'current-user', name: 'Nguyễn Văn A', email: 'nguyenvana@gmail.com', avatarUrl: '', googleLinked: false, createdAt: '2026-01-01T00:00:00Z' };
    setUser(mockUser);
    localStorage.setItem('nihongo-user', JSON.stringify(mockUser));
  };

  const logout = () => { setUser(null); localStorage.removeItem('nihongo-user'); };

  return <AuthContext.Provider value={{ user, isLoading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
