"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { signUpSchema } from "@peerahat/types";
import { Button, Input } from "@peerahat/ui";
import { z } from "zod";
import { CheckCircle2, Loader2 } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { createApiClient } from "@/lib/api-client";
import { sanitizeNextPath } from "@/lib/auth-utils";
import { supabaseAuthErrorMessage } from "@/lib/error-message";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

// Client-only schema — extends the DTO with confirmPassword.
// Suppress the default zod min-length message; strength meter handles feedback.
const signUpFormSchema = signUpSchema
  .extend({
    password: z.string().min(8, " ").max(72),
    confirmPassword: z.string().min(1, "กรุณายืนยันรหัสผ่าน"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "รหัสผ่านไม่ตรงกัน",
    path: ["confirmPassword"],
  });

type SignUpFormValues = z.infer<typeof signUpFormSchema>;

// ---------- Password strength ----------

const CHECKS = [
  { label: "อย่างน้อย 8 ตัวอักษร", test: (p: string) => p.length >= 8 },
  { label: "ตัวพิมพ์ใหญ่ (A–Z)", test: (p: string) => /[A-Z]/.test(p) },
  { label: "ตัวเลข (0–9)", test: (p: string) => /[0-9]/.test(p) },
  { label: "อักขระพิเศษ (!@#…)", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

const LEVELS = [
  { label: "อ่อนมาก", bar: "bg-rose-500", text: "text-rose-500" },
  { label: "อ่อน", bar: "bg-orange-400", text: "text-orange-500" },
  { label: "ปานกลาง", bar: "bg-yellow-400", text: "text-yellow-600" },
  { label: "แข็งแกร่ง", bar: "bg-emerald-500", text: "text-emerald-600" },
];

function PasswordStrengthMeter({ password }: { password: string }) {
  if (!password) return null;

  const results = CHECKS.map((c) => ({ ...c, met: c.test(password) }));
  const score = results.filter((r) => r.met).length; // 0–4
  const DEFAULT_LEVEL = { label: "", bar: "bg-neutral-200", text: "text-neutral-400" };
  const level = LEVELS[Math.max(0, score - 1)] ?? DEFAULT_LEVEL;

  return (
    <div className="mt-3 space-y-3">
      {/* Segmented strength bar */}
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-2 flex-1 rounded-full transition-all duration-300 ${
              i <= score ? level.bar : "bg-neutral-200"
            }`}
          />
        ))}
        <span className={`ml-1 min-w-[72px] text-right text-sm font-semibold thai ${level.text}`}>
          {score > 0 ? level.label : ""}
        </span>
      </div>

      {/* Requirements checklist */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {results.map((r) => (
          <div
            key={r.label}
            className={`flex items-center gap-2 text-sm thai transition-colors ${
              r.met ? "text-emerald-600" : "text-neutral-400"
            }`}
          >
            <span className="shrink-0 text-base font-bold">{r.met ? "✓" : "○"}</span>
            {r.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Form ----------

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = sanitizeNextPath(searchParams.get("next"));

  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const form = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpFormSchema),
    defaultValues: { email: "", password: "", confirmPassword: "", displayName: "" },
    mode: "onChange",
  });

  const password = useWatch({ control: form.control, name: "password" });

  const onSubmit = form.handleSubmit(async ({ email, password, displayName }) => {
    setError(null);
    if (!acceptedTerms) {
      setError("กรุณายอมรับข้อกำหนดและเงื่อนไขก่อน");
      return;
    }
    const supabase = createSupabaseBrowserClient();
    const { data, error: e } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { displayName } },
    });
    if (e) { setError(supabaseAuthErrorMessage(e)); return; }
    const token = data.session?.access_token;
    if (!token) { setEmailSent(true); return; }
    try { await createApiClient({ accessToken: token }).users.me(); } catch { /* idempotent */ }
    router.push(redirectTo as Route);
    router.refresh();
  });

  const busy = form.formState.isSubmitting;

  if (emailSent) {
    return (
      <div className="flex flex-col items-center gap-5 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-violet-50 text-violet-500">
          <CheckCircle2 size={40} />
        </div>
        <div className="space-y-2">
          <h2 className="thai text-2xl font-semibold text-violet-700">ตรวจสอบอีเมลของคุณ</h2>
          <p className="thai text-sm leading-relaxed text-neutral-500">
            เราส่งลิงก์ยืนยันไปที่{" "}
            <span className="font-semibold text-neutral-700">{form.getValues("email")}</span>
            <br />กดยืนยันแล้วกลับมาเข้าสู่ระบบได้เลย
          </p>
        </div>
        <Link href={"/login" as Route} className="text-sm font-medium text-violet-700 hover:underline">
          กลับไปหน้าเข้าสู่ระบบ
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="space-y-2">
        <h1 className="thai text-4xl font-semibold text-violet-700">เริ่มต้นกับ Pee Rahat</h1>
        <p className="thai text-lg text-neutral-500">สมัครสมาชิกฟรี ใช้งานได้ทุกฟีเจอร์ทันที</p>
      </header>

      <form onSubmit={onSubmit} className="flex flex-col gap-3" noValidate>
        {/* Username */}
        <div className="space-y-1.5">
          <label htmlFor="signup-username" className="sr-only">Username</label>
          <Input
            id="signup-username"
            type="text"
            autoComplete="name"
            placeholder="Username"
            invalid={!!form.formState.errors.displayName}
            className="h-[52px] text-lg"
            {...form.register("displayName")}
          />
          {form.formState.errors.displayName && (
            <p className="text-base text-rose-600">{form.formState.errors.displayName.message}</p>
          )}
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <label htmlFor="signup-email" className="sr-only">Email</label>
          <Input
            id="signup-email"
            type="email"
            autoComplete="email"
            placeholder="Email"
            invalid={!!form.formState.errors.email}
            className="h-[52px] text-lg"
            {...form.register("email")}
          />
          {form.formState.errors.email && (
            <p className="text-base text-rose-600">{form.formState.errors.email.message}</p>
          )}
        </div>

        {/* Password + strength meter */}
        <div>
          <label htmlFor="signup-password" className="sr-only">Password</label>
          <Input
            id="signup-password"
            type="password"
            autoComplete="new-password"
            placeholder="Password"
            invalid={!!form.formState.errors.password && form.formState.errors.password.message?.trim() !== ""}
            className="h-[52px] text-lg"
            {...form.register("password")}
          />
          <PasswordStrengthMeter password={password ?? ""} />
        </div>

        {/* Confirm password */}
        <div className="space-y-1.5">
          <label htmlFor="signup-confirm-password" className="sr-only">Confirm Password</label>
          <Input
            id="signup-confirm-password"
            type="password"
            autoComplete="new-password"
            placeholder="Confirm Password"
            invalid={!!form.formState.errors.confirmPassword}
            className="h-[52px] text-lg"
            {...form.register("confirmPassword")}
          />
          {form.formState.errors.confirmPassword && (
            <p className="text-base text-rose-600">{form.formState.errors.confirmPassword.message}</p>
          )}
        </div>

        {/* Terms */}
        <label className="thai mt-1 flex items-center gap-2 text-base text-neutral-700">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            className="h-4 w-4 accent-violet-500"
          />
          <span>
            ฉันยอมรับ{" "}
            <Link href={"/legal/terms" as Route} className="text-violet-600 hover:underline">
              ข้อกำหนดและเงื่อนไข
            </Link>
          </span>
        </label>

        <Button
          type="submit"
          variant="primary"
          size="brand-lg"
          fullWidth
          disabled={!form.formState.isValid || !acceptedTerms || busy}
          className="mt-1 h-[52px] text-lg"
        >
          {busy && <Loader2 size={18} className="animate-spin" />}
          Create an account
        </Button>
      </form>

      <p className="text-center text-base text-neutral-500">
        Already have an account?{" "}
        <Link href={"/login" as Route} className="font-medium text-violet-600 hover:underline">
          Sign in
        </Link>
      </p>

      {error && (
        <p className="thai text-center text-sm font-medium text-rose-600">{error}</p>
      )}
    </div>
  );
}
