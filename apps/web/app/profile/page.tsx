import { PageBackground } from "@peerahat/ui";
import { UserCircle2 } from "lucide-react";

import { createApiClient } from "@/lib/api-client";
import { requireAuth } from "@/lib/auth";

import { ProfileEditForm } from "./_components/profile-edit-form";

// Profile page edits the User-row fields that any signed-in account
// owns: displayName + avatarUrl. Email + role + createdAt are read-only
// (Supabase / admin-managed). Tutor-specific fields (bio, subjects,
// university, etc.) live on /tutors/me/edit.
export default async function ProfilePage() {
  const token = await requireAuth("/profile");
  const me = await createApiClient({ accessToken: token }).users.me();

  return (
    <>
      <PageBackground photo={false} sparkles="sparse" />

      <div className="max-w-3xl mx-auto space-y-10">
        <header className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-grape-soft rounded-full text-[10px] font-bold uppercase tracking-widest text-dusty-grape">
            <UserCircle2 size={12} />
            Edit Profile
          </div>
          <h1
            className="thai font-bold text-grape-deep leading-[1.15]"
            style={{
              fontSize: "clamp(28px, 2.6vw, 40px)",
              letterSpacing: "-0.02em",
            }}
          >
            แก้ไขโปรไฟล์
          </h1>
          <p className="thai text-[15px] text-ink-soft leading-relaxed">
            อัปเดตชื่อที่แสดงและรูปโปรไฟล์ของคุณ ข้อมูลนี้จะปรากฏบน
            บทสนทนา รีวิว และโพสต์ในชุมชน
          </p>
        </header>

        <ProfileEditForm initialUser={me} />
      </div>
    </>
  );
}
