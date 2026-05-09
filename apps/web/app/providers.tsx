"use client";

import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { useState } from "react";
import { Toaster, toast } from "sonner";

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Something went wrong";
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
        queryCache: new QueryCache({
          // Surface any client-side query failure visibly. Queries rarely
          // have inline error UIs so a toast is the natural place.
          onError: (err) => {
            toast.error(errorMessage(err));
          },
        }),
        mutationCache: new MutationCache({
          // Most forms render their own inline error message. Mutations
          // opt into a toast by setting meta.toast: true (use err.message)
          // or meta.toast: "ข้อความ" (custom). Background mutations
          // (upvote, report) are the typical opt-ins.
          onError: (err, _vars, _ctx, mutation) => {
            const flag = mutation.meta?.toast as boolean | string | undefined;
            if (!flag) return;
            toast.error(typeof flag === "string" ? flag : errorMessage(err));
          },
        }),
      }),
  );

  return (
    <QueryClientProvider client={client}>
      <Toaster richColors position="top-right" closeButton />
      {children}
    </QueryClientProvider>
  );
}
