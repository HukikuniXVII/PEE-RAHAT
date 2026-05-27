import { redirect } from "next/navigation";

import { createApiClient } from "@/lib/api-client";
import { requireAuth } from "@/lib/auth";

import { BankStatusBanner } from "./_components/bank-status-banner";
import { GoogleCalendarCard } from "./_components/google-calendar-card";
import { ProfileCompletionPanel } from "./_components/profile-completion-panel";
import { ProfileEditForm } from "./_components/profile-edit-form";
import { VideoPendingBanner } from "./_components/video-pending-banner";

export default async function TutorProfileEditPage() {
  const token = await requireAuth("/tutors/me/edit");
  const api = createApiClient({ accessToken: token });
  const me = await api.users.me();
  if (!me.tutorProfileId) redirect("/tutors/onboarding");
  const tutor = await api.tutors.byId(me.tutorProfileId);

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 space-y-8">
      <header className="space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-violet-500">
          Tutor
        </p>
        <h1 className="text-3xl font-bold text-violet-700 thai">แก้ไขโปรไฟล์</h1>
        <p className="text-sm text-neutral-500 thai">
          อัปเดตข้อมูลของคุณเพื่อให้นักเรียนรู้จักคุณมากขึ้น
        </p>
      </header>
      <ProfileCompletionPanel tutor={tutor} />
      {!tutor.introVideoUrl && <VideoPendingBanner />}
      <div id="google-calendar-section">
        <GoogleCalendarCard tutor={tutor} />
      </div>
      <BankStatusBanner />
      <ProfileEditForm
        tutor={tutor}
        initialDisplayName={me.displayName}
        initialAvatarUrl={me.avatarUrl ?? ""}
      />
    </div>
  );
}
