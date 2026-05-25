-- AlterTable
ALTER TABLE "TcasProgram" ALTER COLUMN "tags" DROP DEFAULT;

-- AlterTable
ALTER TABLE "TutorProfile" ADD COLUMN     "pendingBankAccountName" TEXT,
ADD COLUMN     "pendingBankAccountNumber" TEXT,
ADD COLUMN     "pendingBankName" TEXT,
ADD COLUMN     "pendingBankSubmittedAt" TIMESTAMP(3),
ADD COLUMN     "pendingIdName" TEXT,
ADD COLUMN     "pendingPassbookObjectKey" TEXT;

-- RenameIndex
ALTER INDEX "TcasProgram_identity_key" RENAME TO "TcasProgram_university_major_subTrack_programType_round_adm_key";
