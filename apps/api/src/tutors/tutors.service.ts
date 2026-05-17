import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  CreateReviewDto,
  CreateUnavailabilityDto,
  MaskedBankInfo,
  Subject,
  Tutor,
  TutorOnboardingDto,
  TutorProfileUpdateDto,
  TutorReview,
  TutorSearchQuery,
  TutorSearchResult,
  TutorUnavailability,
  UpdateBankDto,
} from "@peerahat/types";
import type { Prisma } from "@prisma/client";

import { BookingsService, type BusySlot } from "../bookings/bookings.service";
import { CryptoService } from "../common/crypto.service";
import { PrismaService } from "../prisma/prisma.service";
import { normalizeName } from "../kyc/kyc.service";

@Injectable()
export class TutorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bookings: BookingsService,
    private readonly crypto: CryptoService,
  ) {}

  /**
   * FR-TH-15: busy intervals for the picker. Resolves the tutor's User.id
   * once, then defers to BookingsService.collectBusyForUserId so the
   * overlap source is shared with /bookings/mine/busy and assertNoOverlap.
   */
  async listBusyForTutor(
    tutorId: string,
    from: Date,
    to: Date,
  ): Promise<BusySlot[]> {
    const tutor = await this.prisma.tutorProfile.findUnique({
      where: { id: tutorId },
      select: { userId: true },
    });
    if (!tutor) throw new NotFoundException();
    return this.bookings.collectBusyForUserId(tutor.userId, from, to);
  }

  // ── FR-TH-16: tutor unavailability rules ───────────────────────────────
  async listMyUnavailability(supabaseId: string): Promise<TutorUnavailability[]> {
    const tutor = await this.requireTutorProfile(supabaseId);
    const rows = await this.prisma.tutorUnavailability.findMany({
      where: { tutorId: tutor.id },
      orderBy: [{ weekday: "asc" }, { startMinute: "asc" }],
    });
    return rows.map((r) => ({
      id: r.id,
      weekday: r.weekday,
      startMinute: r.startMinute,
      endMinute: r.endMinute,
      reason: r.reason ?? undefined,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async createUnavailability(
    supabaseId: string,
    dto: CreateUnavailabilityDto,
  ): Promise<TutorUnavailability> {
    // Schema-level refinement already catches this at the controller —
    // keeping the runtime check as defense-in-depth for any future
    // non-HTTP callers (jobs, scripts) that might bypass the schema.
    if (dto.endMinute <= dto.startMinute) {
      throw new BadRequestException("endMinute must be greater than startMinute");
    }
    const tutor = await this.requireTutorProfile(supabaseId);
    const created = await this.prisma.tutorUnavailability.create({
      data: {
        tutorId: tutor.id,
        weekday: dto.weekday,
        startMinute: dto.startMinute,
        endMinute: dto.endMinute,
        reason: dto.reason ?? null,
      },
    });
    return {
      id: created.id,
      weekday: created.weekday,
      startMinute: created.startMinute,
      endMinute: created.endMinute,
      reason: created.reason ?? undefined,
      createdAt: created.createdAt.toISOString(),
    };
  }

  async deleteUnavailability(supabaseId: string, id: string): Promise<void> {
    const tutor = await this.requireTutorProfile(supabaseId);
    const row = await this.prisma.tutorUnavailability.findUnique({
      where: { id },
    });
    if (!row) throw new NotFoundException();
    if (row.tutorId !== tutor.id) throw new ForbiddenException();
    await this.prisma.tutorUnavailability.delete({ where: { id } });
  }

  private async requireTutorProfile(supabaseId: string) {
    const user = await this.prisma.user.findUnique({ where: { supabaseId } });
    if (!user) throw new BadRequestException();
    const tutor = await this.prisma.tutorProfile.findUnique({
      where: { userId: user.id },
    });
    if (!tutor) {
      throw new BadRequestException("Only tutors can manage unavailability");
    }
    return tutor;
  }

  async search(query: TutorSearchQuery): Promise<TutorSearchResult> {
    // FR-TH-17 rev3: search hides tutors who haven't connected a Google
    // account. Bookings have to mint a Meet link at payment-confirm, so a
    // tutor without OAuth can't deliver a class — surfacing them in
    // search would be a dead-end. The connection state is also the
    // platform's "ready to take bookings" signal alongside isVerified.
    // Additional gate (FR-TH-02): tutors without bank info can't be paid;
    // hiding them from search prevents bookings that would block on payout.
    const where: Prisma.TutorProfileWhereInput = {
      isVerified: true,
      googleRefreshToken: { not: null },
      bankAccountNumber: { not: null },
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
   * FR-TH-03 — creates the TutorProfile row. The User's role stays at
   * "student" until admin approves the KYC submission
   * (AdminService.reviewKyc is the only place that promotes the role).
   * This prevents a user who only filled in the profile form — and never
   * completed KYC — from being treated as a tutor by search-visibility
   * gates, dropdowns, or any other role check.
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

    const created = await this.prisma.tutorProfile.create({
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
    dto: CreateReviewDto,
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
      googleConnected: row.googleRefreshToken !== null,
    };
  }

  // ── FR-TH-02: bank-info edit surface ───────────────────────────────────
  /** Masked bank info for the tutor's own profile page — never returns the
   *  full account number. */
  async getMyBank(supabaseId: string): Promise<MaskedBankInfo | null> {
    const tutor = await this.requireTutorBySupabaseId(supabaseId);
    if (
      !tutor.bankAccountNumber ||
      !tutor.bankName ||
      !tutor.bankAccountName ||
      !tutor.bankUpdatedAt
    ) {
      return null;
    }
    const accountNumber = this.crypto.decrypt(tutor.bankAccountNumber);
    return {
      bankName: tutor.bankName as MaskedBankInfo["bankName"],
      accountLast4: accountNumber.slice(-4),
      accountName: tutor.bankAccountName,
      updatedAt: tutor.bankUpdatedAt.toISOString(),
    };
  }

  /**
   * FR-TH-02: tutor edits their bank info after KYC approval. Server
   * re-runs the bankAccountName === idName check (against the *latest
   * verified* KycSubmission). Also writes back to that KycSubmission so
   * admin queues stay in sync.
   */
  async updateMyBank(
    supabaseId: string,
    dto: UpdateBankDto,
  ): Promise<MaskedBankInfo> {
    const tutor = await this.requireTutorBySupabaseId(supabaseId);
    const latestKyc = await this.prisma.kycSubmission.findFirst({
      where: { userId: tutor.userId, status: "verified" },
      orderBy: { reviewedAt: "desc" },
    });
    if (!latestKyc) {
      throw new BadRequestException(
        "ต้องผ่าน KYC ก่อนจึงจะแก้ไขข้อมูลบัญชีได้",
      );
    }

    const bankAccountName = dto.bank.bankAccountName.trim();
    // Legacy tutors verified before FR-TH-02 don't have idName on their
    // KycSubmission — the column was added later. First bank-info entry
    // for them accepts an idName from the dto (or falls back to the
    // bankAccountName) and back-fills the KYC row. Subsequent edits enforce
    // the canonical-name match using that back-filled value.
    let canonicalIdName = latestKyc.idName;
    if (!canonicalIdName) {
      canonicalIdName = (dto.idName ?? bankAccountName).trim();
      if (canonicalIdName.length < 2) {
        throw new BadRequestException(
          "ระบุชื่อ-นามสกุลตามบัตรประชาชนเพื่อบันทึกข้อมูลบัญชี",
        );
      }
    }

    if (normalizeName(bankAccountName) !== normalizeName(canonicalIdName)) {
      throw new BadRequestException(
        "ชื่อบัญชีธนาคารต้องตรงกับชื่อในบัตรประชาชน",
      );
    }
    const encryptedAccount = this.crypto.encrypt(dto.bank.bankAccountNumber);
    const now = new Date();

    await this.prisma.$transaction([
      this.prisma.tutorProfile.update({
        where: { id: tutor.id },
        data: {
          passbookObjectKey: dto.passbookObjectKey,
          bankName: dto.bank.bankName,
          bankAccountNumber: encryptedAccount,
          bankAccountName,
          bankUpdatedAt: now,
        },
      }),
      this.prisma.kycSubmission.update({
        where: { id: latestKyc.id },
        data: {
          // Back-fill the canonical idName for legacy KYC rows on first
          // bank entry — subsequent edits go through the match check
          // against this value.
          ...(latestKyc.idName ? {} : { idName: canonicalIdName }),
          passbookObjectKey: dto.passbookObjectKey,
          bankName: dto.bank.bankName,
          bankAccountNumber: encryptedAccount,
          bankAccountName,
        },
      }),
    ]);

    return {
      bankName: dto.bank.bankName,
      accountLast4: dto.bank.bankAccountNumber.slice(-4),
      accountName: bankAccountName,
      updatedAt: now.toISOString(),
    };
  }

  private async requireTutorBySupabaseId(supabaseId: string) {
    const user = await this.prisma.user.findUnique({
      where: { supabaseId },
      include: { tutorProfile: true },
    });
    if (!user) throw new BadRequestException("Unknown user");
    if (!user.tutorProfile) {
      throw new BadRequestException("Only tutors can manage bank info");
    }
    return user.tutorProfile;
  }
}
