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

export interface CreatePostDto {
  title: string;
  content: string;
  consentPdpaAccepted: boolean;
}

export interface CreateReplyDto {
  postId: string;
  content: string;
}

export type ReportTargetType = "post" | "reply" | "sheet" | "tutor" | "message";

export interface ReportDto {
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  details: string;
}
