import {
  BadRequestException,
  Injectable,
  Logger,
  UnprocessableEntityException,
} from "@nestjs/common";
import type {
  KycSubmission,
  KycSubmitDto,
  KycUploadIntent,
} from "@peerahat/types";

import { CryptoService } from "../common/crypto.service";
import { StorageService } from "../common/storage.service";
import { PrismaService } from "../prisma/prisma.service";

/**
 * FR-TH-02: name normalization for the bankAccountName === idName check.
 * Thai has no case so toLowerCase is a no-op for ID names, but the trim +
 * whitespace-collapse covers the common slips (extra spaces, NBSP runs).
 */
export function normalizeName(s: string): string {
  return s.replace(/\s+/g, " ").trim().toLowerCase();
}

@Injectable()
export class KycService {
  private readonly logger = new Logger(KycService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly crypto: CryptoService,
  ) {}

  async requestUpload(
    supabaseId: string,
    field: KycUploadIntent["field"],
    contentType: string,
  ): Promise<KycUploadIntent> {
    const user = await this.prisma.user.findUnique({ where: { supabaseId } });
    if (!user) throw new BadRequestException("Unknown user");
    const signed = await this.storage.signKycUpload(user.id, field, contentType);
    return { field, ...signed };
  }

  async submit(supabaseId: string, dto: KycSubmitDto): Promise<KycSubmission> {
    if (!dto.consentPdpaAccepted) {
      throw new BadRequestException("PDPA consent required");
    }
    const user = await this.prisma.user.findUnique({ where: { supabaseId } });
    if (!user) throw new BadRequestException("Unknown user");

    // FR-TH-02: bankAccountName must match the legal name on the ID
    // (normalized). 422 because the data is well-formed but fails a
    // business invariant — distinct from 400 schema validation.
    const idName = dto.idName.trim();
    const bankAccountName = dto.bank.bankAccountName.trim();
    if (normalizeName(bankAccountName) !== normalizeName(idName)) {
      throw new UnprocessableEntityException(
        "ชื่อบัญชีธนาคารต้องตรงกับชื่อในบัตรประชาชน",
      );
    }

    const submission = await this.prisma.kycSubmission.create({
      data: {
        userId: user.id,
        idPhotoKey: dto.idPhotoKey,
        selfieKey: dto.selfieKey,
        transcriptKey: dto.transcriptKey,
        idName,
        passbookObjectKey: dto.passbookObjectKey,
        bankName: dto.bank.bankName,
        bankAccountNumber: this.crypto.encrypt(dto.bank.bankAccountNumber),
        bankAccountName,
        status: "pending",
      },
    });

    return {
      id: submission.id,
      userId: submission.userId,
      idPhotoKey: submission.idPhotoKey,
      selfieKey: submission.selfieKey,
      transcriptKey: submission.transcriptKey,
      passbookObjectKey: submission.passbookObjectKey ?? undefined,
      status: submission.status,
      submittedAt: submission.submittedAt.toISOString(),
    };
  }

  /**
   * NFR-03: every verified KYC submission must move from the hot bucket to
   * cold archive. The cron runs hourly so worst-case latency is ~1h —
   * comfortably inside the 24h SLA. Per-row try/catch keeps a single bad
   * object from blocking the rest of the batch; the row stays unarchived
   * and we'll retry it on the next tick.
   */
  async archiveVerified(now: Date = new Date()): Promise<{ archived: number }> {
    const due = await this.prisma.kycSubmission.findMany({
      where: { status: "verified", archivedAt: null },
    });

    let archived = 0;
    for (const sub of due) {
      try {
        await Promise.all([
          this.storage.archiveKycObject(sub.idPhotoKey),
          this.storage.archiveKycObject(sub.selfieKey),
          this.storage.archiveKycObject(sub.transcriptKey),
        ]);
        await this.prisma.kycSubmission.update({
          where: { id: sub.id },
          data: { archivedAt: now },
        });
        archived += 1;
      } catch (err) {
        this.logger.error(
          `Failed to archive KYC ${sub.id}: ${String(err)} — will retry next tick`,
        );
      }
    }
    return { archived };
  }
}
