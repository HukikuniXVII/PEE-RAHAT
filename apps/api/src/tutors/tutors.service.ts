import { Injectable, NotFoundException } from "@nestjs/common";
import type {
  Subject,
  Tutor,
  TutorReview,
  TutorSearchQuery,
  TutorSearchResult,
} from "@peerahat/types";
import type { Prisma } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class TutorsService {
  constructor(private readonly prisma: PrismaService) {}

  async search(query: TutorSearchQuery): Promise<TutorSearchResult> {
    const where: Prisma.TutorProfileWhereInput = {
      isVerified: true,
    };
    if (query.subject) {
      where.subjects = { has: query.subject };
    }
    if (query.university) where.university = query.university;
    if (query.minRating) where.rating = { gte: query.minRating };
    if (query.minPrice || query.maxPrice) {
      where.hourlyRate = {
        gte: query.minPrice,
        lte: query.maxPrice,
      };
    }
    if (query.q) {
      where.OR = [
        { bio: { contains: query.q, mode: "insensitive" } },
        { user: { displayName: { contains: query.q, mode: "insensitive" } } },
        { university: { contains: query.q, mode: "insensitive" } },
      ];
    }

    const orderBy: Prisma.TutorProfileOrderByWithRelationInput =
      query.sort === "priceAsc"
        ? { hourlyRate: "asc" }
        : query.sort === "priceDesc"
          ? { hourlyRate: "desc" }
          : query.sort === "newest"
            ? { createdAt: "desc" }
            : { rating: "desc" };

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const [rows, total] = await Promise.all([
      this.prisma.tutorProfile.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { user: true },
      }),
      this.prisma.tutorProfile.count({ where }),
    ]);

    return {
      items: rows.map((r) => this.toDto(r)),
      total,
      page,
      pageSize,
    };
  }

  async findById(id: string): Promise<Tutor> {
    const row = await this.prisma.tutorProfile.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!row) throw new NotFoundException();
    return this.toDto(row);
  }

  async listReviews(id: string): Promise<{
    items: TutorReview[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const rows = await this.prisma.tutorReview.findMany({
      where: { tutorId: id },
      orderBy: { createdAt: "desc" },
      include: { student: true },
      take: 50,
    });
    return {
      items: rows.map((r) => ({
        id: r.id,
        bookingId: r.bookingId,
        studentId: r.studentId,
        studentDisplayName: r.student.displayName,
        tutorId: r.tutorId,
        rating: r.rating as 1 | 2 | 3 | 4 | 5,
        text: r.text,
        createdAt: r.createdAt.toISOString(),
      })),
      total: rows.length,
      page: 1,
      pageSize: 50,
    };
  }

  private toDto(row: Prisma.TutorProfileGetPayload<{ include: { user: true } }>): Tutor {
    return {
      id: row.id,
      userId: row.userId,
      displayName: row.user.displayName,
      bio: row.bio,
      university: row.university,
      faculty: row.faculty,
      subjects: row.subjects as Subject[],
      hourlyRate: row.hourlyRate,
      rating: row.rating,
      reviewCount: row.reviewCount,
      isVerified: row.isVerified,
      introVideoUrl: row.introVideoUrl ?? undefined,
      avatarUrl: row.user.avatarUrl ?? "",
    };
  }
}
