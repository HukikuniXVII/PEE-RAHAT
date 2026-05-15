import { redirect } from "next/navigation";

import { requireAuth } from "@/lib/auth";
import { createApiClient } from "@/lib/api-client";

import { GoogleCalendarCard } from "./_components/google-calendar-card";
import { ProfileEditForm } from "./_components/profile-edit-form";

export default async function TutorProfileEditPage() {
  const token = await requireAuth("/tutors/me/edit");
  const api = createApiClient({ accessToken: token });
  const me = await api.users.me();
  if (!me.tutorProfileId) redirect("/tutors/onboarding");
  const tutor = await api.tutors.byId(me.tutorProfileId);

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 space-y-8">
      <GoogleCalendarCard tutor={tutor} />
      <ProfileEditForm
        tutor={tutor}
        initialDisplayName={me.displayName}
        initialAvatarUrl={me.avatarUrl ?? ""}
      />
    </div>
  );
}
