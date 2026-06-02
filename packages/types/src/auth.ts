import { z } from "zod";

export type UserRole = "student" | "tutor" | "parent" | "admin";

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt: string;
  // Present once the user has completed /tutors/onboarding (FR-TH-03).
  // Links the account dropdown to the tutor's own /tutors/[id] page.
  tutorProfileId?: string;
}

export interface SessionUser extends User {
  emailVerified: boolean;
}

export const signInSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(72),
});

export type SignInDto = z.infer<typeof signInSchema>;

export const signUpSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(72),
  displayName: z.string().trim().min(2).max(60),
});

export type SignUpDto = z.infer<typeof signUpSchema>;

// FR-TH-03: tutor (or any signed-in user) edits their account profile.
export const userProfileUpdateSchema = z.object({
  displayName: z.string().trim().min(2).max(60).optional(),
  avatarUrl: z
    .string()
    .trim()
    .url("กรอก URL ให้ถูกต้อง")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export type UserProfileUpdateDto = z.infer<typeof userProfileUpdateSchema>;

// ─── NFR-04 (PDPA): self-service account deletion ──────────────────────────

/**
 * Reason a user gives for deleting their account. Optional — the dropdown
 * maps each code to a Thai label in the UI; the chosen code (plus any free
 * text) is composed into User.deletionReason for the audit trail.
 */
export const DELETION_REASONS = [
  "no_longer_use",
  "switched_service",
  "platform_issue",
  "other",
] as const;

export type DeletionReasonCode = (typeof DELETION_REASONS)[number];

/** Body for POST /users/me/request-deletion. Password re-authenticates the
 *  destructive action server-side (Supabase signInWithPassword). */
export const requestDeletionSchema = z.object({
  password: z.string().min(1, "กรุณากรอกรหัสผ่าน").max(72),
  reasonCode: z.enum(DELETION_REASONS).optional(),
  reason: z.string().trim().max(500).optional(),
});

export type RequestDeletionDto = z.infer<typeof requestDeletionSchema>;

/** Body for POST /users/me/confirm-deletion — the 1h deletion JWT from the
 *  emailed confirmation link. Token is the sole authorization (route is
 *  public) so the click works even without an active Supabase session. */
export const confirmDeletionSchema = z.object({
  token: z.string().min(1),
});

export type ConfirmDeletionDto = z.infer<typeof confirmDeletionSchema>;

/** GET /users/me/deletion-eligibility. `blockers` are human-readable Thai
 *  strings the UI renders verbatim; deletion is allowed iff `canDelete`. */
export interface DeletionEligibility {
  canDelete: boolean;
  blockers: string[];
}

export interface RequestDeletionResult {
  ok: true;
  /**
   * Only populated when the email transport is stubbed (Supabase
   * service-role key unset, i.e. local dev / tests) so the flow can be
   * completed without a live inbox. Never set in production.
   */
  devConfirmUrl?: string;
}

export interface ConfirmDeletionResult {
  ok: true;
}

export interface AvatarUploadIntent {
  uploadUrl: string;
  objectKey: string;
  publicUrl: string;
  expiresAt: string;
}

/** Body for POST /users/me/avatar-intent. Only image MIME types are
 *  allowed — the storage signer wires the contentType straight into the
 *  presigned PUT, so non-images would otherwise reach R2/S3. */
export const avatarIntentSchema = z.object({
  contentType: z
    .string()
    .min(1)
    .refine((v) => v.startsWith("image/"), {
      message: "avatar contentType must be image/*",
    }),
});

export type AvatarIntentDto = z.infer<typeof avatarIntentSchema>;
