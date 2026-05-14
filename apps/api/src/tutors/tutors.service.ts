import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  Subject,
  Tutor,
  TutorOnboardingDto,
  TutorProfileUpdateDto,
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

    // FR-TH-14: defectCount asc as the final tiebreaker so tutors with
    // 3+ no-shows / unilateral cancels sink within their bucket.
    const primarySort: Prisma.TutorProfileOrderByWithRelationInput =
      query.sort === "priceAsc"
        ? { hourlyRate: "asc" }
        : query.sort === "priceDesc"
          ? { hourlyRate: "desc" }
          : query.sort === "newest"
            ? { createdAt: "desc" }
            : { rating: "desc" };
    const orderBy: Prisma.TutorProfileOrderByWithRelationInput[] = [
      primarySort,
      { defectCount: "asc" },
    ];

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

  /**
   * FR-TH-03 — creates the TutorProfile row and promotes the User to role
   * "tutor" atomically. Required before a tutor can submit KYC for review
   * (FR-TH-02): the admin approve path expects a TutorProfile to flip
   * isVerified on.
   */
  async onboard(supabaseId: string, dto: TutorOnboardingDto): Promise<Tutor> {
    const user = await this.prisma.user.findUnique({ where: { supabaseId } });
    if (!user) throw new BadRequestException("Unknown user");

    const existing = await this.prisma.tutorProfile.findUnique({
      where: { userId: user.id },
    });
    if (existing) {
      throw new ConflictException("คุณได้สมัครเป็นพี่ติวไว้แล้ว");
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const profile = await tx.tutorProfile.create({
        data: {
          userId: user.id,
          bio: dto.bio,
          university: dto.university,
          faculty: dto.faculty,
          hourlyRate: dto.hourlyRate,
          subjects: dto.subjects,
          introVideoUrl: dto.introVideoUrl ?? null,
        },
        include: { user: true },
      });
      await tx.user.update({
        where: { id: user.id },
        data: { role: "tutor" },
      });
      return profile;
    });
    return this.toDto(created);
  }

  /**
   * FR-TH-03 — tutor edits their own profile. Only fields present in the
   * DTO are written; introVideoUrl explicitly clears with an empty string.
   * isVerified / rating / reviewCount are intentionally not editable here.
   */
  async updateMyProfile(
    supabaseId: string,
    dto: TutorProfileUpdateDto,
  ): Promise<Tutor> {
    const user = await this.prisma.user.findUnique({ where: { supabaseId } });
    if (!user) throw new BadRequestException("Unknown user");
    const existing = await this.prisma.tutorProfile.findUnique({
      where: { userId: user.id },
    });
    if (!existing) throw new NotFoundException("Tutor profile not found");

    const data: Prisma.TutorProfileUpdateInput = {};
    if (dto.bio !== undefined) data.bio = dto.bio;
    if (dto.university !== undefined) data.university = dto.university;
    if (dto.faculty !== undefined) data.faculty = dto.faculty;
    if (dto.hourlyRate !== undefined) data.hourlyRate = dto.hourlyRate;
    if (dto.subjects !== undefined) data.subjects = dto.subjects;
    if (dto.introVideoUrl !== undefined) data.introVideoUrl = dto.introVideoUrl;

    const updated = await this.prisma.tutorProfile.update({
      where: { id: existing.id },
      data,
      include: { user: true },
    });
    return this.toDto(updated);
  }

  async findById(id: string): Promise<Tutor> {
    const row = await this.prisma.tutorProfile.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!row) throw new NotFoundException();
    return this.toDto(row);
  }

  async listReviews(
    id: string,
    pageInput?: number,
    pageSizeInput?: number,
  ): Promise<{
    items: TutorReview[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const page = Math.max(1, pageInput ?? 1);
    const pageSize = Math.min(50, Math.max(1, pageSizeInput ?? 10));
    const [rows, total] = await Promise.all([
      this.prisma.tutorReview.findMany({
        where: { tutorId: id },
        orderBy: { createdAt: "desc" },
        include: { student: true },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.tutorReview.count({ where: { tutorId: id } }),
    ]);
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
      total,
      page,
      pageSize,
    };
  }

  /**
   * FR-TH-09: only the student of a completed booking can submit a review,
   * one per booking. Updates the tutor's aggregate rating + reviewCount on
   * commit so listings stay in sync.
   */
  async createReview(
    supabaseId: string,
    tutorId: string,
    dto: { bookingId: string; rating: number; text: string },
  ): Promise<TutorReview> {
    const user = await this.prisma.user.findUnique({ where: { supabaseId } });
    if (!user) throw new BadRequestException();

    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
    });
    if (!booking) throw new NotFoundException("Booking not found");
    if (booking.studentId !== user.id) throw new ForbiddenException();
    if (booking.tutorId !== tutorId) {
      throw new BadRequestException("Tutor mismatch");
    }
    if (booking.status !== "completed") {
      throw new BadRequestException("Booking not completed");
    }

    const existing = await this.prisma.tutorReview.findUnique({
      where: { bookingId: dto.bookingId },
    });
    if (existing) throw new ConflictException("Already reviewed");

    const created = await this.prisma.tutorReview.create({
      data: {
        bookingId: dto.bookingId,
        studentId: user.id,
        tutorId,
        rating: dto.rating,
        text: dto.text,
      },
      include: { student: true },
    });

    const allReviews = await this.prisma.tutorReview.findMany({
      where: { tutorId },
      select: { rating: true },
    });
    const avg =
      allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length;
    await this.prisma.tutorProfile.update({
      where: { id: tutorId },
      data: { rating: avg, reviewCount: allReviews.length },
    });

    return {
      id: created.id,
      bookingId: created.bookingId,
      studentId: created.studentId,
      studentDisplayName: created.student.displayName,
      tutorId: created.tutorId,
      rating: created.rating as 1 | 2 | 3 | 4 | 5,
      text: created.text,
      createdAt: created.createdAt.toISOString(),
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
