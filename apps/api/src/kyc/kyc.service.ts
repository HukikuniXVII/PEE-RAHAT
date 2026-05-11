import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import type {
  KycSubmission,
  KycSubmitDto,
  KycUploadIntent,
} from "@peerahat/types";

import { StorageService } from "../common/storage.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class KycService {
  private readonly logger = new Logger(KycService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
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

    const submission = await this.prisma.kycSubmission.create({
      data: {
        userId: user.id,
        idPhotoKey: dto.idPhotoKey,
        selfieKey: dto.selfieKey,
        transcriptKey: dto.transcriptKey,
        status: "pending",
      },
    });

    return {
      id: submission.id,
      userId: submission.userId,
      idPhotoKey: submission.idPhotoKey,
      selfieKey: submission.selfieKey,
      transcriptKey: submission.transcriptKey,
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
