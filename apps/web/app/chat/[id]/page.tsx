import { redirect } from "next/navigation";

import { createApiClient } from "@/lib/api-client";
import { requireAuth } from "@/lib/auth";

import { ChatRoom } from "../_components/chat-room";

interface Props {
  params: { id: string };
}

export default async function ChatPage({ params }: Props) {
  const token = await requireAuth(`/chat/${params.id}`);
  const api = createApiClient({ accessToken: token });
  const me = await api.users.me();
  // Tutors landing on their own /chat/<tutorProfileId> would hit the
  // backend's self-chat guard with a 403; bounce them to the threads list
  // instead so the error page never renders.
  if (me.tutorProfileId === params.id) redirect("/chat");
  const thread = await api.chat.openWithTutor(params.id);
  const initialMessages = await api.chat.messages(thread.id);

  return <ChatRoom thread={thread} initialMessages={initialMessages} />;
}
