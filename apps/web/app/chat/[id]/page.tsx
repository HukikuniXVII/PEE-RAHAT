import { Lock } from "lucide-react";

import { createApiClient } from "@/lib/api-client";
import { getServerAccessToken } from "@/lib/supabase/server";

import { ChatRoom } from "./_components/chat-room";

interface Props {
  params: { id: string };
}

export default async function ChatPage({ params }: Props) {
  const token = await getServerAccessToken();

  if (!token) {
    return (
      <div className="max-w-md mx-auto bg-white p-12 rounded-[32px] border border-slate-200 shadow-sm text-center space-y-4">
        <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center mx-auto">
          <Lock size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-800">
          ต้องเข้าสู่ระบบก่อน
        </h2>
        <p className="text-sm text-slate-500">
          กรุณาล็อกอินเพื่อเริ่มสนทนากับพี่ติว
        </p>
      </div>
    );
  }

  const api = createApiClient({ accessToken: token });
  const tutor = await api.tutors.byId(params.id);
  const thread = await api.chat.openWithTutor(params.id);
  const initialMessages = await api.chat.messages(thread.id);

  return (
    <ChatRoom
      thread={thread}
      tutor={tutor}
      initialMessages={initialMessages}
    />
  );
}
