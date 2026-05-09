import { createApiClient } from "@/lib/api-client";
import { requireAuth } from "@/lib/auth";

import { ThreadsList } from "./_components/threads-list";

export default async function ChatThreadsPage() {
  const token = await requireAuth("/chat");
  const api = createApiClient({ accessToken: token });
  const initial = await api.chat.threads();

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-20">
      <div className="space-y-2">
        <h2 className="text-4xl font-black text-slate-900">My Conversations</h2>
        <p className="text-slate-500 font-medium tracking-tight">
          คุยกับพี่ติวที่คุณจองคลาสไว้ หรือสอบถามก่อนตัดสินใจ
        </p>
      </div>
      <ThreadsList initialThreads={initial} />
    </div>
  );
}
