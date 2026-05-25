import { Users as UsersIcon } from "lucide-react";

import { createApiClient } from "@/lib/api-client";
import { requireAdmin } from "@/lib/auth";

import { UsersList } from "./_components/users-list";

/**
 * Admin testing tool — list / edit / hard-delete user accounts.
 *
 * Admin-only (requireAdmin gate). Edit covers displayName + role;
 * delete cascades via the existing onDelete: Cascade relations on
 * TutorProfile, StudentProfile, KycSubmission, and student-side
 * bookings. The Supabase auth row stays — admins must delete that
 * separately in the Supabase dashboard.
 */
export default async function AdminUsersPage() {
  const token = await requireAdmin("/admin/users");
  const api = createApiClient({ accessToken: token });
  const [initial, me] = await Promise.all([
    api.admin.users.list({ page: 1, pageSize: 25 }),
    api.users.me(),
  ]);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <header className="flex items-center gap-4">
        <div className="w-12 h-12 bg-slate-100 text-slate-700 rounded-2xl flex items-center justify-center">
          <UsersIcon size={24} />
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
            Admin · Testing
          </p>
          <h1 className="text-3xl font-black text-slate-900">
            จัดการบัญชีผู้ใช้
          </h1>
          <p className="text-sm text-slate-500">
            แก้ไขชื่อ / role และลบบัญชี — ใช้สำหรับทดสอบเท่านั้น
            การลบจะ cascade ไปยังโปรไฟล์ติวเตอร์/นักเรียน, KYC,
            และการจองที่เกี่ยวข้อง (กู้คืนไม่ได้)
          </p>
        </div>
      </header>
      <UsersList initial={initial} currentUserId={me.id} />
    </div>
  );
}
