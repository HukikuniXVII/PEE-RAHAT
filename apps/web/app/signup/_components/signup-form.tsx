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
import { useForm } from "react-hook-form";

import { createApiClient } from "@/lib/api-client";
import { sanitizeNextPath } from "@/lib/auth-utils";
import { supabaseAuthErrorMessage } from "@/lib/error-message";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

// Extends the DTO schema with a client-only confirmPassword field.
// confirmPassword is never sent to the backend.
const signUpFormSchema = signUpSchema
  .extend({
    confirmPassword: z.string().min(1, "กรุณายืนยันรหัสผ่าน"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "รหัสผ่านไม่ตรงกัน",
    path: ["confirmPassword"],
  });

type SignUpFormValues = z.infer<typeof signUpFormSchema>;

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
      options: {
        data: { displayName },
      },
    });
    if (e) {
      setError(supabaseAuthErrorMessage(e));
      return;
    }
    const token = data.session?.access_token;
    if (!token) {
      setEmailSent(true);
      return;
    }
    try {
      await createApiClient({ accessToken: token }).users.me();
    } catch {
      // /users/me upsert is idempotent.
    }
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
          <h2 className="thai text-2xl font-semibold text-violet-700">
            ตรวจสอบอีเมลของคุณ
          </h2>
          <p className="thai text-sm leading-relaxed text-neutral-500">
            เราส่งลิงก์ยืนยันไปที่{" "}
            <span className="font-semibold text-neutral-700">
              {form.getValues("email")}
            </span>{" "}
            <br />
            กดยืนยันแล้วกลับมาเข้าสู่ระบบได้เลย
          </p>
        </div>
        <Link
          href={"/login" as Route}
          className="text-sm font-medium text-violet-700 hover:underline"
        >
          กลับไปหน้าเข้าสู่ระบบ
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="space-y-1.5">
        <h1 className="thai text-2xl font-semibold text-violet-700">
          เริ่มต้นกับ Pee Rahat
        </h1>
        <p className="thai text-sm text-neutral-500">
          สมัครสมาชิกฟรี ใช้งานได้ทุกฟีเจอร์ทันที
        </p>
      </header>

      <form onSubmit={onSubmit} className="flex flex-col gap-3" noValidate>
        <div className="space-y-1">
          <label htmlFor="signup-username" className="sr-only">
            Username
          </label>
          <Input
            id="signup-username"
            type="text"
            autoComplete="name"
            placeholder="Username"
            invalid={!!form.formState.errors.displayName}
            {...form.register("displayName")}
          />
          {form.formState.errors.displayName && (
            <p className="text-xs text-rose-600">
              {form.formState.errors.displayName.message}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <label htmlFor="signup-email" className="sr-only">
            Email
          </label>
          <Input
            id="signup-email"
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
          <label htmlFor="signup-password" className="sr-only">
            Password
          </label>
          <Input
            id="signup-password"
            type="password"
            autoComplete="new-password"
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

        <div className="space-y-1">
          <label htmlFor="signup-confirm-password" className="sr-only">
            Confirm Password
          </label>
          <Input
            id="signup-confirm-password"
            type="password"
            autoComplete="new-password"
            placeholder="Confirm Password"
            invalid={!!form.formState.errors.confirmPassword}
            {...form.register("confirmPassword")}
          />
          {form.formState.errors.confirmPassword && (
            <p className="text-xs text-rose-600">
              {form.formState.errors.confirmPassword.message}
            </p>
          )}
        </div>

        <label className="thai mt-2 flex items-center gap-2 text-xs text-neutral-700">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            className="h-4 w-4 accent-violet-500"
          />
          <span>
            ฉันยอมรับ{" "}
            <Link
              href={"/legal/terms" as Route}
              className="text-violet-600 hover:underline"
            >
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
          className="mt-2"
        >
          {busy && <Loader2 size={16} className="animate-spin" />}
          Create an account
        </Button>
      </form>

      <p className="text-center text-xs text-neutral-500">
        Already have an account?{" "}
        <Link
          href={"/login" as Route}
          className="font-medium text-violet-600 hover:underline"
        >
          Sign in
        </Link>
      </p>

      {error && (
        <p className="thai text-center text-sm font-medium text-rose-600">
          {error}
        </p>
      )}
    </div>
  );
}
