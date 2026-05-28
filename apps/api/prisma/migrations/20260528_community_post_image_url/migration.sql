-- V2 community: optional image attachment on posts. Uploaded via signed
-- PUT into the public avatars bucket (community/ prefix) and stored as
-- the resolved public URL so feed renders don't need a signing round-trip.

ALTER TABLE "CommunityPost" ADD COLUMN "imageUrl" TEXT;
