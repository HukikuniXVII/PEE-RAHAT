"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  type CommunityPost,
  type CreatePostDto,
  type Page,
  createPostSchema,
} from "@peerahat/types";
import {
  type InfiniteData,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { Hash, Image as ImageIcon, Loader2, X } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { createApiClient } from "@/lib/api-client";

import { Avatar } from "./avatar";

interface Props {
  currentDisplayName: string;
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

// SimpleComposer per V2 handoff: 40px avatar + 2-row auto-resize textarea
// + image/tag pill buttons (visual only for V1) + Post pill that activates
// once the textarea has content. Title is auto-derived from the first
// line of content so the existing CommunityPost.title contract stays
// satisfied without exposing two fields to the user.
export function PostComposer({ currentDisplayName }: Props) {
  const queryClient = useQueryClient();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  // Local image-upload state. We track the staged URL + a preview blob URL
  // separately so the preview shows instantly while the PUT is in flight.
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const form = useForm<CreatePostDto>({
    resolver: zodResolver(createPostSchema),
    defaultValues: {
      title: "",
      content: "",
      consentPdpaAccepted: true,
    },
    mode: "onChange",
  });

  const { ref: registerContentRef, ...contentRegister } =
    form.register("content");

  const content = form.watch("content");
  const hasContent = content.trim().length > 0;

  const createPost = useMutation({
    mutationFn: (dto: CreatePostDto) => createApiClient().community.create(dto),
    onSuccess: (created) => {
      queryClient.setQueryData<InfiniteData<Page<CommunityPost>>>(
        ["community", "posts"],
        (old) => {
          if (!old || old.pages.length === 0) return old;
          const [first, ...rest] = old.pages;
          return {
            ...old,
            pages: [
              {
                ...first!,
                items: [created, ...first!.items],
                total: first!.total + 1,
              },
              ...rest,
            ],
          };
        },
      );
      form.reset();
      clearImage();
    },
  });

  function clearImage() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setImageUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // Photo button → opens the hidden file picker. On pick: validate,
  // show local preview immediately, sign + PUT, stash the resolved
  // publicUrl in state so submit can include it in CreatePostDto.
  async function handleImagePicked(file: File) {
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("ไฟล์ใหญ่เกิน 5MB");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("ต้องเป็นไฟล์รูปภาพเท่านั้น");
      return;
    }
    // Local preview first so the UI confirms the pick instantly.
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setUploading(true);
    try {
      const api = createApiClient();
      const signed = await api.community.requestImageUpload(file.type);
      await api.uploads.putPresigned(signed, file);
      setImageUrl(signed.publicUrl);
    } catch (err) {
      toast.error(`อัปโหลดรูปไม่สำเร็จ: ${(err as Error).message}`);
      clearImage();
    } finally {
      setUploading(false);
    }
  }

  // Tag button → inserts "#" at the textarea cursor, preserving any
  // selection. Falls back to appending when the textarea isn't focused.
  function insertHashAtCursor() {
    const el = textareaRef.current;
    if (!el) {
      form.setValue("content", `${content}#`, { shouldValidate: true });
      return;
    }
    el.focus();
    const start = el.selectionStart ?? content.length;
    const end = el.selectionEnd ?? content.length;
    const next = `${content.slice(0, start)}#${content.slice(end)}`;
    form.setValue("content", next, { shouldValidate: true });
    // Restore cursor right after the inserted "#" — wait a tick so React
    // re-renders the controlled value before we read selectionStart.
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = start + 1;
    });
  }

  // The backend still requires `consentPdpaAccepted: true` as a hard
  // gate. The V2 UI doesn't show a checkbox (drops the visual clutter
  // from the old composer) — instead, the PDPA self-check obligation
  // lives on the public terms page and the link below the action row
  // makes that contract visible to the user before they post. The act
  // of clicking โพสต์ with the link in view is the on-record consent.
  const onSubmit = form.handleSubmit((values) => {
    const trimmed = values.content.trim();
    const title = trimmed.split("\n")[0]?.slice(0, 200) || "โพสต์ใหม่";
    createPost.mutate({
      title,
      content: trimmed,
      consentPdpaAccepted: true,
      imageUrl: imageUrl ?? undefined,
    });
  });

  return (
    <form onSubmit={onSubmit} className="cozy-card p-4">
      <div className="flex items-start gap-3">
        <Avatar name={currentDisplayName} size={40} />
        <div className="flex-1 min-w-0">
          <textarea
            rows={2}
            placeholder="มีอะไรอยากถามรุ่นพี่?"
            className="w-full thai text-[14px] outline-none resize-none leading-relaxed bg-transparent text-ink placeholder:text-ink-mute"
            {...contentRegister}
            ref={(el) => {
              registerContentRef(el);
              textareaRef.current = el;
            }}
          />

          {previewUrl && (
            <div className="relative mt-2 inline-block">
              <img
                src={previewUrl}
                alt="แนบรูป"
                className="max-h-[220px] rounded-xl border border-violet-100 object-cover"
              />
              {uploading && (
                <div className="absolute inset-0 rounded-xl bg-white/60 flex items-center justify-center">
                  <Loader2 size={20} className="animate-spin text-violet-500" />
                </div>
              )}
              <button
                type="button"
                onClick={clearImage}
                aria-label="ลบรูปแนบ"
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center text-ink-soft hover:text-rose-500"
              >
                <X size={14} strokeWidth={2.4} />
              </button>
            </div>
          )}

          {/* Hidden file input — clicked by the รูปภาพ button below. */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImagePicked(file);
            }}
          />

          <div className="flex items-center gap-1 mt-2 pt-2.5 cozy-hairline">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || createPost.isPending}
              className="thai text-[13px] font-semibold inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition disabled:opacity-60 disabled:cursor-not-allowed"
              title="แนบรูปภาพ"
            >
              {uploading ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <ImageIcon size={15} strokeWidth={1.8} />
              )}{" "}
              รูปภาพ
            </button>
            <button
              type="button"
              onClick={insertHashAtCursor}
              disabled={createPost.isPending}
              className="thai text-[13px] font-semibold inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-violet-500 hover:bg-violet-50 transition disabled:opacity-60 disabled:cursor-not-allowed"
              title="ใส่ # ที่ตำแหน่งเคอร์เซอร์"
            >
              <Hash size={15} strokeWidth={1.8} /> แท็ก
            </button>
            <span className="flex-1" />
            <button
              type="submit"
              disabled={!hasContent || createPost.isPending || uploading}
              className={`thai text-[13px] font-bold px-4 py-1.5 rounded-full transition inline-flex items-center gap-1.5 ${
                hasContent && !uploading
                  ? "bg-violet-500 text-white hover:bg-violet-600"
                  : "bg-grape-soft text-ink-mute cursor-not-allowed"
              }`}
            >
              {createPost.isPending && (
                <Loader2 size={12} className="animate-spin" />
              )}
              โพสต์
            </button>
          </div>

          {/* PDPA / community-rules reference. Composer stays clean per
              V2 design; the full self-check obligation lives at
              /legal/terms#community and the link makes it discoverable
              before each post. */}
          <p className="thai text-[10.5px] text-ink-mute leading-relaxed mt-2">
            การกด โพสต์ ถือว่ายอมรับ{" "}
            <Link
              href="/legal/terms#community"
              className="text-violet-500 hover:underline"
            >
              ข้อกำหนดชุมชน
            </Link>{" "}
            และยืนยันว่าเนื้อหาไม่มีข้อมูลส่วนบุคคลของผู้อื่น
          </p>
        </div>
      </div>
    </form>
  );
}
