import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import type {
  AdminKycDetail,
  AdminKycQueueItem,
  AdminPassbookView,
  AdminPaymentRow,
  AdminPayoutDetail,
  PaymentItemType,
  PaymentStatus,
} from "@peerahat/types";

import type {
  AdminBankChangeItem,
  AdminRevealedBankInfo,
  AdminUserPage,
  AdminUserRow,
  BankName,
  SetTutorVisibilityDto,
  SetTutorVisibilityResult,
  UpdateAdminUserDto,
  UserRole,
} from "@peerahat/types";

import { AuditLogService } from "../common/audit-log.service";
import { CryptoService } from "../common/crypto.service";
import { StorageService } from "../common/storage.service";
import { GoogleCalendarService } from "../integrations/google-calendar/google-calendar.service";
import { NotificationService } from "../notifications/notification.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly googleCalendar: GoogleCalendarService,
    private readonly crypto: CryptoService,
    private readonly audit: AuditLogService,
    private readonly notifications: NotificationService,
  ) {}

  /**
   * FR-TH-02 / PDPA: build the passbook + bank block for an admin surface
   * and write an AdminAuditLog row. Returns null when the tutor has no
   * passbook on file yet (pre-feature legacy). The signed URL is fresh on
   * every call — admin UIs must not cache it past the 5-minute expiry.
   */
  private async buildPassbookView(args: {
    adminId: string;
    targetType: "tutor" | "kyc" | "payout";
    targetId: string;
    passbookObjectKey: string | null;
    bankName: string | null;
    bankAccountNumber: string | null;
    bankAccountName: string | null;
    ip?: string;
  }): Promise<AdminPassbookView | null> {
    if (
      !args.passbookObjectKey ||
      !args.bankName ||
      !args.bankAccountNumber ||
      !args.bankAccountName
    ) {
      return null;
    }
    const signed = await this.storage.signDownload(args.passbookObjectKey);
    await this.audit.recordAdminAction({
      adminId: args.adminId,
      action: "view_passbook",
      targetType: args.targetType,
      targetId: args.targetId,
      ip: args.ip,
    });
    return {
      imageUrl: signed.url,
      imageExpiresAt: signed.expiresAt,
      bankName: args.bankName as BankName,
      bankAccountNumberFull: this.crypto.decrypt(args.bankAccountNumber),
      bankAccountName: args.bankAccountName,
    };
  }

  /**
   * FR-TH-02: per-submission KYC detail used by the admin review page.
   * The queue endpoint omits passbook + idName so the queue render stays
   * cheap and a passbook view doesn't get audit-logged on list load.
   */
  async kycById(
    adminId: string,
    submissionId: string,
    ip?: string,
  ): Promise<AdminKycDetail> {
    const sub = await this.prisma.kycSubmission.findUnique({
      where: { id: submissionId },
      include: { user: true },
    });
    if (!sub) throw new NotFoundException();
    const [idPhoto, selfie, transcript, passbook] = await Promise.all([
      this.storage.signDownload(sub.idPhotoKey),
      this.storage.signDownload(sub.selfieKey),
      this.storage.signDownload(sub.transcriptKey),
      this.buildPassbookView({
        adminId,
        targetType: "kyc",
        targetId: sub.id,
        passbookObjectKey: sub.passbookObjectKey,
        bankName: sub.bankName,
        bankAccountNumber: sub.bankAccountNumber,
        bankAccountName: sub.bankAccountName,
        ip,
      }),
    ]);
    return {
      id: sub.id,
      userId: sub.userId,
      userDisplayName: sub.user.displayName,
      userEmail: sub.user.email,
      idPhotoUrl: idPhoto.url,
      selfieUrl: selfie.url,
      transcriptUrl: transcript.url,
      idName: sub.idName,
      status: sub.status,
      rejectionReason: sub.rejectionReason,
      submittedAt: sub.submittedAt.toISOString(),
      reviewedAt: sub.reviewedAt ? sub.reviewedAt.toISOString() : null,
      passbook,
    };
  }

  /**
   * FR-TH-02: standalone passbook block for a tutor — used by the admin
   * tutor-detail page outside of a KYC or payout context. Tutor-level
   * passbook reflects the latest admin-approved KYC (mirrored on approve).
   */
  async tutorPassbook(
    adminId: string,
    tutorId: string,
    ip?: string,
  ): Promise<AdminPassbookView | null> {
    const tutor = await this.prisma.tutorProfile.findUnique({
      where: { id: tutorId },
      select: {
        passbookObjectKey: true,
        bankName: true,
        bankAccountNumber: true,
        bankAccountName: true,
      },
    });
    if (!tutor) throw new NotFoundException();
    return this.buildPassbookView({
      adminId,
      targetType: "tutor",
      targetId: tutorId,
      passbookObjectKey: tutor.passbookObjectKey,
      bankName: tutor.bankName,
      bankAccountNumber: tutor.bankAccountNumber,
      bankAccountName: tutor.bankAccountName,
      ip,
    });
  }

  /**
   * FR-PM-06: per-payout detail. Same row shape as the list endpoint but
   * adds the tutor's current passbook block so the admin can sanity-check
   * the receiving bank account before clicking "mark transferred".
   */
  async payoutById(
    adminId: string,
    payoutId: string,
    ip?: string,
  ): Promise<AdminPayoutDetail> {
    const row = await this.prisma.payout.findUnique({
      where: { id: payoutId },
      include: { tutor: { include: { user: true } } },
    });
    if (!row) throw new NotFoundException();
    const passbook = await this.buildPassbookView({
      adminId,
      targetType: "payout",
      targetId: row.id,
      passbookObjectKey: row.tutor.passbookObjectKey,
      bankName: row.tutor.bankName,
      bankAccountNumber: row.tutor.bankAccountNumber,
      bankAccountName: row.tutor.bankAccountName,
      ip,
    });
    return {
      id: row.id,
      tutorId: row.tutorId,
      tutorDisplayName: row.tutor.user.displayName,
      periodStart: row.periodStart.toISOString(),
      periodEnd: row.periodEnd.toISOString(),
      grossThb: row.grossThb,
      commissionThb: row.commissionThb,
      withholdingTaxThb: row.withholdingTaxThb,
      netThb: row.netThb,
      scheduledAt: row.scheduledAt.toISOString(),
      status: row.status,
      transferredAt: row.transferredAt
        ? row.transferredAt.toISOString()
        : null,
      transferredBy: row.transferredBy,
      transferSlipKey: row.transferSlipKey,
      notes: row.notes,
      passbook,
    };
  }

  /**
   * FR-TH-02: admin reveal of a tutor's full bank account number. Used
   * when the admin is about to send the manual PromptPay transfer and
   * needs to copy/paste the full number into their banking app.
   *
   * Audit-logged via LoginAuditLog with a synthetic userAgent string —
   * keeps a permanent record of who revealed which tutor's account and
   * when, without needing a new dedicated audit table. NFR-05 retention
   * (≥90 days) covers it.
   */
  async revealBank(
    adminUserId: string,
    tutorId: string,
    requesterIp: string,
  ): Promise<AdminRevealedBankInfo> {
    const tutor = await this.prisma.tutorProfile.findUnique({
      where: { id: tutorId },
      select: {
        bankName: true,
        bankAccountNumber: true,
        bankAccountName: true,
      },
    });
    if (
      !tutor ||
      !tutor.bankAccountNumber ||
      !tutor.bankName ||
      !tutor.bankAccountName
    ) {
      throw new NotFoundException(
        "Tutor has no bank info on file — they may not have finished KYC yet",
      );
    }
    await this.prisma.loginAuditLog.create({
      data: {
        userId: adminUserId,
        ip: requesterIp,
        userAgent: `admin-reveal-bank:tutor=${tutorId}`,
      },
    });
    return {
      bankName: tutor.bankName as BankName,
      accountNumber: this.crypto.decrypt(tutor.bankAccountNumber),
      accountName: tutor.bankAccountName,
    };
  }

  // ── FR-TH-02 (rev): bank-change approval queue ─────────────────────
  /**
   * List every tutor with a pending bank edit awaiting review. Returns
   * full account numbers (server-side decrypt) — every entry on this
   * list represents an admin's intent to review.
   */
  async listBankChanges(): Promise<AdminBankChangeItem[]> {
    // Require every pending column to be set together — `updateMyBank`
    // writes them atomically, so a row with `pendingBankSubmittedAt`
    // alone would indicate a partial write or stray migration leftover.
    // Filtering here keeps a broken row out of the decrypt path instead
    // of crashing with an opaque crypto error.
    const rows = await this.prisma.tutorProfile.findMany({
      where: {
        pendingBankSubmittedAt: { not: null },
        pendingBankName: { not: null },
        pendingBankAccountNumber: { not: null },
        pendingBankAccountName: { not: null },
      },
      orderBy: { pendingBankSubmittedAt: "asc" },
      include: {
        user: {
          select: { id: true, displayName: true, email: true },
        },
      },
    });
    return rows.map((row) => {
      const pendingBankName = row.pendingBankName as BankName;
      const pendingAccountNumber = row.pendingBankAccountNumber as string;
      const pendingAccountName = row.pendingBankAccountName as string;
      const pendingSubmittedAt = row.pendingBankSubmittedAt as Date;
      return {
        tutorId: row.id,
        userId: row.user.id,
        displayName: row.user.displayName,
        email: row.user.email,
        university: row.university,
        current:
          row.bankAccountNumber && row.bankName && row.bankAccountName && row.bankUpdatedAt
            ? {
                bankName: row.bankName as BankName,
                accountNumber: this.crypto.decrypt(row.bankAccountNumber),
                accountName: row.bankAccountName,
                updatedAt: row.bankUpdatedAt.toISOString(),
              }
            : null,
        pending: {
          bankName: pendingBankName,
          accountNumber: this.crypto.decrypt(pendingAccountNumber),
          accountName: pendingAccountName,
          idName: row.pendingIdName ?? pendingAccountName,
          passbookObjectKey: row.pendingPassbookObjectKey,
          submittedAt: pendingSubmittedAt.toISOString(),
        },
      };
    });
  }

  /**
   * Approve a pending bank change: copy pending → live columns, clear
   * the pending columns. Also writes the new account into the latest
   * verified KycSubmission so the admin queue stays in sync. Audit-
   * logged like revealBank.
   */
  async approveBankChange(
    adminUserId: string,
    tutorId: string,
    requesterIp: string,
  ): Promise<AdminBankChangeItem> {
    const tutor = await this.prisma.tutorProfile.findUnique({
      where: { id: tutorId },
    });
    if (!tutor) throw new NotFoundException("Tutor not found");
    if (!tutor.pendingBankSubmittedAt) {
      throw new BadRequestException("No pending bank change for this tutor");
    }
    const latestKyc = await this.prisma.kycSubmission.findFirst({
      where: { userId: tutor.userId, status: "verified" },
      orderBy: { reviewedAt: "desc" },
    });
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.tutorProfile.update({
        where: { id: tutorId },
        data: {
          bankName: tutor.pendingBankName,
          bankAccountNumber: tutor.pendingBankAccountNumber,
          bankAccountName: tutor.pendingBankAccountName,
          passbookObjectKey:
            tutor.pendingPassbookObjectKey ?? tutor.passbookObjectKey,
          bankUpdatedAt: now,
          pendingBankName: null,
          pendingBankAccountNumber: null,
          pendingBankAccountName: null,
          pendingPassbookObjectKey: null,
          pendingIdName: null,
          pendingBankSubmittedAt: null,
        },
      }),
      // Keep the canonical KycSubmission row in sync so admin queues
      // (payouts, KYC detail) reflect the new bank info.
      ...(latestKyc
        ? [
            this.prisma.kycSubmission.update({
              where: { id: latestKyc.id },
              data: {
                idName: tutor.pendingIdName ?? latestKyc.idName,
                bankName: tutor.pendingBankName,
                bankAccountNumber: tutor.pendingBankAccountNumber,
                bankAccountName: tutor.pendingBankAccountName,
                passbookObjectKey:
                  tutor.pendingPassbookObjectKey ??
                  latestKyc.passbookObjectKey,
              },
            }),
          ]
        : []),
    ]);
    await this.prisma.loginAuditLog.create({
      data: {
        userId: adminUserId,
        ip: requesterIp,
        userAgent: `admin-approve-bank-change:tutor=${tutorId}`,
      },
    });
    // Return a synthetic row showing the now-live + cleared-pending state.
    const fresh = await this.prisma.tutorProfile.findUnique({
      where: { id: tutorId },
      include: {
        user: { select: { id: true, displayName: true, email: true } },
      },
    });
    if (!fresh) throw new NotFoundException("Tutor disappeared mid-approve");
    return {
      tutorId: fresh.id,
      userId: fresh.user.id,
      displayName: fresh.user.displayName,
      email: fresh.user.email,
      university: fresh.university,
      current:
        fresh.bankAccountNumber && fresh.bankName && fresh.bankAccountName && fresh.bankUpdatedAt
          ? {
              bankName: fresh.bankName as BankName,
              accountNumber: this.crypto.decrypt(fresh.bankAccountNumber),
              accountName: fresh.bankAccountName,
              updatedAt: fresh.bankUpdatedAt.toISOString(),
            }
          : null,
      pending: {
        // No longer pending — return the just-approved snapshot for the
        // admin UI's success state.
        bankName: fresh.bankName as BankName,
        accountNumber: fresh.bankAccountNumber
          ? this.crypto.decrypt(fresh.bankAccountNumber)
          : "",
        accountName: fresh.bankAccountName ?? "",
        idName: latestKyc?.idName ?? "",
        passbookObjectKey: fresh.passbookObjectKey,
        submittedAt: now.toISOString(),
      },
    };
  }

  /**
   * Reject a pending bank change: clear the pending columns without
   * touching the live bank info. Audit-logged.
   */
  async rejectBankChange(
    adminUserId: string,
    tutorId: string,
    requesterIp: string,
  ): Promise<void> {
    const tutor = await this.prisma.tutorProfile.findUnique({
      where: { id: tutorId },
      select: { id: true, pendingBankSubmittedAt: true },
    });
    if (!tutor) throw new NotFoundException("Tutor not found");
    if (!tutor.pendingBankSubmittedAt) {
      throw new BadRequestException("No pending bank change for this tutor");
    }
    await this.prisma.tutorProfile.update({
      where: { id: tutorId },
      data: {
        pendingBankName: null,
        pendingBankAccountNumber: null,
        pendingBankAccountName: null,
        pendingPassbookObjectKey: null,
        pendingIdName: null,
        pendingBankSubmittedAt: null,
      },
    });
    await this.prisma.loginAuditLog.create({
      data: {
        userId: adminUserId,
        ip: requesterIp,
        userAgent: `admin-reject-bank-change:tutor=${tutorId}`,
      },
    });
  }

  // ── Admin account-management (testing tool) ────────────────────────
  /**
   * List every User row with auxiliary counters so an admin can spot
   * which accounts are safe to delete. Paginated; `q` filters by email
   * or displayName (case-insensitive contains).
   */
  async listUsers({
    page = 1,
    pageSize = 25,
    q,
  }: {
    page?: number;
    pageSize?: number;
    q?: string;
  }): Promise<AdminUserPage> {
    const safePage = Math.max(1, page);
    const safePageSize = Math.min(100, Math.max(1, pageSize));
    const where = q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" as const } },
            { displayName: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {};
    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (safePage - 1) * safePageSize,
        take: safePageSize,
        select: {
          id: true,
          supabaseId: true,
          email: true,
          displayName: true,
          role: true,
          avatarUrl: true,
          createdAt: true,
          tutorProfile: {
            select: { id: true, hiddenFromSearchAt: true },
          },
          studentProfile: { select: { userId: true } },
          _count: { select: { bookingsAsStudent: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);
    return {
      items: rows.map((r) => ({
        id: r.id,
        supabaseId: r.supabaseId,
        email: r.email,
        displayName: r.displayName,
        role: r.role as UserRole,
        avatarUrl: r.avatarUrl,
        createdAt: r.createdAt.toISOString(),
        hasTutorProfile: !!r.tutorProfile,
        hasStudentProfile: !!r.studentProfile,
        bookingCount: r._count.bookingsAsStudent,
        tutorProfileId: r.tutorProfile?.id,
        tutorHiddenFromSearchAt:
          r.tutorProfile?.hiddenFromSearchAt?.toISOString(),
      })),
      total,
      page: safePage,
      pageSize: safePageSize,
    };
  }

  /**
   * FR-TH-02: admin-only toggle for /tutors search visibility. Sets
   * (or clears) TutorProfile.hiddenFromSearchAt and writes a
   * loginAuditLog row with the target + action for traceability.
   * Does NOT modify User.suspendedUntil — login + direct-link bookings
   * keep working for a hidden tutor.
   */
  async setTutorVisibility(
    adminUserId: string,
    tutorProfileId: string,
    dto: SetTutorVisibilityDto,
    requesterIp: string,
  ): Promise<SetTutorVisibilityResult> {
    const tutor = await this.prisma.tutorProfile.findUnique({
      where: { id: tutorProfileId },
      select: { id: true, hiddenFromSearchAt: true, userId: true },
    });
    if (!tutor) throw new NotFoundException("Tutor profile not found");
    const nextAt = dto.hidden ? new Date() : null;
    if (
      (tutor.hiddenFromSearchAt === null) === (nextAt === null) &&
      Boolean(tutor.hiddenFromSearchAt) === dto.hidden
    ) {
      // No-op: already in the requested state. Return current state
      // unchanged, skip the audit log row.
      return {
        tutorProfileId: tutor.id,
        hiddenFromSearchAt: tutor.hiddenFromSearchAt?.toISOString() ?? null,
      };
    }
    const updated = await this.prisma.tutorProfile.update({
      where: { id: tutor.id },
      data: { hiddenFromSearchAt: nextAt },
      select: { id: true, hiddenFromSearchAt: true },
    });
    await this.prisma.loginAuditLog.create({
      data: {
        userId: adminUserId,
        ip: requesterIp,
        userAgent: `admin-tutor-visibility:tutor=${tutor.id}:user=${tutor.userId}:hidden=${dto.hidden}`,
      },
    });
    return {
      tutorProfileId: updated.id,
      hiddenFromSearchAt: updated.hiddenFromSearchAt?.toISOString() ?? null,
    };
  }

  /**
   * Patch a user's displayName and/or role. Guard rails:
   *  - Refuse to demote the acting admin's own role (the admin can't
   *    lock themselves out of /admin).
   *  - Audit log every change.
   */
  async updateUserAsAdmin(
    adminUserId: string,
    targetUserId: string,
    dto: UpdateAdminUserDto,
    requesterIp: string,
  ): Promise<AdminUserRow> {
    if (
      targetUserId === adminUserId &&
      dto.role &&
      dto.role !== "admin"
    ) {
      throw new BadRequestException(
        "ไม่สามารถลด role ของบัญชีตัวเองได้",
      );
    }
    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      include: {
        tutorProfile: { select: { id: true } },
        studentProfile: { select: { userId: true } },
      },
    });
    if (!target) throw new NotFoundException("User not found");
    // Refuse a role transition that would leave the user without the
    // matching profile row — promoting a student to "tutor" without a
    // TutorProfile leaves any code that reads role === "tutor" crashing
    // on missing relations. Admin must seed the profile first (via the
    // normal onboarding/KYC flow) before flipping the role.
    if (dto.role !== undefined && dto.role !== target.role) {
      if (dto.role === "tutor" && !target.tutorProfile) {
        throw new BadRequestException(
          "ไม่สามารถเปลี่ยน role เป็น tutor — ผู้ใช้นี้ยังไม่มี TutorProfile (ต้องผ่าน KYC ก่อน)",
        );
      }
      if (dto.role === "student" && !target.studentProfile) {
        throw new BadRequestException(
          "ไม่สามารถเปลี่ยน role เป็น student — ผู้ใช้นี้ยังไม่มี StudentProfile",
        );
      }
    }
    await this.prisma.user.update({
      where: { id: targetUserId },
      data: {
        ...(dto.displayName !== undefined
          ? { displayName: dto.displayName }
          : {}),
        ...(dto.role !== undefined ? { role: dto.role } : {}),
      },
    });
    await this.prisma.loginAuditLog.create({
      data: {
        userId: adminUserId,
        ip: requesterIp,
        userAgent: `admin-update-user:target=${targetUserId}:fields=${Object.keys(dto).join(",")}`,
      },
    });
    // Re-read with the counters so the client gets a fresh row back.
    const fresh = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        supabaseId: true,
        email: true,
        displayName: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
        tutorProfile: { select: { id: true } },
        studentProfile: { select: { userId: true } },
        _count: { select: { bookingsAsStudent: true } },
      },
    });
    if (!fresh) throw new NotFoundException("User disappeared mid-update");
    return {
      id: fresh.id,
      supabaseId: fresh.supabaseId,
      email: fresh.email,
      displayName: fresh.displayName,
      role: fresh.role as UserRole,
      avatarUrl: fresh.avatarUrl,
      createdAt: fresh.createdAt.toISOString(),
      hasTutorProfile: !!fresh.tutorProfile,
      hasStudentProfile: !!fresh.studentProfile,
      bookingCount: fresh._count.bookingsAsStudent,
    };
  }

  /**
   * Hard-delete a user. Existing Prisma onDelete: Cascade relations
   * drop TutorProfile, StudentProfile, KycSubmission, bookings as
   * student, etc. The Supabase auth row stays — admin must delete that
   * separately in the Supabase dashboard.
   *
   * Refuses to delete the acting admin's own account (would log them
   * out and leave the system without an admin if they were the last).
   *
   * Kamin removed this in c6329d4 ("debug delete-user surface"); we
   * keep it on main per the user's "accept my version on /admin"
   * direction — the history gate + transactional cascade below is the
   * hot fix from 0a953e6 that addressed the FK-cascade footgun Kamin
   * was rightly worried about.
   */
  async deleteUserAsAdmin(
    adminUserId: string,
    targetUserId: string,
    requesterIp: string,
  ): Promise<void> {
    if (targetUserId === adminUserId) {
      throw new BadRequestException(
        "ไม่สามารถลบบัญชีของตัวเองได้",
      );
    }
    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, email: true },
    });
    if (!target) throw new NotFoundException("User not found");

    // History gate: hard-delete is reserved for clean test accounts. Anyone
    // with bookings / payments / reviews / reports filed must be handled
    // via the suspension flow (User.suspendedUntil — set by the report
    // system; year-2099 sentinel = permanent ban-equivalent). This avoids
    // silently cascading financial records and preserves audit history.
    const [bookings, intents, reviews, reports] = await Promise.all([
      this.prisma.booking.count({
        where: {
          OR: [
            { studentId: targetUserId },
            { tutor: { userId: targetUserId } },
          ],
        },
      }),
      this.prisma.paymentIntent.count({ where: { payerId: targetUserId } }),
      this.prisma.tutorReview.count({ where: { studentId: targetUserId } }),
      this.prisma.report.count({ where: { reporterId: targetUserId } }),
    ]);
    if (bookings + intents + reviews + reports > 0) {
      throw new BadRequestException({
        code: "USER_HAS_HISTORY",
        message:
          "ผู้ใช้รายนี้มีประวัติการจอง/ชำระเงิน/รีวิว/รายงาน — กรุณาใช้การระงับการใช้งาน (suspension) แทนการลบบัญชี",
        bookings,
        intents,
        reviews,
        reports,
      });
    }

    // Safe-to-purge transactional cascade. Child rows first; rows with
    // onDelete: Cascade (StudentProfile, TutorProfile, KycSubmission,
    // Notification) clean themselves up when the User row goes — listing
    // them explicitly anyway so the order is auditable and a future
    // schema change that drops a Cascade doesn't silently regress.
    await this.prisma.$transaction([
      this.prisma.bookingParticipant.deleteMany({
        where: { studentId: targetUserId },
      }),
      this.prisma.chatThreadParticipant.deleteMany({
        where: { userId: targetUserId },
      }),
      this.prisma.chatMessage.deleteMany({
        where: { authorId: targetUserId },
      }),
      this.prisma.chatThread.deleteMany({ where: { studentId: targetUserId } }),
      this.prisma.postUpvote.deleteMany({ where: { userId: targetUserId } }),
      this.prisma.communityReply.deleteMany({
        where: { authorId: targetUserId },
      }),
      this.prisma.communityPost.deleteMany({
        where: { authorId: targetUserId },
      }),
      this.prisma.kycSubmission.deleteMany({ where: { userId: targetUserId } }),
      this.prisma.notification.deleteMany({ where: { userId: targetUserId } }),
      this.prisma.postponeRequest.deleteMany({
        where: { initiatorId: targetUserId },
      }),
      this.prisma.loginAuditLog.deleteMany({ where: { userId: targetUserId } }),
      this.prisma.adminAuditLog.deleteMany({ where: { adminId: targetUserId } }),
      this.prisma.user.delete({ where: { id: targetUserId } }),
    ]);
    await this.prisma.loginAuditLog.create({
      data: {
        userId: adminUserId,
        ip: requesterIp,
        userAgent: `admin-delete-user:target=${targetUserId}:email=${target.email}`,
      },
    });
  }

  // FR-TH-02: queue includes 5-minute signed GETs for the three photos so
  // the admin UI can render them directly. Signing inline (rather than a
  // separate endpoint per submission) keeps the queue page a single round
  // trip; the queue stays small at Phase 1 manual-review scale.
  async kycQueue(): Promise<AdminKycQueueItem[]> {
    const rows = await this.prisma.kycSubmission.findMany({
      where: { status: "pending" },
      orderBy: { submittedAt: "asc" },
      include: { user: true },
    });
    return Promise.all(
      rows.map(async (r) => {
        const [idPhoto, selfie, transcript] = await Promise.all([
          this.storage.signDownload(r.idPhotoKey),
          this.storage.signDownload(r.selfieKey),
          this.storage.signDownload(r.transcriptKey),
        ]);
        return {
          id: r.id,
          userId: r.userId,
          userDisplayName: r.user.displayName,
          userEmail: r.user.email,
          idPhotoUrl: idPhoto.url,
          selfieUrl: selfie.url,
          transcriptUrl: transcript.url,
          submittedAt: r.submittedAt.toISOString(),
        };
      }),
    );
  }

  async reviewKyc(id: string, decision: "approve" | "reject", reason?: string) {
    const sub = await this.prisma.kycSubmission.findUnique({ where: { id } });
    if (!sub) throw new NotFoundException();

    if (decision === "approve") {
      // A user can upload KYC photos before completing /tutors/onboarding,
      // so the TutorProfile row may not exist yet. Block approval with a
      // clear message instead of letting Prisma throw P2025.
      const profile = await this.prisma.tutorProfile.findUnique({
        where: { userId: sub.userId },
      });
      if (!profile) {
        throw new BadRequestException(
          "ผู้ใช้ยังไม่ได้กรอกข้อมูลพี่รหัส — ขอให้ทำขั้นตอน Onboarding ก่อนจึงอนุมัติได้",
        );
      }
      // FR-TH-02: mirror passbook + bank info from the KYC submission to
      // TutorProfile so PayoutsService.queue can read it without joining
      // KycSubmission, and so /tutors/me/bank surfaces the same state.
      // bankAccountNumber stays encrypted (the value on the submission
      // is already the ciphertext blob — passing through verbatim).
      //
      // Admin approval is also the only place the User's role flips from
      // "student" to "tutor". TutorsService.onboard intentionally leaves
      // role unchanged so users who only filled the profile form (and
      // never finished KYC) don't get treated as tutors by role-gated
      // surfaces (dropdown, search visibility, etc.).
      await this.prisma.$transaction([
        this.prisma.tutorProfile.update({
          where: { userId: sub.userId },
          data: {
            isVerified: true,
            passbookObjectKey: sub.passbookObjectKey,
            bankName: sub.bankName,
            bankAccountNumber: sub.bankAccountNumber,
            bankAccountName: sub.bankAccountName,
            bankUpdatedAt: new Date(),
          },
        }),
        this.prisma.user.update({
          where: { id: sub.userId },
          data: { role: "tutor" },
        }),
      ]);
    }
    return this.prisma.kycSubmission.update({
      where: { id },
      data: {
        status: decision === "approve" ? "verified" : "rejected",
        reviewedAt: new Date(),
        rejectionReason: decision === "reject" ? reason : null,
      },
    });
  }

  // FR-PM-01: admin review surface for payment slips.
  //   pending  → mid-flight (slip_uploaded/verifying, present after API crash)
  //   success  → confirmed (held_in_escrow + released_for_payout + paid_out)
  //   failed   → ZercleSlip rejection; admin can override via approveSlip
  async paymentsQueue(
    filter: "pending" | "success" | "failed" = "pending",
  ): Promise<AdminPaymentRow[]> {
    const statuses: PaymentStatus[] =
      filter === "success"
        ? ["held_in_escrow", "released_for_payout", "paid_out"]
        : filter === "failed"
          ? ["failed"]
          : ["slip_uploaded", "verifying"];
    const rows = await this.prisma.paymentIntent.findMany({
      where: { status: { in: statuses } },
      orderBy: { createdAt: filter === "success" ? "desc" : "asc" },
      include: { payer: true },
    });
    return rows.map((r) => ({
      id: r.id,
      payerId: r.payerId,
      payerDisplayName: r.payer.displayName,
      itemType: r.itemType as PaymentItemType,
      bookingId: r.bookingId,
      sheetId: r.sheetId,
      amountThb: r.amountThb,
      status: r.status as PaymentStatus,
      slipObjectKey: r.slipObjectKey,
      transactionId: r.transactionId,
      failureReason: r.failureReason,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  /**
   * FR-PM-01: short-lived signed GET for a payment's uploaded slip so the
   * admin queue can preview it before approve/reject. Returns 404 when the
   * payment has no slip (e.g. a pending_transfer row the payer hasn't yet
   * uploaded for). The URL expires per StorageService.SIGNED_URL_TTL_SECONDS
   * — the admin UI must re-request rather than cache past that.
   */
  async slipSignedUrl(
    intentId: string,
  ): Promise<{ url: string; expiresAt: string }> {
    const intent = await this.prisma.paymentIntent.findUnique({
      where: { id: intentId },
      select: { slipObjectKey: true },
    });
    if (!intent) throw new NotFoundException("Payment not found");
    if (!intent.slipObjectKey) {
      throw new NotFoundException("No slip uploaded for this payment");
    }
    return this.storage.signDownload(intent.slipObjectKey);
  }

  /**
   * FR-PM-01: manual override for cases SlipOK can't decide on its own
   * (timeouts, ambiguous slip, foreign-bank transfers). Approving moves
   * funds into escrow and starts the booking's 24h report window
   * (FR-PM-05) — same end-state as a clean SlipOK pass.
   */
  async approveSlip(intentId: string) {
    const intent = await this.prisma.paymentIntent.findUnique({
      where: { id: intentId },
    });
    if (!intent) throw new NotFoundException();
    if (
      intent.status !== "slip_uploaded" &&
      intent.status !== "verifying" &&
      intent.status !== "failed"
    ) {
      throw new BadRequestException("Intent is not awaiting admin review");
    }

    const updated = await this.prisma.paymentIntent.update({
      where: { id: intentId },
      data: { status: "held_in_escrow", failureReason: null },
    });
    if (intent.bookingId) {
      const reportWindowEndsAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const booking = await this.prisma.booking.update({
        where: { id: intent.bookingId },
        data: { status: "paid", reportWindowEndsAt },
        include: {
          tutor: { select: { userId: true } },
          student: { select: { displayName: true } },
        },
      });
      // FR-CM-08: same pair of notifications as the auto-verified path
      // (payments.service.uploadSlip's paid branch) so the manual
      // override produces an identical user-visible outcome.
      await this.notifications.notify({
        userId: booking.studentId,
        type: "payment_verified",
        title: "ตรวจสอบสลิปสำเร็จ",
        body: `ยืนยันการชำระเงินสำหรับคลาส "${booking.subject}" แล้ว`,
        actionUrl: "/bookings",
        sourceType: "payment_intent",
        sourceId: intent.id,
      });
      await this.notifications.notify({
        userId: booking.tutor.userId,
        type: "booking_paid",
        title: "คลาสได้รับการชำระเงินแล้ว",
        body: `${booking.student.displayName} ชำระเงินสำหรับ "${booking.subject}" แล้ว`,
        actionUrl: "/bookings",
        sourceType: "booking",
        sourceId: booking.id,
      });
      // FR-TH-17: generate Meet link inline; swallow failures so the
      // payment approval itself never depends on Calendar.
      try {
        await this.googleCalendar.attachToBooking(booking.id);
      } catch (err) {
        this.logger.error(
          `Meet generation failed for booking ${booking.id}: ${(err as Error).message} — admin can retry`,
        );
      }
    }
    return updated;
  }

  /**
   * FR-TH-17: admin retry path for the inline Meet generator. The original
   * payment-confirm best-effort call may have failed (Calendar outage,
   * tutor hadn't connected Google yet, attendee email rejected). This
   * endpoint deletes any existing event (best-effort 404 swallow) and
   * re-runs attachToBooking.
   *
   * If the tutor still hasn't connected Google, attachToBooking returns
   * meetingUrl=null and logs — admin can call this again later.
   */
  async regenerateMeet(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, status: true, googleCalendarEventId: true, tutorId: true },
    });
    if (!booking) throw new NotFoundException();
    if (booking.status !== "paid") {
      throw new BadRequestException(
        `Booking is ${booking.status}, not paid — Meet link is only generated for paid bookings`,
      );
    }

    if (booking.googleCalendarEventId) {
      await this.googleCalendar.deleteEvent(
        booking.tutorId,
        booking.googleCalendarEventId,
      );
    }
    // Clear so attachToBooking's idempotency check doesn't return the
    // stale link.
    await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        meetingUrl: null,
        googleCalendarEventId: null,
      },
    });

    return this.googleCalendar.attachToBooking(bookingId);
  }

  async rejectSlip(intentId: string, reason: string) {
    const intent = await this.prisma.paymentIntent.findUnique({
      where: { id: intentId },
    });
    if (!intent) throw new NotFoundException();
    return this.prisma.paymentIntent.update({
      where: { id: intentId },
      data: { status: "failed", failureReason: reason },
    });
  }

  /**
   * FR-PM-05: admin response to a Report-Issue. Marks the linked payment
   * intent `disputed` so it never enters the next payout batch (FR-PM-06)
   * and records the dispute on the booking. Resolution (refund vs release)
   * happens via separate admin actions once the dispute is investigated.
   */
  async freezeBooking(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { paymentIntent: true },
    });
    if (!booking) throw new NotFoundException();

    if (booking.paymentIntent) {
      await this.prisma.paymentIntent.update({
        where: { id: booking.paymentIntent.id },
        data: { status: "disputed" },
      });
    }
    return this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: "reported" },
    });
  }
}
