import { z } from "zod";

export interface CommunityPost {
  id: string;
  authorId: string;
  authorDisplayName: string;
  authorBadge: string;
  title: string;
  content: string;
  upvotes: number;
  hasUpvoted: boolean;
  replyCount: number;
  createdAt: string;
}

export interface CommunityReply {
  id: string;
  postId: string;
  authorId: string;
  authorDisplayName: string;
  authorBadge: string;
  content: string;
  createdAt: string;
}

export const createPostSchema = z.object({
  title: z.string().trim().min(1).max(200),
  content: z.string().trim().min(1).max(10_000),
  consentPdpaAccepted: z.boolean().refine((v) => v === true, {
    message: "PDPA consent required",
  }),
});

export type CreatePostDto = z.infer<typeof createPostSchema>;

export const createReplySchema = z.object({
  postId: z.string().min(1),
  content: z.string().trim().min(1).max(10_000),
});

export type CreateReplyDto = z.infer<typeof createReplySchema>;

export const reportTargetTypeSchema = z.enum([
  "post",
  "reply",
  "sheet",
  "tutor",
  "message",
]);

export type ReportTargetType = z.infer<typeof reportTargetTypeSchema>;

export const reportSchema = z.object({
  targetType: reportTargetTypeSchema,
  targetId: z.string().min(1),
  reason: z.string().min(1),
  details: z.string().min(1).max(2000),
});

export type ReportDto = z.infer<typeof reportSchema>;
