import { createApiClient } from "@/lib/api-client";
import { requireAuth } from "@/lib/auth";

import { ChatRoom } from "../_components/chat-room";

interface Props {
  params: { id: string };
}

export default async function ChatPage({ params }: Props) {
  const token = await requireAuth(`/chat/${params.id}`);
  const api = createApiClient({ accessToken: token });
  const thread = await api.chat.openWithTutor(params.id);
  const initialMessages = await api.chat.messages(thread.id);

  return <ChatRoom thread={thread} initialMessages={initialMessages} />;
}
