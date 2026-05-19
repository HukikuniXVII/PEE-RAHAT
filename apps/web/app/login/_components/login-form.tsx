"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { type SignInDto, signInSchema } from "@peerahat/types";
import { Button, Input, SocialLoginButton } from "@peerahat/ui";
import { Loader2 } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { createApiClient } from "@/lib/api-client";
import { sanitizeNextPath } from "@/lib/auth-utils";
import { supabaseAuthErrorMessage } from "@/lib/error-message";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

// FR-TH-01: hide the Google sign-in button when the Supabase project's
// Google provider is still off. Default-true so existing deploys without
// the env var keep current behavior; explicit "false" is the only way
// to suppress. Inlined by Next at build/dev start — restart pnpm dev
// after toggling.
const googleSignInEnabled =
  process.env.NEXT_PUBLIC_SUPABASE_GOOGLE_ENABLED !== "false";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = sanitizeNextPath(searchParams.get("next"));

  const [error, setError] = useState<string | null>(() => {
    const raw = searchParams.get("error");
    return raw ? supabaseAuthErrorMessage(decodeURIComponent(raw)) : null;
  });

  const form = useForm<SignInDto>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
    mode: "onChange",
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { data, error: e } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });
    if (e) {
      setError(supabaseAuthErrorMessage(e));
      return;
    }
    const token = data.session?.access_token;
    if (!token) {
      setError("เข้าสู่ระบบสำเร็จแต่ไม่ได้รับ session กรุณาลองอีกครั้ง");
      return;
    }
    try {
      await createApiClient({ accessToken: token }).users.me();
    } catch {
      // /users/me upsert is idempotent — first feature page retry covers it.
    }
    router.push(redirectTo as Route);
    router.refresh();
  });

  const onGoogleSignIn = async () => {
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const callback = `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`;
    const { error: e } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callback },
    });
    if (e) {
      setError(supabaseAuthErrorMessage(e));
    }
  };

  const busy = form.formState.isSubmitting;

  return (
    <div className="flex flex-col gap-4">
      <header className="space-y-1.5">
        <h1 className="thai text-2xl font-semibold text-violet-700">
          ยินดีต้อนรับกลับมา
        </h1>
        <p className="thai text-sm text-neutral-500">
          เข้าสู่ระบบเพื่อจองคลาส แชทกับพี่ติว และจัดการบุ๊กกิ้ง
        </p>
      </header>

      <form onSubmit={onSubmit} className="flex flex-col gap-3" noValidate>
        <div className="space-y-1">
          <label htmlFor="login-email" className="sr-only">
            Email
          </label>
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder="Email"
            invalid={!!form.formState.errors.email}
            {...form.register("email")}
          />
          {form.formState.errors.email && (
            <p className="text-xs text-rose-600">
              {form.formState.errors.email.message}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <label htmlFor="login-password" className="sr-only">
            Password
          </label>
          <Input
            id="login-password"
            type="password"
            autoComplete="current-password"
            placeholder="Password"
            invalid={!!form.formState.errors.password}
            {...form.register("password")}
          />
          {form.formState.errors.password && (
            <p className="text-xs text-rose-600">
              {form.formState.errors.password.message}
            </p>
          )}
        </div>

        <div className="text-right">
          <Link
            href={"/login" as Route}
            aria-disabled
            className="text-xs text-accent-700 hover:underline pointer-events-none opacity-70"
          >
            Forget Password?
          </Link>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="brand-lg"
          fullWidth
          disabled={!form.formState.isValid || busy}
          className="mt-2"
        >
          {busy && <Loader2 size={16} className="animate-spin" />}
          Login
        </Button>
      </form>

      <div className="mt-2 flex justify-center gap-4">
        <SocialLoginButton
          label="Sign in with Google"
          onClick={onGoogleSignIn}
          disabled={!googleSignInEnabled || busy}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#EA4335"
                d="M12 5c1.617 0 3.077.557 4.221 1.648l3.155-3.155C17.452 1.621 14.97.5 12 .5 7.31.5 3.255 3.193 1.28 7.115l3.671 2.846C5.922 7.054 8.722 5 12 5z"
              />
              <path
                fill="#4285F4"
                d="M23.49 12.275c0-.78-.07-1.53-.198-2.275H12v4.51h6.46c-.28 1.5-1.124 2.77-2.396 3.625l3.713 2.88c2.166-2.005 3.713-4.96 3.713-8.74z"
              />
              <path
                fill="#FBBC05"
                d="M4.95 14.96A6.94 6.94 0 0 1 4.5 12c0-1.04.18-2.04.45-2.96L1.28 6.195A11.49 11.49 0 0 0 .5 12c0 1.86.43 3.62 1.19 5.18l3.26-2.22z"
              />
              <path
                fill="#34A853"
                d="M12 23.5c3.24 0 5.96-1.07 7.94-2.91l-3.713-2.88c-1.024.7-2.353 1.105-4.227 1.105-3.252 0-6.014-2.196-7-5.158L1.28 16.385C3.25 20.323 7.31 23.5 12 23.5z"
              />
            </svg>
          }
        />
        <SocialLoginButton
          label="Sign in with Facebook"
          disabled
          title="Coming soon"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#1877F2"
                d="M24 12c0-6.627-5.373-12-12-12S0 5.373 0 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078V12h3.047V9.356c0-3.007 1.792-4.668 4.533-4.668 1.312 0 2.686.235 2.686.235v2.953h-1.514c-1.491 0-1.956.925-1.956 1.874V12h3.328l-.532 3.469h-2.796v8.385C19.612 22.954 24 17.99 24 12z"
              />
            </svg>
          }
        />
        <SocialLoginButton
          label="Sign in with Apple"
          disabled
          title="Coming soon"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#000000"
                d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
              />
            </svg>
          }
        />
      </div>

      <div className="mt-2 flex items-center gap-3">
        <span className="h-px flex-1 bg-neutral-200" />
        <span className="text-xs text-neutral-500">
          Don&rsquo;t have an account?
        </span>
        <span className="h-px flex-1 bg-neutral-200" />
      </div>

      <Link
        href={"/signup" as Route}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border-[1.5px] border-violet-500 text-sm font-medium text-violet-700 transition-colors hover:bg-violet-50 active:bg-violet-100 focus-visible:outline-none focus-visible:shadow-focus"
      >
        Sign Up
      </Link>

      {error && (
        <p className="thai text-sm text-rose-600 font-medium text-center">
          {error}
        </p>
      )}
    </div>
  );
}
