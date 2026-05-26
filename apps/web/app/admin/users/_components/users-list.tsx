"use client";

import type {
  AdminUserPage,
  AdminUserRow,
  UpdateAdminUserDto,
  UserRole,
} from "@peerahat/types";
import { cn } from "@peerahat/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { createApiClient } from "@/lib/api-client";

interface Props {
  initial: AdminUserPage;
  currentUserId: string;
}

const ROLE_LABEL: Record<UserRole, string> = {
  student: "นักเรียน",
  tutor: "ติวเตอร์",
  parent: "ผู้ปกครอง",
  admin: "ผู้ดูแล",
};

const ROLE_STYLE: Record<UserRole, string> = {
  student: "bg-violet-100 text-violet-700 border-violet-200",
  tutor: "bg-emerald-100 text-emerald-700 border-emerald-200",
  parent: "bg-amber-100 text-amber-700 border-amber-200",
  admin: "bg-rose-100 text-rose-700 border-rose-200",
};

const PAGE_SIZE = 25;

export function UsersList({ initial, currentUserId }: Props) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(initial.page);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  const query = useQuery({
    queryKey: ["admin", "users", page, appliedSearch],
    queryFn: () =>
      createApiClient().admin.users.list({
        page,
        pageSize: PAGE_SIZE,
        q: appliedSearch || undefined,
      }),
    initialData: page === initial.page && appliedSearch === "" ? initial : undefined,
    placeholderData: (prev) => prev,
  });

  const data = query.data ?? initial;
  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["admin", "users"] });

  function applySearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAppliedSearch(search.trim());
    setPage(1);
  }

  return (
    <section className="space-y-5">
      <form onSubmit={applySearch} className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหา email หรือชื่อ..."
            className="thai w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:border-slate-400 outline-none"
          />
        </div>
        <button
          type="submit"
          className="thai px-5 py-3 rounded-2xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800"
        >
          ค้นหา
        </button>
        {appliedSearch && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setAppliedSearch("");
              setPage(1);
            }}
            className="thai px-3 py-3 rounded-2xl bg-slate-100 text-slate-700 text-sm font-bold hover:bg-slate-200"
          >
            ล้าง
          </button>
        )}
      </form>

      <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <p className="thai text-[12px] font-bold text-slate-500">
            {data.total.toLocaleString()} บัญชี
            {appliedSearch && (
              <span className="ml-1 text-slate-400">
                ที่ตรงกับ &ldquo;{appliedSearch}&rdquo;
              </span>
            )}
          </p>
          {query.isFetching && (
            <Loader2 size={14} className="animate-spin text-slate-400" />
          )}
        </div>

        {data.items.length === 0 ? (
          <p className="thai text-center text-sm text-slate-400 py-12">
            ไม่พบบัญชี
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.items.map((u) => (
              <UserRow
                key={u.id}
                user={u}
                isSelf={u.id === currentUserId}
                onChanged={invalidate}
              />
            ))}
          </ul>
        )}
      </div>

      {totalPages > 1 && (
        <nav className="flex items-center justify-center gap-2">
          <button
            type="button"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="thai text-[12px] font-semibold px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:border-slate-400 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ‹ ย้อนกลับ
          </button>
          <span className="tabular-nums text-[12px] font-bold px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700">
            หน้า {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page === totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="thai text-[12px] font-semibold px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:border-slate-400 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ถัดไป ›
          </button>
        </nav>
      )}
    </section>
  );
}

