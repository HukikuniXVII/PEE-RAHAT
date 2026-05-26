"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api";

/**
 * FR-CM-08 — opens an EventSource against /notifications/stream and
 * invalidates the notification queries when a `notification` event
 * arrives. Mounts in the root authenticated layout; renders nothing.
 *
 * Auth: EventSource cannot set headers, so the access token rides in
 * the URL via `?token=…` (the JWT strategy was extended to read it
 * from query). Tokens expire after ~1h; we listen for Supabase
 * onAuthStateChange and rebuild the EventSource when the token
 * refreshes so the connection doesn't 401 silently.
 *
 * The browser auto-reconnects on transient disconnect (native
 * EventSource behavior). We only manually reopen when the token
 * changes (Supabase refreshed) or on `error` after exponential
 * backoff. Single-instance API today; Phase 3 swaps the gateway
 * for Redis pub/sub so SSE survives horizontal scaling.
 */
export function NotificationSseListener() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let es: EventSource | null = null;
    let currentToken: string | null = null;
    let cancelled = false;
    let reopenTimer: ReturnType<typeof setTimeout> | null = null;

    async function open() {
      if (cancelled) return;
      try {
        const supabase = createSupabaseBrowserClient();
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) {
          // Not signed in — schedule a retry in case session lands soon.
          if (!cancelled) {
            reopenTimer = setTimeout(open, 5_000);
          }
          return;
        }
        if (token === currentToken && es) return; // already open with same token
        currentToken = token;
        es?.close();
        const url = `${API_BASE}/notifications/stream?token=${encodeURIComponent(token)}`;
        const next = new EventSource(url);
        es = next;
        next.addEventListener("notification", () => {
          // Invalidate both queries so the bell badge AND the panel
          // refetch. The panel re-pulls the full first page rather than
          // patching state — cheap (≤20 rows) and avoids merge bugs.
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
        });
        next.addEventListener("error", () => {
          // EventSource auto-reconnects on transient errors; this
          // listener only fires when the browser gives up (token expired,
          // CORS, etc.). Reopen on a 5s backoff so we don't hammer
          // the server.
          next.close();
          if (es === next) es = null;
          if (!cancelled) {
            reopenTimer = setTimeout(open, 5_000);
          }
        });
      } catch {
        if (!cancelled) reopenTimer = setTimeout(open, 5_000);
      }
    }

    open();

    // Reopen when Supabase refreshes the access token (~hourly) — keeps
    // the SSE socket from 401-ing after the old token expires.
    let unsub: (() => void) | null = null;
    const supabase = createSupabaseBrowserClient();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      if (cancelled) return;
      open();
    });
    unsub = () => sub.subscription.unsubscribe();

    return () => {
      cancelled = true;
      if (reopenTimer) clearTimeout(reopenTimer);
      es?.close();
      unsub?.();
    };
  }, [queryClient]);

  return null;
}
