import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { ApiError } from "@/lib/api/client";

/**
 * TanStack Query client setup (doc §3 `app/providers/QueryProvider.tsx`).
 *
 * GETs are safe to auto-retry, but never retry a client error (§6.7.1) — a 4xx
 * means the request itself is bad, not transient. Mutations are never silently
 * retried (a lost response could mean the write actually succeeded, so retrying
 * risks double-submission).
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: (failureCount, error) => {
              if (error instanceof ApiError && error.status >= 400 && error.status < 500)
                return false;
              return failureCount < 2;
            },
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: false,
          },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
