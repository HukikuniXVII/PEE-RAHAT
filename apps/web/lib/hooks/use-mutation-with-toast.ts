"use client";

import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

/**
 * Wraps useMutation with the boilerplate every form in the app repeats:
 * success toast, query invalidation, router.refresh(), and the
 * meta.toast bridge that the global MutationCache in providers.tsx
 * already turns into an error toast.
 *
 * Sites that need bespoke onError handling (inline `setFileError`,
 * dialog state, etc.) should stay on the raw useMutation — the hook
 * deliberately doesn't expose an onError override.
 */
export interface UseMutationWithToastOptions<TData, TVars> {
  mutationFn: (vars: TVars) => Promise<TData>;
  /** Static string or computed from (data, vars). */
  successMessage?: string | ((data: TData, vars: TVars) => string);
  /**
   * Forwarded to mutation.meta.toast — the global MutationCache reads
   * this to emit toast.error. Pass `true` to use the error's own
   * message, or a string to override.
   */
  errorMessage?: string | true;
  /** Each entry is invalidated via queryClient.invalidateQueries. */
  invalidateKeys?: ReadonlyArray<readonly unknown[]>;
  /** Call router.refresh() after success — picks up server-rendered state. */
  refreshRouter?: boolean;
  /** Run after the toast / invalidation / refresh side effects. */
  onSuccess?: (data: TData, vars: TVars) => void;
}

export function useMutationWithToast<TData = unknown, TVars = void>(
  opts: UseMutationWithToastOptions<TData, TVars>,
): UseMutationResult<TData, Error, TVars> {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation<TData, Error, TVars>({
    mutationFn: opts.mutationFn,
    meta: opts.errorMessage !== undefined ? { toast: opts.errorMessage } : undefined,
    onSuccess: (data, vars) => {
      const msg =
        typeof opts.successMessage === "function"
          ? opts.successMessage(data, vars)
          : opts.successMessage;
      if (msg) toast.success(msg);
      if (opts.invalidateKeys) {
        for (const key of opts.invalidateKeys) {
          queryClient.invalidateQueries({ queryKey: [...key] });
        }
      }
      if (opts.refreshRouter) router.refresh();
      opts.onSuccess?.(data, vars);
    },
  });
}
