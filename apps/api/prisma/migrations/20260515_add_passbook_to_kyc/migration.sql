-- FR-TH-02 / FR-PM-06: tutor passbook + bank info, captured during KYC
-- and required for admin to send manual PromptPay payouts on the 15th
-- and 30th. Mirrored from KycSubmission to TutorProfile on approval so
-- the payouts pipeline reads without a KYC join.
--
-- bankAccountNumber is encrypted at rest (AES-256-GCM, same CryptoService
-- envelope as Google refresh tokens). idName on KycSubmission is the
-- legal name from the National ID — bankAccountName must match it
-- (normalized) at submission and edit time.

ALTER TABLE "KycSubmission"
  ADD COLUMN "idName"            TEXT,
  ADD COLUMN "passbookObjectKey" TEXT,
  ADD COLUMN "bankName"          TEXT,
  ADD COLUMN "bankAccountNumber" TEXT,
  ADD COLUMN "bankAccountName"   TEXT;

ALTER TABLE "TutorProfile"
  ADD COLUMN "passbookObjectKey" TEXT,
  ADD COLUMN "bankName"          TEXT,
  ADD COLUMN "bankAccountNumber" TEXT,
  ADD COLUMN "bankAccountName"   TEXT,
  ADD COLUMN "bankUpdatedAt"     TIMESTAMP(3);
