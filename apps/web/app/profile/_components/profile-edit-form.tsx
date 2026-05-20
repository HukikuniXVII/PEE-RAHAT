"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  type User,
  type UserProfileUpdateDto,
  userProfileUpdateSchema,
} from "@peerahat/types";
import { Button, Card, Input } from "@peerahat/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, Lock, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { createApiClient } from "@/lib/api-client";

interface Props {
  initialUser: User;
}

function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

export function ProfileEditForm({ initialUser }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [avatarUrl, setAvatarUrl] = useState(initialUser.avatarUrl ?? "");

  const form = useForm<UserProfileUpdateDto>({
    resolver: zodResolver(userProfileUpdateSchema),
    defaultValues: {
      displayName: initialUser.displayName,
      avatarUrl: initialUser.avatarUrl ?? undefined,
    },
    mode: "onTouched",
  });

  // Avatar upload: presigned PUT → publicUrl → save in form state.
  // The publicUrl only persists once the user submits the form.
  const uploadAvatar = useMutation({
    mutationFn: async (file: File) => {
      const api = createApiClient();
      const intent = await api.users.requestAvatarUpload(file.type);
      const put = await fetch(intent.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!put.ok && !intent.uploadUrl.startsWith("https://storage.local")) {
        throw new Error(`อัปโหลดรูปไม่สำเร็จ: ${put.status}`);
      }
      return intent.publicUrl;
    },
    onSuccess: (url) => {
      setAvatarUrl(url);
      form.setValue("avatarUrl", url, { shouldDirty: true });
      toast.success("อัปโหลดรูปแล้ว — กดบันทึกเพื่อยืนยัน");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const save = useMutation({
    mutationFn: (dto: UserProfileUpdateDto) =>
      createApiClient().users.updateMe(dto),
    onSuccess: () => {
      toast.success("บันทึกโปรไฟล์เรียบร้อย");
      queryClient.invalidateQueries({ queryKey: ["users", "me"] });
      router.refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const onSubmit = form.handleSubmit((values) => {
    save.mutate({
      displayName: values.displayName?.trim() || undefined,
      avatarUrl: values.avatarUrl?.trim() || undefined,
    });
  });

  const displayName = form.watch("displayName") ?? initialUser.displayName;
  const pending = save.isPending || uploadAvatar.isPending;

  return (
    <Card variant="frosted" className="p-8 md:p-10">
      <form onSubmit={onSubmit} className="space-y-8">
        {/* Avatar */}
        <section className="space-y-3">
          <label className="thai text-[12px] font-bold uppercase tracking-widest text-dusty-grape">
            รูปโปรไฟล์
          </label>
          <div className="flex items-center gap-5">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={initialUser.displayName}
                className="w-20 h-20 rounded-2xl object-cover border border-violet-100 shadow-[0_8px_18px_-8px_rgba(85,65,139,0.35)]"
              />
            ) : (
              <span className="w-20 h-20 rounded-2xl bg-violet-500 text-white text-xl font-bold flex items-center justify-center shadow-[0_8px_18px_-8px_rgba(85,65,139,0.55)]">
                {initialsOf(displayName || initialUser.displayName)}
              </span>
            )}
            <div className="space-y-2">
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadAvatar.mutate(file);
                  // Clear input so the same file re-upload still fires.
                  e.target.value = "";
                }}
              />
              <Button
                type="button"
                variant="outline-brand"
                size="brand-md"
                onClick={() => fileInput.current?.click()}
                disabled={uploadAvatar.isPending}
              >
                {uploadAvatar.isPending ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    กำลังอัปโหลด...
                  </>
                ) : (
                  <>
                    <Upload size={14} />
                    เปลี่ยนรูป
                  </>
                )}
              </Button>
              <p className="text-[11px] text-ink-mute thai">
                ไฟล์ภาพ JPG / PNG / WebP — ระบบจะปรับขนาดอัตโนมัติ
              </p>
            </div>
          </div>
        </section>

        <div className="border-t border-violet-100" />

        {/* Display name */}
        <section className="space-y-2">
          <label
            htmlFor="displayName"
            className="thai text-[12px] font-bold uppercase tracking-widest text-dusty-grape"
          >
            ชื่อที่แสดง
          </label>
          <Input
            id="displayName"
            type="text"
            placeholder="เช่น น้องเฟิร์น"
            {...form.register("displayName")}
            invalid={!!form.formState.errors.displayName}
          />
          {form.formState.errors.displayName && (
            <p className="thai text-xs text-rose-600">
              {form.formState.errors.displayName.message}
            </p>
          )}
          <p className="text-[11px] text-ink-mute thai">
            ชื่อนี้จะปรากฏบนรีวิว บทสนทนา และโพสต์ในชุมชน
          </p>
        </section>

        <div className="border-t border-violet-100" />

        {/* Email — locked, no explanation. */}
        <section className="space-y-2">
          <label className="thai text-[12px] font-bold uppercase tracking-widest text-dusty-grape">
            อีเมล
          </label>
          <div className="flex items-center justify-between gap-3 rounded-xl bg-grape-soft/40 border border-violet-100 px-4 py-3">
            <p className="text-sm font-semibold text-grape-deep truncate">
              {initialUser.email}
            </p>
            <Lock size={14} className="text-ink-mute shrink-0" />
          </div>
        </section>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="ghost-brand"
            size="brand-md"
            onClick={() => router.back()}
            disabled={pending}
          >
            ยกเลิก
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="brand-md"
            disabled={pending}
          >
            {save.isPending ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                กำลังบันทึก...
              </>
            ) : save.isSuccess ? (
              <>
                <CheckCircle2 size={14} />
                บันทึกแล้ว
              </>
            ) : (
              "บันทึก"
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
}

