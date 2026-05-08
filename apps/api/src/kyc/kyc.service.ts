import { BadRequestException, Injectable } from "@nestjs/common";
import type {
  KycSubmission,
  KycSubmitDto,
  KycUploadIntent,
} from "@peerahat/types";

import { StorageService } from "../common/storage.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class KycService {
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
}
