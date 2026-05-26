import { PageBackground } from "@peerahat/ui";
import { MessagesSquare } from "lucide-react";
import { redirect } from "next/navigation";

import { asNotFound, createApiClient } from "@/lib/api-client";
import { requireAuth } from "@/lib/auth";

import { ThreadsList } from "./_components/threads-list";

interface Props {
  // `?with=<tutorProfileId>` — opens (or fetches) the thread with that tutor
  // and preselects it. Used by ChatCta on tutor profiles.
  // `?thread=<threadId>` — preselects an existing thread by id. Used by
  // booking rows / scheduled events so chat-from-booking lands here too.
  // Both keep every chat entry on this single canonical /chat URL.
  searchParams: { with?: string; thread?: string };
}

export default async function ChatPage({ searchParams }: Props) {
  const withTutorId = searchParams.with?.trim() || null;
  const threadParam = searchParams.thread?.trim() || null;
  const nextUrl = withTutorId
    ? `/chat?with=${withTutorId}`
    : threadParam
      ? `/chat?thread=${threadParam}`
      : "/chat";
  const token = await requireAuth(nextUrl);
  const api = createApiClient({ accessToken: token });

  let initialSelectedId: string | null = null;
  let threads = await api.chat.threads();

  if (withTutorId) {
    const me = await api.users.me();
    // Tutors landing on /chat?with=<their own profile id> would hit the
    // backend's self-chat guard with a 403; strip the param and show the
    // threads list instead.
    if (me.tutorProfileId === withTutorId) {
      redirect("/chat");
    }
    const thread = await api.chat.openWithTutor(withTutorId);
    initialSelectedId = thread.id;
    // Defensive merge: openWithTutor may have just created the thread, in
    // which case the threads() call above might not see it yet.
    if (!threads.some((t) => t.id === thread.id)) {
      threads = [thread, ...threads];
    }
  } else if (threadParam) {
    initialSelectedId = threadParam;
    // If the thread isn't in the list (rare — e.g. just-created), fetch
    // it directly so the right pane has something to render. asNotFound
    // converts a backend 404 into Next's notFound() so a stale or
    // unauthorized thread id renders the 404 page instead of silently
    // dropping the user on the unfiltered threads list.
    if (!threads.some((t) => t.id === threadParam)) {
      const fetched = await asNotFound(api.chat.threadById(threadParam));
      threads = [fetched, ...threads];
    }
  }

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

        <ThreadsList
          initialThreads={threads}
          initialSelectedId={initialSelectedId}
        />
      </div>
    </>
  );
}
