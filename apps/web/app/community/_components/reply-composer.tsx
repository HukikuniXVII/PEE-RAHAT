"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { createReplySchema } from "@peerahat/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

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
      className="flex gap-3 pt-2"
    >
      <textarea
        placeholder="ตอบกลับ..."
        className="flex-1 bg-slate-50 border-none rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-indigo-500/20"
        {...form.register("content")}
      />
      <button
        type="submit"
        disabled={!form.formState.isValid || createReply.isPending}
        className="px-4 py-2 bg-slate-100 text-slate-400 rounded-xl hover:bg-indigo-600 hover:text-white transition-all disabled:opacity-50"
      >
        <Send size={14} />
      </button>
    </form>
  );
}
