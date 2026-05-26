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
    // Visibility gates, merged from FR-TH-02 (suspension) + FR-TH-04
    // (intro video). The earlier `isVerified` + `bankAccountNumber`
    // gates were intentionally dropped in 63c3c5e + a67bb4c so all non-
    // suspended tutors are discoverable; an unbanked tutor still blocks
    // at payout until an admin adds bank info, which is the right
    // failure point.
    //
    // FR-CM-05 (suspension): written as an explicit OR rather than
    // `NOT { gt: now }` because Prisma translates the NOT form into
    // `NOT EXISTS (... WHERE suspendedUntil > now)`, which silently
    // drops rows where suspendedUntil IS NULL — i.e. every never-
    // suspended tutor.
    //
    // FR-TH-04 (intro video): tutors without an intro video stay
    // hidden. Same field powers the booking-create guard in
    // BookingsService.create as defence in depth.
    //
    // FR-TH-02 (admin hide): admin can toggle hiddenFromSearchAt to
    // remove a tutor from the search list without suspending the
    // underlying user. Direct-link booking + existing chat threads still
    // work for hidden tutors; only discovery is gated.
    const now = new Date();
    const where: Prisma.TutorProfileWhereInput = {
      introVideoUrl: { not: null },
      hiddenFromSearchAt: null,
      user: {
        OR: [{ suspendedUntil: null }, { suspendedUntil: { lte: now } }],
      },
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
      throw new ConflictException("คุณได้สมัครเป็นพี่รหัสไว้แล้ว");
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
        where: { tutorId: id, removed: false },
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
      where: { tutorId, removed: false },
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
    return {
      bankName: tutor.bankName as MaskedBankInfo["bankName"],
      accountLast4: this.crypto.maskedAccountLast4(tutor.bankAccountNumber),
      accountName: tutor.bankAccountName,
      updatedAt: tutor.bankUpdatedAt.toISOString(),
      pending: this.buildPendingBankInfo(tutor),
    };
  }

  /**
   * Build the public-safe pending payload from the encrypted columns.
   * Returns null when no pending edit is awaiting review. Same masking
   * rules as the live MaskedBankInfo — only last-4 of the account number
   * is ever exposed.
   */
  private buildPendingBankInfo(tutor: {
    pendingBankName: string | null;
    pendingBankAccountNumber: string | null;
    pendingBankAccountName: string | null;
    pendingIdName: string | null;
    pendingBankSubmittedAt: Date | null;
  }) {
    if (
      !tutor.pendingBankName ||
      !tutor.pendingBankAccountNumber ||
      !tutor.pendingBankAccountName ||
      !tutor.pendingBankSubmittedAt
    ) {
      return null;
    }
    return {
      bankName: tutor.pendingBankName as MaskedBankInfo["bankName"],
      accountLast4: this.crypto.maskedAccountLast4(tutor.pendingBankAccountNumber),
      accountName: tutor.pendingBankAccountName,
      idName: tutor.pendingIdName ?? tutor.pendingBankAccountName,
      submittedAt: tutor.pendingBankSubmittedAt.toISOString(),
    };
  }

  /**
   * FR-TH-02 (rev): tutor edits their bank info after KYC approval.
   * Writes the change to the `pending*` columns instead of the live
   * fields and awaits an admin approve/reject via
   * /admin/tutors/:id/bank/approve|reject. The live bank stays
   * authoritative for payouts and search visibility until the change is
   * approved — so an in-flight edit never blocks payouts or hides the
   * tutor from search.
   *
   * Removed in this revision: the client-side and server-side
   * normalizeName(bankAccountName) === normalizeName(idName) check.
   * Admin reviewers compare the passbook image to the ID-name manually
   * during the approve step.
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
    // Carry idName forward — use the dto value if provided, otherwise
    // fall back to the existing canonical name on the latest KYC. This
    // lets a tutor whose legal name changed update both at once.
    const idName = (dto.idName ?? latestKyc.idName ?? bankAccountName).trim();
    if (idName.length < 2) {
      throw new BadRequestException(
        "ระบุชื่อ-นามสกุลตามบัตรประชาชนเพื่อบันทึกข้อมูลบัญชี",
      );
    }

    // Require live bank columns to already be populated before we accept
    // a pending edit. Without a live row the response shape can't be
    // satisfied honestly — fabricating one from the pending submission
    // would render as if the change had been approved. Bouncing here
    // (before the write) avoids saving phantom pending state.
    if (
      !tutor.bankName ||
      !tutor.bankAccountNumber ||
      !tutor.bankAccountName ||
      !tutor.bankUpdatedAt
    ) {
      throw new BadRequestException(
        "ข้อมูลบัญชีรับเงินของคุณยังไม่ครบ ติดต่อแอดมินเพื่อรีเซ็ตสถานะ KYC",
      );
    }

    const encryptedAccount = this.crypto.encrypt(dto.bank.bankAccountNumber);

    await this.prisma.tutorProfile.update({
      where: { id: tutor.id },
      data: {
        pendingBankName: dto.bank.bankName,
        pendingBankAccountNumber: encryptedAccount,
        pendingBankAccountName: bankAccountName,
        pendingPassbookObjectKey: dto.passbookObjectKey,
        pendingIdName: idName,
        pendingBankSubmittedAt: new Date(),
      },
    });

    // getMyBank will not return null here — the live-column check above
    // guarantees the masked record is well-formed, and re-reading via
    // getMyBank also picks up the freshly-written pending payload.
    const live = await this.getMyBank(supabaseId);
    if (!live) {
      throw new Error(
        "updateMyBank: live bank disappeared between guard and re-read",
      );
    }
    return live;
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
