"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  type CommunityPost,
  type CreatePostDto,
  type Page,
  createPostSchema,
} from "@peerahat/types";
import { Button } from "@peerahat/ui";
import {
  type InfiniteData,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { User } from "lucide-react";
import { useForm } from "react-hook-form";

import { createApiClient } from "@/lib/api-client";

export function PostComposer() {
  const queryClient = useQueryClient();
  const form = useForm<CreatePostDto>({
    resolver: zodResolver(createPostSchema),
    defaultValues: {
      title: "",
      content: "",
      consentPdpaAccepted: false,
    },
    mode: "onChange",
  });

  const createPost = useMutation({
    mutationFn: (dto: CreatePostDto) => createApiClient().community.create(dto),
    onSuccess: (created) => {
      // Prepend the new post to the first cached page so it shows up
      // immediately at the top without a network round-trip.
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

  const onSubmit = form.handleSubmit((values) => createPost.mutate(values));

  return (
    <form
      onSubmit={onSubmit}
      className="bg-white rounded-[32px] border border-slate-200 p-8 shadow-sm space-y-6"
    >
      <div className="flex gap-4">
        <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
          <User size={24} />
        </div>
        <div className="flex-1 space-y-4">
          <input
            type="text"
            placeholder="หัวข้อกระทู้ของคุณ..."
            className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20"
            {...form.register("title")}
          />
          <textarea
            placeholder="เนื้อหาที่ต้องการแชร์..."
            className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 resize-none min-h-[120px]"
            {...form.register("content")}
          />
          <label className="flex items-start gap-2 text-[10px] text-slate-500 font-medium">
            <input
              type="checkbox"
              className="mt-1"
              {...form.register("consentPdpaAccepted")}
            />
            <span>
              ข้าพเจ้าได้ตรวจสอบแล้วว่าเนื้อหาไม่มีข้อมูลส่วนบุคคล (PDPA) และยอมรับข้อกำหนดของ Pee Rahat
            </span>
          </label>
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={!form.formState.isValid || createPost.isPending}
              className="px-8 font-black shadow-lg shadow-indigo-100"
            >
              ตั้งกระทู้
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
