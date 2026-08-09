import { AuthProvider as Impl, useAuth } from "@/lib/auth-context";

/**
 * Auth provider (doc §3 `app/providers/AuthProvider.tsx`).
 *
 * Thin re-export of the implementation in `lib/auth-context.tsx` (token state,
 * refresh scheduling, logout). Kept here so the app shell composes providers
 * from one `app/providers` folder per the directory structure.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <Impl>{children}</Impl>;
}

export { useAuth };
