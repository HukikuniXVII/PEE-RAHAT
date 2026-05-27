"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { createReplySchema } from "@peerahat/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { createApiClient } from "@/lib/api-client";

const replyFormSchema = createReplySchema.pick({ content: true });
type ReplyFormValues = z.infer<typeof replyFormSchema>;

interface Props {
  postId: string;
}

export function ReplyComposer({ postId }: Props) {
  const queryClient = useQueryClient();
  const form = useForm<ReplyFormValues>({
    resolver: zodResolver(replyFormSchema),
    defaultValues: { content: "" },
    mode: "onChange",
  });

  const createReply = useMutation({
    mutationFn: (values: ReplyFormValues) =>
      createApiClient().community.reply({ postId, content: values.content }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["community", "replies", postId],
      });
      queryClient.invalidateQueries({ queryKey: ["community", "posts"] });
      form.reset();
    },
  });

  return (
    <form
      onSubmit={form.handleSubmit((values) => createReply.mutate(values))}
      className="flex items-center gap-2"
    >
      <div className="flex-1 px-3 py-1.5 rounded-full flex items-center gap-2 bg-white border border-[rgba(85,65,139,0.1)]">
        <input
          type="text"
          placeholder="แสดงความเห็น…"
          className="flex-1 thai text-[12.5px] outline-none bg-transparent text-ink placeholder:text-ink-mute"
          {...form.register("content")}
        />
      </div>
      <button
        type="submit"
        disabled={!form.formState.isValid || createReply.isPending}
        className="w-9 h-9 inline-flex items-center justify-center rounded-full bg-violet-500 text-white hover:bg-violet-600 transition disabled:bg-grape-soft disabled:text-ink-mute"
        aria-label="ส่งความเห็น"
      >
        <Send size={13} strokeWidth={2} />
      </button>
    </form>
  );
}
