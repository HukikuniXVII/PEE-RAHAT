"use client";

import {
  type DeletionReasonCode,
  type RequestDeletionResult,
} from "@peerahat/types";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from "@peerahat/ui";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  MailCheck,
  ShieldAlert,
  Trash2,
  XCircle,
} from "lucide-react";
import { useState } from "react";

import { createApiClient } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/error-message";

// Type-to-confirm phrase. Must match exactly to enable submit.
const CONFIRM_PHRASE = "ลบบัญชี";

const REASON_OPTIONS: { value: DeletionReasonCode; label: string }[] = [
  { value: "no_longer_use", label: "ไม่ได้ใช้แล้ว" },
  { value: "switched_service", label: "เปลี่ยนไปใช้บริการอื่น" },
  { value: "platform_issue", label: "มีปัญหากับแพลตฟอร์ม" },
  { value: "other", label: "อื่นๆ" },
];

// What gets erased — shown in the confirmation warning.
const ERASED_ITEMS = [
  "โปรไฟล์และรูปภาพของคุณ",
  "รีวิวที่เคยเขียน",
  "ประวัติการแชท",
  "การแจ้งเตือนและการตั้งค่า",
];

type Step = "check" | "form" | "sent";

export function DeleteAccountSection() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("check");
  const [reasonCode, setReasonCode] = useState<DeletionReasonCode | "">("");
  const [reason, setReason] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [devConfirmUrl, setDevConfirmUrl] = useState<string | null>(null);

  function reset() {
    setStep("check");
    setReasonCode("");
    setReason("");
    setConfirmText("");
    setPassword("");
    setFormError(null);
    setDevConfirmUrl(null);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) reset();
  }

  // Step 1 — eligibility check, runs whenever the dialog is open.
  const eligibility = useQuery({
    queryKey: ["users", "deletion-eligibility"],
    queryFn: () => createApiClient().users.deletionEligibility(),
    enabled: open,
    staleTime: 0,
    gcTime: 0,
  });

  const canDelete = eligibility.data?.canDelete ?? false;
  const blockers = eligibility.data?.blockers ?? [];

  // Advance to the form once we know the account is eligible.
  if (open && step === "check" && eligibility.isSuccess && canDelete) {
    setStep("form");
  }

  const submit = useMutation<RequestDeletionResult, Error>({
    mutationFn: () =>
      createApiClient().users.requestDeletion({
        password,
        reasonCode: reasonCode || undefined,
        reason: reason.trim() || undefined,
      }),
    onSuccess: (data) => {
      setDevConfirmUrl(data.devConfirmUrl ?? null);
      setStep("sent");
    },
    onError: (err) => {
      // The API returns 401 with "รหัสผ่านไม่ถูกต้อง" for a bad password;
      // getErrorMessage's generic 401 copy ("กรุณาเข้าสู่ระบบ") would hide
      // that, so surface the specific reason here.
      const status = (err as { statusCode?: number }).statusCode;
      setFormError(
        status === 401 ? "รหัสผ่านไม่ถูกต้อง" : getErrorMessage(err),
      );
    },
  });

  const confirmMatches = confirmText.trim() === CONFIRM_PHRASE;
  const canSubmit = confirmMatches && password.length > 0 && !submit.isPending;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setFormError(null);
    submit.mutate();
  }

  return (
    <>
      <div className="border-t border-rose-200/70" />

      <section className="space-y-4">
        <h2 className="thai text-[13px] font-bold uppercase tracking-widest text-rose-700">
          เขตอันตราย
        </h2>

        <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-6 md:p-7">
          <div className="flex items-start gap-4">
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <ShieldAlert size={20} aria-hidden="true" />
            </span>
            <div className="flex-1 space-y-1.5">
              <h3 className="thai text-base font-bold text-rose-700">
                ลบบัญชี
              </h3>
              <p className="thai text-[13.5px] leading-relaxed text-ink-soft">
                การลบบัญชีจะลบข้อมูลส่วนตัวของคุณอย่างถาวร —
                ไม่สามารถกู้คืนได้
              </p>
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="brand-md"
              onClick={() => handleOpenChange(true)}
              className="border border-rose-300 bg-white text-rose-600 hover:bg-rose-100 hover:text-rose-700"
            >
              <Trash2 size={15} aria-hidden="true" />
              ลบบัญชี
            </Button>
          </div>
        </div>
      </section>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-lg">
          {/* ── Step 1: blocked ─────────────────────────────────────── */}
          {step === "check" && (
            <>
              <DialogHeader>
                <DialogTitle className="text-rose-700">
                  ยังไม่สามารถลบบัญชีได้
                </DialogTitle>
              </DialogHeader>
              <div className="px-8 pb-2">
                {eligibility.isLoading ? (
                  <div className="flex items-center gap-2 py-6 text-ink-mute">
                    <Loader2 size={16} className="animate-spin" />
                    <span className="thai text-sm">กำลังตรวจสอบ...</span>
                  </div>
                ) : eligibility.isError ? (
                  <p className="thai text-sm text-rose-600">
                    ตรวจสอบสถานะบัญชีไม่สำเร็จ กรุณาลองใหม่อีกครั้ง
                  </p>
                ) : (
                  <>
                    <p className="thai text-sm text-ink-soft">
                      เคลียร์รายการเหล่านี้ก่อนจึงจะลบบัญชีได้:
                    </p>
                    <ul className="mt-4 space-y-3">
                      {blockers.map((b, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <AlertTriangle
                            size={16}
                            className="mt-0.5 shrink-0 text-rose-600"
                            aria-hidden="true"
                          />
                          <span className="thai text-[13.5px] leading-relaxed text-ink">
                            {b}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
              <DialogFooter>
                <DialogClose>ปิด</DialogClose>
              </DialogFooter>
            </>
          )}

          {/* ── Step 2: confirmation form ───────────────────────────── */}
          {step === "form" && (
            <form onSubmit={onSubmit}>
              <DialogHeader>
                <DialogTitle className="text-rose-700">ลบบัญชี</DialogTitle>
              </DialogHeader>

              <div className="space-y-5 px-8 pb-2">
                <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4">
                  <p className="thai text-[13.5px] font-semibold text-rose-700">
                    การกระทำนี้ไม่สามารถยกเลิกได้ ข้อมูลต่อไปนี้จะถูกลบ:
                  </p>
                  <ul className="mt-2.5 space-y-1.5">
                    {ERASED_ITEMS.map((item) => (
                      <li
                        key={item}
                        className="thai flex items-center gap-2 text-[13px] text-ink-soft"
                      >
                        <span className="h-1 w-1 shrink-0 rounded-full bg-rose-400" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Reason (optional) */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="delete-reason-code"
                    className="thai text-[12px] font-bold uppercase tracking-widest text-ink-mute"
                  >
                    เหตุผล (ไม่บังคับ)
                  </label>
                  <select
                    id="delete-reason-code"
                    value={reasonCode}
                    onChange={(e) =>
                      setReasonCode(e.target.value as DeletionReasonCode | "")
                    }
                    className="h-11 w-full rounded-md border border-neutral-200 bg-white px-3 text-sm text-neutral-800 transition-shadow hover:border-violet-200 focus:border-[1.5px] focus:border-violet-500 focus:shadow-focus focus:outline-none"
                  >
                    <option value="">— เลือกเหตุผล —</option>
                    {REASON_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    maxLength={500}
                    rows={2}
                    placeholder="บอกเราเพิ่มเติมได้ (ไม่บังคับ)"
                    className="thai w-full resize-none rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 placeholder:text-neutral-400 transition-shadow hover:border-violet-200 focus:border-[1.5px] focus:border-violet-500 focus:shadow-focus focus:outline-none"
                  />
                </div>

                {/* Type-to-confirm */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="delete-confirm-phrase"
                    className="thai text-[12px] font-bold uppercase tracking-widest text-ink-mute"
                  >
                    พิมพ์ <span className="text-rose-600">{CONFIRM_PHRASE}</span>{" "}
                    เพื่อยืนยัน
                  </label>
                  <Input
                    id="delete-confirm-phrase"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder={CONFIRM_PHRASE}
                    autoComplete="off"
                  />
                </div>

                {/* Password re-auth */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="delete-password"
                    className="thai text-[12px] font-bold uppercase tracking-widest text-ink-mute"
                  >
                    รหัสผ่าน
                  </label>
                  <Input
                    id="delete-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="ยืนยันตัวตนด้วยรหัสผ่านของคุณ"
                    autoComplete="current-password"
                  />
                </div>

                {formError && (
                  <p className="thai text-sm text-rose-600">{formError}</p>
                )}
              </div>

              <DialogFooter>
                <DialogClose>ยกเลิก</DialogClose>
                <Button
                  type="submit"
                  variant="ghost"
                  size="brand-md"
                  disabled={!canSubmit}
                  className="border border-rose-600 bg-white text-rose-600 hover:bg-rose-50 hover:text-rose-700 disabled:border-neutral-200 disabled:bg-transparent disabled:text-neutral-400"
                >
                  {submit.isPending ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      กำลังส่งคำขอ...
                    </>
                  ) : (
                    "ส่งคำขอลบบัญชี"
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}

          {/* ── Step 3: email sent ──────────────────────────────────── */}
          {step === "sent" && (
            <>
              <DialogHeader>
                <div className="flex flex-col items-center gap-3 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-soft text-emerald-600">
                    <MailCheck size={24} aria-hidden="true" />
                  </span>
                  <DialogTitle>ตรวจสอบอีเมลของคุณ</DialogTitle>
                </div>
              </DialogHeader>
              <div className="px-8 pb-2 text-center">
                <p className="thai text-sm leading-relaxed text-ink-soft">
                  เราส่งลิงก์ยืนยันไปที่อีเมลของคุณแล้ว —
                  กดลิงก์ภายใน 1 ชั่วโมงเพื่อยืนยันการลบ
                </p>

                {/* Dev-only: email delivery is stubbed when Supabase isn't
                    configured, so the link is surfaced here to finish the
                    flow locally. */}
                {devConfirmUrl && (
                  <a
                    href={devConfirmUrl}
                    className="thai mt-4 inline-flex items-center gap-1.5 rounded-md border border-rose-300 bg-white px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                  >
                    <XCircle size={13} aria-hidden="true" />
                    (dev) ยืนยันการลบบัญชี
                  </a>
                )}
              </div>
              <DialogFooter className="justify-center">
                <DialogClose>
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 size={14} />
                    เข้าใจแล้ว
                  </span>
                </DialogClose>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
