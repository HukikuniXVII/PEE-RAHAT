"use client";

import { Button } from "@peerahat/ui";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { createApiClient } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/error-message";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Status = "verifying" | "success" | "error";

export function ConfirmDeletionClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<Status>("verifying");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Guard against React 18 StrictMode double-invoke firing confirm twice.
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    if (!token) {
      setStatus("error");
      setErrorMessage("ลิงก์ยืนยันไม่ถูกต้อง — ไม่พบโทเค็น");
      return;
    }

    (async () => {
      try {
        await createApiClient().users.confirmDeletion(token);
        // Sign the (now-deleted) account out so no stale session lingers.
        try {
          await createSupabaseBrowserClient().auth.signOut();
        } catch {
          // Best-effort — the account is gone regardless.
        }
        setStatus("success");
        toast.success("บัญชีของคุณถูกลบเรียบร้อย");
        router.refresh();
        // Send them to the landing page after a beat.
        setTimeout(() => router.replace("/" as Route), 3000);
      } catch (err) {
        setStatus("error");
        setErrorMessage(getErrorMessage(err));
      }
    })();
  }, [token, router]);

  return (
    <div className="mx-auto max-w-md text-center">
      {status === "verifying" && (
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={36} className="animate-spin text-violet-500" />
          <p className="thai text-base text-ink-soft">
            กำลังยืนยันการลบบัญชี...
          </p>
        </div>
      )}

      {status === "success" && (
        <div className="flex flex-col items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-soft text-emerald-600">
            <CheckCircle2 size={32} aria-hidden="true" />
          </span>
          <h1 className="thai text-2xl font-bold text-grape-deep">
            บัญชีของคุณถูกลบเรียบร้อย
          </h1>
          <p className="thai text-sm leading-relaxed text-ink-soft">
            ขอบคุณที่ใช้บริการ Pee Rahat — กำลังพาคุณกลับสู่หน้าแรก
          </p>
          <Button
            variant="primary"
            size="brand-lg"
            onClick={() => router.replace("/" as Route)}
          >
            กลับสู่หน้าแรก
          </Button>
        </div>
      )}

      {status === "error" && (
        <div className="flex flex-col items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 text-rose-600">
            <XCircle size={32} aria-hidden="true" />
          </span>
          <h1 className="thai text-2xl font-bold text-rose-700">
            ยืนยันการลบบัญชีไม่สำเร็จ
          </h1>
          <p className="thai text-sm leading-relaxed text-ink-soft">
            {errorMessage ??
              "ลิงก์ยืนยันไม่ถูกต้องหรือหมดอายุแล้ว — กรุณาเริ่มขั้นตอนลบบัญชีใหม่"}
          </p>
          <Button
            variant="outline-brand"
            size="brand-lg"
            onClick={() => router.replace("/profile" as Route)}
          >
            กลับไปที่โปรไฟล์
          </Button>
        </div>
      )}
    </div>
  );
}
