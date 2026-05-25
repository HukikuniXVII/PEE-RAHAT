import { PageBackground } from "@peerahat/ui";
import { MessagesSquare } from "lucide-react";

import { asNotFound, createApiClient } from "@/lib/api-client";
import { requireAuth } from "@/lib/auth";

import { ThreadsList } from "../../_components/threads-list";

interface Props {
  params: { threadId: string };
}

export default async function ChatThreadPage({ params }: Props) {
  const token = await requireAuth(`/chat/thread/${params.threadId}`);
  const api = createApiClient({ accessToken: token });
  const thread = await asNotFound(api.chat.threadById(params.threadId));
  const threadsRaw = await api.chat.threads();
  const threads = threadsRaw.some((t) => t.id === thread.id)
    ? threadsRaw
    : [thread, ...threadsRaw];

  return (
    <>
      <PageBackground photo={false} sparkles="sparse" />

      <div className="max-w-5xl mx-auto space-y-8 pb-20">
        <header className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-grape-soft rounded-full text-[10px] font-bold uppercase tracking-widest text-dusty-grape">
            <MessagesSquare size={12} />
            My Conversations
          </div>
          <h1
            className="thai font-bold text-grape-deep leading-[1.15]"
            style={{
              fontSize: "clamp(28px, 2.6vw, 40px)",
              letterSpacing: "-0.02em",
            }}
          >
            พูดคุยกับพี่รหัส
          </h1>
          <p className="thai text-[15px] text-ink-soft leading-relaxed">
            คุยกับพี่รหัสที่คุณจองคลาสไว้ หรือสอบถามก่อนตัดสินใจ
          </p>
        </header>

        <ThreadsList initialThreads={threads} initialSelectedId={thread.id} />
      </div>
    </>
  );
}