function UserRow({
  user,
  isSelf,
  onChanged,
}: {
  user: AdminUserRow;
  isSelf: boolean;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  // FR-TH-02: optimistic local state for the hide toggle so the row
  // updates immediately on click instead of waiting for the refetch.
  const [hiddenAt, setHiddenAt] = useState<string | undefined>(
    user.tutorHiddenFromSearchAt,
  );

  const setVisibility = useMutation({
    mutationFn: ({
      tutorProfileId,
      hidden,
    }: {
      tutorProfileId: string;
      hidden: boolean;
    }) =>
      createApiClient().admin.setTutorVisibility(tutorProfileId, { hidden }),
    onSuccess: (res) => {
      setHiddenAt(res.hiddenFromSearchAt ?? undefined);
      toast.success(
        res.hiddenFromSearchAt
          ? "ซ่อนติวเตอร์จาก /tutors แล้ว"
          : "แสดงติวเตอร์ใน /tutors แล้ว",
      );
      onChanged();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
    },
  });

  return (
    <>
      <li className="px-6 py-4 flex items-center gap-4">
        <span className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-600 text-sm font-black flex items-center justify-center shrink-0">
          {user.displayName.slice(0, 2).toUpperCase()}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="thai text-sm font-bold text-slate-900 truncate">
              {user.displayName}
            </p>
            {isSelf && (
              <span className="thai text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">
                คุณ
              </span>
            )}
            <span
              className={cn(
                "thai text-[10px] font-bold px-1.5 py-0.5 rounded border",
                ROLE_STYLE[user.role],
              )}
            >
              {ROLE_LABEL[user.role]}
            </span>
          </div>
          <p className="text-[12px] text-slate-500 truncate">{user.email}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            สมัครเมื่อ {new Date(user.createdAt).toLocaleString("th-TH")}
            {user.hasTutorProfile && " · มีโปรไฟล์ติวเตอร์"}
            {user.hasStudentProfile && " · มีโปรไฟล์นักเรียน"}
            {user.bookingCount > 0 &&
              ` · จองคลาส ${user.bookingCount} ครั้ง`}
            {hiddenAt && " · 🚫 ซ่อนใน /tutors"}
          </p>
        </div>
        {user.hasTutorProfile && user.tutorProfileId && (
          <button
            type="button"
            disabled={setVisibility.isPending}
            onClick={() =>
              setVisibility.mutate({
                tutorProfileId: user.tutorProfileId!,
                hidden: !hiddenAt,
              })
            }
            title={
              hiddenAt
                ? "ตอนนี้ถูกซ่อนใน /tutors — กดเพื่อแสดงอีกครั้ง"
                : "ตอนนี้แสดงใน /tutors — กดเพื่อซ่อน"
            }
            className={cn(
              "thai inline-flex items-center gap-1 px-3 py-1.5 text-[12px] font-bold rounded-xl border disabled:opacity-40 disabled:cursor-not-allowed",
              hiddenAt
                ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200",
            )}
          >
            {setVisibility.isPending ? (
              <Loader2 size={12} className="animate-spin" />
            ) : hiddenAt ? (
              <EyeOff size={12} />
            ) : (
              <Eye size={12} />
            )}
            {hiddenAt ? "แสดงใน /tutors" : "ซ่อนใน /tutors"}
          </button>
        )}
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="thai inline-flex items-center gap-1 px-3 py-1.5 text-[12px] font-bold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200"
        >
          <Pencil size={12} />
          แก้ไข
        </button>
        <button
          type="button"
          onClick={() => setConfirmingDelete(true)}
          disabled={isSelf}
          title={isSelf ? "ลบบัญชีของตัวเองไม่ได้" : undefined}
          className="thai inline-flex items-center gap-1 px-3 py-1.5 text-[12px] font-bold rounded-xl bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Trash2 size={12} />
          ลบ
        </button>
      </li>

      {editing && (
        <EditUserModal
          user={user}
          isSelf={isSelf}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            onChanged();
          }}
        />
      )}
      {confirmingDelete && (
        <DeleteConfirmModal
          user={user}
          onClose={() => setConfirmingDelete(false)}
          onDeleted={() => {
            setConfirmingDelete(false);
            onChanged();
          }}
        />
      )}
    </>
  );
}

