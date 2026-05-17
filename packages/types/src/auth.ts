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
