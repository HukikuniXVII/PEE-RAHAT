export type UserRole = "student" | "tutor" | "parent" | "admin";

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt: string;
}

export interface SessionUser extends User {
  emailVerified: boolean;
}
