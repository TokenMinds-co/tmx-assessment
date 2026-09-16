"use client";

import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { ApiError } from "@/lib/api/client";
import { loginUrl } from "@/lib/sign-in-redirect";

/**
 * A 401 from a staff call means the session ended: go to sign in, and come
 * back here after. Candidate pages never get a 401; their link is the access.
 */
function signInAgainOn401(error: unknown) {
  if (!(error instanceof ApiError) || error.status !== 401) return;
  const { pathname, search, origin } = window.location;
  if (pathname.startsWith("/take/")) return;
  window.location.assign(new URL(loginUrl(`${pathname}${search}`), origin).href);
}

function makeQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({ onError: signInAgainOn401 }),
    mutationCache: new MutationCache({ onError: signInAgainOn401 }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // A 4xx won't fix itself on a retry; a dropped connection might.
        retry: (count, error) =>
          count < 2 && !(error instanceof ApiError && error.status >= 400 && error.status < 500),
      },
    },
  });
}

/** App-wide client state: the query cache (docs/data-fetching.md) and toasts. */
export function Providers({ children }: { children: React.ReactNode }) {
  // One client per browser tab. On the server this runs per request, so no
  // two users ever share a cache.
  const [queryClient] = useState(makeQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster position="bottom-right" />
      <ReactQueryDevtools buttonPosition="bottom-left" />
    </QueryClientProvider>
  );
}
