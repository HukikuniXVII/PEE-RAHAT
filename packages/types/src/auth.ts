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
