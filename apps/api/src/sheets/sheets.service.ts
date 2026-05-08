import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Page, StudySheet, Subject } from "@peerahat/types";

import { StorageService } from "../common/storage.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class SheetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async list(query: { subject?: string; q?: string }): Promise<Page<StudySheet>> {
    const where: Parameters<typeof this.prisma.studySheet.findMany>[0] extends
      | { where?: infer W }
      | undefined
      ? W
      : never = {
      isSuspended: false,
      ...(query.subject ? { subject: query.subject } : {}),
      ...(query.q
        ? {
            OR: [
              { title: { contains: query.q, mode: "insensitive" as const } },
              { description: { contains: query.q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.studySheet.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 30,
        include: { seller: { include: { user: true } } },
      }),
      this.prisma.studySheet.count({ where }),
    ]);

    return {
      items: rows.map((r) => this.toDto(r)),
      total,
      page: 1,
      pageSize: 30,
    };
  }

  async findById(id: string): Promise<StudySheet> {
    const row = await this.prisma.studySheet.findUnique({
      where: { id },
      include: { seller: { include: { user: true } } },
    });
    if (!row) throw new NotFoundException();
    return this.toDto(row);
  }

  async issueDownload(supabaseId: string, sheetId: string) {
    const user = await this.prisma.user.findUnique({ where: { supabaseId } });
    if (!user) throw new BadRequestException();
    const purchased = await this.prisma.paymentIntent.findFirst({
      where: {
        payerId: user.id,
        sheetId,
        status: { in: ["verified", "held_in_escrow", "released"] },
      },
    });
    if (!purchased) throw new ForbiddenException("No purchase on record");
    const sheet = await this.prisma.studySheet.findUnique({
      where: { id: sheetId },
    });
    if (!sheet) throw new NotFoundException();
    return this.storage.signDownload(sheet.pdfObjectKey);
  }

  async report(
    supabaseId: string,
    sheetId: string,
    dto: { reason: string; details: string },
  ) {
    const user = await this.prisma.user.findUnique({ where: { supabaseId } });
    if (!user) throw new BadRequestException();
    await this.prisma.report.create({
      data: {
        reporterId: user.id,
        targetType: "sheet",
        targetId: sheetId,
        reason: dto.reason,
        details: dto.details,
      },
    });
    if (dto.reason === "copyright") {
      await this.prisma.studySheet.update({
        where: { id: sheetId },
        data: { isSuspended: true },
      });
    }
  }

  private toDto(row: {
    id: string;
    sellerId: string;
    title: string;
    description: string;
    subject: string;
    priceThb: number;
    rating: number;
    reviewCount: number;
    previewImageObjectKeys: string[];
    introVideoUrl: string | null;
    pageCount: number;
    isSuspended: boolean;
    createdAt: Date;
    seller: { university: string; faculty: string; user: { displayName: string } };
  }): StudySheet {
    return {
      id: row.id,
      sellerId: row.sellerId,
      sellerDisplayName: row.seller.user.displayName,
      sellerUniversity: row.seller.university,
      sellerFaculty: row.seller.faculty,
      title: row.title,
      description: row.description,
      subject: row.subject as Subject,
      priceThb: row.priceThb,
      rating: row.rating,
      reviewCount: row.reviewCount,
      previewImageUrls: row.previewImageObjectKeys,
      introVideoUrl: row.introVideoUrl ?? undefined,
      pageCount: row.pageCount,
      isSuspended: row.isSuspended,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
