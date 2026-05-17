"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  type SignInDto,
  type SignUpDto,
  signInSchema,
  signUpSchema,
} from "@peerahat/types";
import { Button, cn } from "@peerahat/ui";
import { CheckCircle2, GraduationCap, Loader2, ShieldCheck } from "lucide-react";
import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { createApiClient } from "@/lib/api-client";
import { sanitizeNextPath } from "@/lib/auth-utils";
import { supabaseAuthErrorMessage } from "@/lib/error-message";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Mode = "signIn" | "signUp";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = sanitizeNextPath(searchParams.get("next"));

  const [mode, setMode] = useState<Mode>("signIn");
  const [error, setError] = useState<string | null>(() => {
    const raw = searchParams.get("error");
    return raw ? supabaseAuthErrorMessage(decodeURIComponent(raw)) : null;
  });
  const [emailSent, setEmailSent] = useState(false);

  const signInForm = useForm<SignInDto>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
    mode: "onChange",
  });

  const signUpForm = useForm<SignUpDto>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: "", password: "", displayName: "" },
    mode: "onChange",
  });

  const completeAfterAuth = async (accessToken: string) => {
    try {
      await createApiClient({ accessToken }).users.me();
    } catch {
      // The /users/me upsert is idempotent. Failures here shouldn't block
      // navigation — feature pages will retry on first call.
    }
    router.push(redirectTo as Route);
    router.refresh();
  };

  const onSignIn = signInForm.handleSubmit(async (values) => {
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
    await completeAfterAuth(token);
  });

  const onSignUp = signUpForm.handleSubmit(async (values) => {
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { data, error: e } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: { displayName: values.displayName },
      },
    });
    if (e) {
      setError(supabaseAuthErrorMessage(e));
      return;
    }
    const token = data.session?.access_token;
    if (!token) {
      // Email confirmation required.
      setEmailSent(true);
      return;
    }
    await completeAfterAuth(token);
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

  const busy = signInForm.formState.isSubmitting || signUpForm.formState.isSubmitting;

  if (emailSent) {
    return (
      <div className="max-w-md mx-auto bg-white p-12 rounded-[32px] border border-slate-200 shadow-xl text-center space-y-6">
        <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 size={40} />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-900">
            ตรวจสอบอีเมลของคุณ
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            เราส่งลิงก์ยืนยันไปที่{" "}
            <span className="font-bold text-slate-700">
              {signUpForm.getValues("email")}
            </span>{" "}
            แล้ว <br />
            กดยืนยันแล้วกลับมาเข้าสู่ระบบได้เลย
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEmailSent(false);
            setMode("signIn");
          }}
          className="text-sm font-bold text-indigo-600 hover:text-indigo-700"
        >
          กลับไปเข้าสู่ระบบ
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white p-8 md:p-10 rounded-[32px] border border-slate-200 shadow-xl space-y-8">
      <header className="space-y-3 text-center">
        <div className="inline-flex w-14 h-14 bg-slate-900 rounded-2xl items-center justify-center text-white shadow-xl shadow-slate-200 mx-auto">
          <GraduationCap size={28} />
        </div>
        <h1 className="text-2xl font-black text-slate-900">
          {mode === "signIn" ? "ยินดีต้อนรับกลับมา" : "เริ่มต้นกับ Pee Rahat"}
        </h1>
        <p className="text-xs text-slate-500">
          {mode === "signIn"
            ? "เข้าสู่ระบบเพื่อจองคลาส แชทกับพี่ติว และจัดการบุ๊กกิ้ง"
            : "สมัครสมาชิกฟรี ใช้งานได้ทุกฟีเจอร์ทันที"}
        </p>
      </header>

      <div className="grid grid-cols-2 bg-slate-100 rounded-2xl p-1">
        {(["signIn", "signUp"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setError(null);
            }}
            className={cn(
              "py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              mode === m
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-400 hover:text-slate-600",
            )}
          >
            {m === "signIn" ? "Sign In" : "Sign Up"}
          </button>
        ))}
      </div>

      <Button
        variant="outline"
        onClick={onGoogleSignIn}
        disabled={busy}
        className="w-full gap-3"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
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
        เข้าสู่ระบบด้วย Google
      </Button>

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-slate-100" />
        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
          หรือ
        </span>
        <span className="h-px flex-1 bg-slate-100" />
      </div>

      {mode === "signIn" ? (
        <form onSubmit={onSignIn} className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              อีเมล
            </label>
            <input
              type="email"
              autoComplete="email"
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
              {...signInForm.register("email")}
            />
            {signInForm.formState.errors.email && (
              <p className="text-xs text-rose-600">
                {signInForm.formState.errors.email.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              รหัสผ่าน
            </label>
            <input
              type="password"
              autoComplete="current-password"
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
              {...signInForm.register("password")}
            />
            {signInForm.formState.errors.password && (
              <p className="text-xs text-rose-600">
                {signInForm.formState.errors.password.message}
              </p>
            )}
          </div>
          <Button
            type="submit"
            disabled={!signInForm.formState.isValid || busy}
            className="w-full"
          >
            {busy && <Loader2 size={16} className="animate-spin" />}
            เข้าสู่ระบบ
          </Button>
        </form>
      ) : (
        <form onSubmit={onSignUp} className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              ชื่อที่จะแสดง
            </label>
            <input
              type="text"
              autoComplete="name"
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
              {...signUpForm.register("displayName")}
            />
            {signUpForm.formState.errors.displayName && (
              <p className="text-xs text-rose-600">
                {signUpForm.formState.errors.displayName.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              อีเมล
            </label>
            <input
              type="email"
              autoComplete="email"
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
              {...signUpForm.register("email")}
            />
            {signUpForm.formState.errors.email && (
              <p className="text-xs text-rose-600">
                {signUpForm.formState.errors.email.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              รหัสผ่าน (อย่างน้อย 8 ตัวอักษร)
            </label>
            <input
              type="password"
              autoComplete="new-password"
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
              {...signUpForm.register("password")}
            />
            {signUpForm.formState.errors.password && (
              <p className="text-xs text-rose-600">
                {signUpForm.formState.errors.password.message}
              </p>
            )}
          </div>
          <Button
            type="submit"
            disabled={!signUpForm.formState.isValid || busy}
            className="w-full"
          >
            {busy && <Loader2 size={16} className="animate-spin" />}
            สมัครสมาชิก
          </Button>
        </form>
      )}

      {error && (
        <p className="text-sm text-rose-600 font-medium text-center">{error}</p>
      )}

      <p className="text-[10px] text-slate-400 text-center flex items-center justify-center gap-1.5">
        <ShieldCheck size={12} className="text-emerald-500" />
        ข้อมูลของคุณถูกเข้ารหัสและจัดเก็บตามนโยบาย PDPA
      </p>
    </div>
  );
}
