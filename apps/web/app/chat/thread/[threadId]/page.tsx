import { asNotFound, createApiClient } from "@/lib/api-client";
import { requireAuth } from "@/lib/auth";

import { ChatRoom } from "../../_components/chat-room";

interface Props {
  params: { threadId: string };
}

export default async function ChatThreadPage({ params }: Props) {
  const token = await requireAuth(`/chat/thread/${params.threadId}`);
  const api = createApiClient({ accessToken: token });
  const thread = await asNotFound(api.chat.threadById(params.threadId));
  const initialMessages = await api.chat.messages(thread.id);

  return <ChatRoom thread={thread} initialMessages={initialMessages} />;
}
