import { PageBackground } from "@peerahat/ui";
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

      <div className="mx-auto max-w-[1200px] px-5 md:px-6 py-6 md:py-8">
        {/* sr-only h1 for assistive tech + SEO — matches the community
            page chrome rule. The handoff intentionally has no visible
            page heading. */}
        <h1 className="sr-only">แชทกับพี่รหัส</h1>

        <ThreadsList
          initialThreads={threads}
          initialSelectedId={initialSelectedId}
        />
      </div>
    </>
  );
}
