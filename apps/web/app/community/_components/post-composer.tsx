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
import { Hash, Image as ImageIcon, Loader2 } from "lucide-react";
import Link from "next/link";
import { useForm } from "react-hook-form";

import { createApiClient } from "@/lib/api-client";

import { Avatar } from "./avatar";

interface Props {
  currentDisplayName: string;
}

// SimpleComposer per V2 handoff: 40px avatar + 2-row auto-resize textarea
// + image/tag pill buttons (visual only for V1) + Post pill that activates
// once the textarea has content. Title is auto-derived from the first
// line of content so the existing CommunityPost.title contract stays
// satisfied without exposing two fields to the user.
export function PostComposer({ currentDisplayName }: Props) {
  const queryClient = useQueryClient();
  const form = useForm<CreatePostDto>({
    resolver: zodResolver(createPostSchema),
    defaultValues: {
      title: "",
      content: "",
      consentPdpaAccepted: true,
    },
    mode: "onChange",
  });

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
    },
  });

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
            {...form.register("content")}
          />
          <div className="flex items-center gap-1 mt-2 pt-2.5 cozy-hairline">
            <button
              type="button"
              disabled
              className="thai text-[13px] font-semibold inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-emerald-600 opacity-60 cursor-not-allowed"
              title="กำลังจะมา"
            >
              <ImageIcon size={15} strokeWidth={1.8} /> รูปภาพ
            </button>
            <button
              type="button"
              disabled
              className="thai text-[13px] font-semibold inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-violet-500 opacity-60 cursor-not-allowed"
              title="พิมพ์ # ในเนื้อหาเพื่อใส่แท็ก"
            >
              <Hash size={15} strokeWidth={1.8} /> แท็ก
            </button>
            <span className="flex-1" />
            <button
              type="submit"
              disabled={!hasContent || createPost.isPending}
              className={`thai text-[13px] font-bold px-4 py-1.5 rounded-full transition inline-flex items-center gap-1.5 ${
                hasContent
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