function EditUserModal({
  user,
  isSelf,
  onClose,
  onSaved,
}: {
  user: AdminUserRow;
  isSelf: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [role, setRole] = useState<UserRole>(user.role);

  const dirty = displayName.trim() !== user.displayName || role !== user.role;
  const wouldDemoteSelf = isSelf && role !== "admin";

  const save = useMutation({
    mutationFn: () => {
      const dto: UpdateAdminUserDto = {};
      if (displayName.trim() !== user.displayName)
        dto.displayName = displayName.trim();
      if (role !== user.role) dto.role = role;
      return createApiClient().admin.users.update(user.id, dto);
    },
    onSuccess: () => {
      toast.success("บันทึกแล้ว");
      onSaved();
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ"),
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-[28px] border border-slate-200 shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 p-6 pb-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
              Edit user
            </p>
            <h2 className="thai text-lg font-black text-slate-900 mt-1">
              {user.displayName}
            </h2>
            <p className="text-[12px] text-slate-500">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700"
            aria-label="ปิด"
          >
            <X size={18} />
          </button>
        </header>

        <div className="px-6 pb-2 space-y-4">
          <label className="block space-y-1.5">
            <span className="thai text-[11px] font-bold uppercase tracking-widest text-slate-500">
              ชื่อที่แสดง
            </span>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="thai w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-slate-400 outline-none"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="thai text-[11px] font-bold uppercase tracking-widest text-slate-500">
              Role
            </span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="thai w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:border-slate-400 outline-none"
            >
              <option value="student">นักเรียน (student)</option>
              <option value="tutor">ติวเตอร์ (tutor)</option>
              <option value="parent">ผู้ปกครอง (parent)</option>
              <option value="admin">ผู้ดูแลระบบ (admin)</option>
            </select>
            {wouldDemoteSelf && (
              <span className="thai text-[10.5px] text-rose-600 inline-flex items-center gap-1">
                <AlertTriangle size={10} />
                ลด role ของบัญชีตัวเองไม่ได้ (จะหลุดจาก /admin)
              </span>
            )}
            {role === "tutor" && !user.hasTutorProfile && (
              <span className="thai text-[10.5px] text-amber-700 inline-flex items-center gap-1">
                <AlertTriangle size={10} />
                บัญชีนี้ยังไม่มี TutorProfile — น้องๆ จะหาไม่เจอจนกว่าจะ
                onboard
              </span>
            )}
          </label>
        </div>

        <footer className="p-6 pt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="thai px-4 py-2 text-sm font-bold rounded-xl text-slate-600 hover:bg-slate-100"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            disabled={!dirty || save.isPending || wouldDemoteSelf}
            onClick={() => save.mutate()}
            className="thai inline-flex items-center gap-1.5 px-5 py-2 text-sm font-bold rounded-xl bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {save.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <ShieldCheck size={14} />
            )}
            บันทึก
          </button>
        </footer>
      </div>
    </div>
  );
}

function DeleteConfirmModal({
  user,
  onClose,
  onDeleted,
}: {
  user: AdminUserRow;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [confirmText, setConfirmText] = useState("");
  const expected = user.email;
  const matches = confirmText === expected;

  const del = useMutation({
    mutationFn: () => createApiClient().admin.users.delete(user.id),
    onSuccess: () => {
      toast.success("ลบบัญชีแล้ว");
      onDeleted();
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "ลบไม่สำเร็จ"),
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-[28px] border border-rose-200 shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="p-6 pb-3 flex items-start gap-3">
          <span className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 inline-flex items-center justify-center shrink-0">
            <Trash2 size={18} />
          </span>
          <div className="min-w-0">
            <h2 className="thai text-lg font-black text-rose-700">
              ลบบัญชีนี้แบบถาวร?
            </h2>
            <p className="thai text-[12.5px] text-slate-600 mt-1 leading-relaxed">
              <strong>{user.displayName}</strong> ({user.email}) —
              การลบจะ cascade ไปยังโปรไฟล์ติวเตอร์/นักเรียน, KYC, การจอง
              ({user.bookingCount} ครั้ง), การชำระเงิน, แชท ฯลฯ
              ของบัญชีนี้ทันที <strong className="text-rose-700">กู้คืนไม่ได้</strong>
            </p>
          </div>
        </header>

        <div className="px-6 pb-2 space-y-2">
          <label className="block space-y-1.5">
            <span className="thai text-[11px] font-bold uppercase tracking-widest text-slate-500">
              พิมพ์อีเมลของบัญชีเพื่อยืนยัน
            </span>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={expected}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:border-rose-400 outline-none"
              autoFocus
            />
          </label>
        </div>

        <footer className="p-6 pt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="thai px-4 py-2 text-sm font-bold rounded-xl text-slate-600 hover:bg-slate-100"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            disabled={!matches || del.isPending}
            onClick={() => del.mutate()}
            className="thai inline-flex items-center gap-1.5 px-5 py-2 text-sm font-bold rounded-xl bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {del.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Trash2 size={14} />
            )}
            ลบบัญชีถาวร
          </button>
        </footer>
      </div>
    </div>
  );
}
