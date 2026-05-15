// Smoke test: replays TutorsService.updateMyBank for kantee.k via Prisma
// + CryptoService directly (no Nest DI graph). Exercises the legacy-KYC
// back-fill path the user is about to hit through the UI.
//
// Run: pnpm exec tsx --env-file=.env scripts/test-add-bank.ts
import crypto from "node:crypto";

import { PrismaClient } from "@prisma/client";

const TUTOR_EMAIL = "kantee.k@kkumail.com";
const BANK_NAME = "SCB" as const;
const ACCOUNT_NUMBER = "1234567890";
const ACCOUNT_NAME = "Kantee Kantawat"; // doubles as idName for legacy back-fill
const PASSBOOK_OBJECT_KEY = "kyc-passbooks/kantee-k-test-passbook.jpg";

function normalizeName(s: string): string {
  return s.replace(/\s+/g, " ").trim().toLowerCase();
}

function encrypt(plaintext: string): string {
  const key = Buffer.from(
    process.env.GOOGLE_TOKEN_ENCRYPTION_KEY ?? "",
    "base64",
  );
  if (key.length !== 32) throw new Error("encryption key must decode to 32 bytes");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, ct, tag]).toString("base64");
}

async function main() {
  const prisma = new PrismaClient();
  const user = await prisma.user.findUnique({
    where: { email: TUTOR_EMAIL },
    include: { tutorProfile: true },
  });
  if (!user?.tutorProfile) throw new Error(`${TUTOR_EMAIL} has no tutorProfile`);

  const latestKyc = await prisma.kycSubmission.findFirst({
    where: { userId: user.id, status: "verified" },
    orderBy: { reviewedAt: "desc" },
  });
  if (!latestKyc) throw new Error(`No verified KYC for ${TUTOR_EMAIL}`);

  console.log("Before:");
  console.log(JSON.stringify(
    {
      kycIdName: latestKyc.idName,
      tutorBankName: user.tutorProfile.bankName,
      tutorBankAccountLast4: user.tutorProfile.bankAccountNumber
        ? "encrypted-blob"
        : null,
    },
    null,
    2,
  ));

  const canonicalIdName = latestKyc.idName ?? ACCOUNT_NAME;
  if (normalizeName(ACCOUNT_NAME) !== normalizeName(canonicalIdName)) {
    throw new Error(
      `Name mismatch: account=${ACCOUNT_NAME}, canonical=${canonicalIdName}`,
    );
  }

  const encryptedAccount = encrypt(ACCOUNT_NUMBER);
  const now = new Date();

  await prisma.$transaction([
    prisma.tutorProfile.update({
      where: { id: user.tutorProfile.id },
      data: {
        passbookObjectKey: PASSBOOK_OBJECT_KEY,
        bankName: BANK_NAME,
        bankAccountNumber: encryptedAccount,
        bankAccountName: ACCOUNT_NAME,
        bankUpdatedAt: now,
      },
    }),
    prisma.kycSubmission.update({
      where: { id: latestKyc.id },
      data: {
        ...(latestKyc.idName ? {} : { idName: canonicalIdName }),
        passbookObjectKey: PASSBOOK_OBJECT_KEY,
        bankName: BANK_NAME,
        bankAccountNumber: encryptedAccount,
        bankAccountName: ACCOUNT_NAME,
      },
    }),
  ]);

  const after = await prisma.tutorProfile.findUnique({
    where: { id: user.tutorProfile.id },
    select: {
      bankName: true,
      bankAccountName: true,
      bankUpdatedAt: true,
      passbookObjectKey: true,
    },
  });
  const refreshedKyc = await prisma.kycSubmission.findUnique({
    where: { id: latestKyc.id },
    select: { idName: true, bankAccountName: true },
  });

  console.log("\nAfter:");
  console.log(JSON.stringify(
    {
      tutorProfile: {
        ...after,
        accountLast4: ACCOUNT_NUMBER.slice(-4),
      },
      kycSubmission: refreshedKyc,
    },
    null,
    2,
  ));

  // Verify search visibility — tutor should now satisfy all three gates.
  const visibleTutor = await prisma.tutorProfile.findFirst({
    where: {
      id: user.tutorProfile.id,
      isVerified: true,
      googleRefreshToken: { not: null },
      bankAccountNumber: { not: null },
    },
    select: { id: true },
  });
  console.log(
    `\nSearch-visible: ${visibleTutor ? "YES (now appears in /tutors)" : "NO (still missing a gate)"}`,
  );

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("❌", err.message);
  process.exit(1);
});
