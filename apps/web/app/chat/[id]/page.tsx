import { PageBackground } from "@peerahat/ui";
import { MessagesSquare } from "lucide-react";
import { redirect } from "next/navigation";

import { createApiClient } from "@/lib/api-client";
import { requireAuth } from "@/lib/auth";

import { ThreadsList } from "../_components/threads-list";

interface Props {
  params: { id: string };
}

export default async function ChatWithTutorPage({ params }: Props) {
  const token = await requireAuth(`/chat/${params.id}`);
  const api = createApiClient({ accessToken: token });
  const me = await api.users.me();
  // Tutors landing on their own /chat/<tutorProfileId> would hit the
  // backend's self-chat guard with a 403; bounce them to the threads list
  // instead so the error page never renders.
  if (me.tutorProfileId === params.id) redirect("/chat");

  // Open (or fetch existing) thread with this tutor, then load the full
  // threads list so we can render the same split-pane layout as /chat
  // with this conversation preselected on the right.
  const thread = await api.chat.openWithTutor(params.id);
  const threadsRaw = await api.chat.threads();
  // Defensive merge: if openWithTutor just created the thread, the
  // subsequent threads() call should already include it, but cover the
  // edge case where read-after-write hasn't propagated.
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
