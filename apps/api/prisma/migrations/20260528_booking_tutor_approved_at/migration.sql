-- FR-TH-18 rev3: invert the group-session sequencing so the tutor
-- approves BEFORE the host pays. tutorApprovedAt is the latch the new
-- onParticipantPaid path checks to decide whether to confirm the group
-- immediately (tutor already approved) or stay in tutor_review (tutor
-- hasn't approved yet — back-end safety, since the frontend now blocks
-- the host's Pay button until this column is non-null).

ALTER TABLE "Booking" ADD COLUMN "tutorApprovedAt" TIMESTAMP(3);
