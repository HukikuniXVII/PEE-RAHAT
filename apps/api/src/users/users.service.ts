import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type {
  ConfirmDeletionResult,
  DeletionEligibility,
  RequestDeletionDto,
  RequestDeletionResult,
  UserProfileUpdateDto,
} from "@peerahat/types";

import { SupabaseAdminService } from "../common/supabase-admin.service";
import { PrismaService } from "../prisma/prisma.service";

// NFR-04: a deleted account is blocked from logging back in via the auth
// guard's suspendedUntil check. Reuse the same year-2099 sentinel the
// report system uses for permanent bans as a belt-and-suspenders measure
// (the deletedAt guard check is the primary gate).
const PERMANENT_SENTINEL = new Date("2099-12-31T00:00:00.000Z");

// Deletion-confirmation JWT: signed with its own secret, valid 1h.
const DELETION_TOKEN_PURPOSE = "account-deletion";
const DELETION_TOKEN_TTL = "1h";

interface DeletionTokenPayload {
  sub: string;
  purpose: typeof DELETION_TOKEN_PURPOSE;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly supabaseAdmin: SupabaseAdminService,
  ) {}

  findOrCreateBySupabase(params: {
    supabaseId: string;
    email: string;
    displayName: string;
  }) {
    return this.prisma.user.upsert({
      where: { supabaseId: params.supabaseId },
      update: { email: params.email },
      create: {
        supabaseId: params.supabaseId,
        email: params.email,
        displayName: params.displayName,
      },
      include: { tutorProfile: { select: { id: true } } },
    });
  }

  findBySupabaseId(supabaseId: string) {
    return this.prisma.user.findUnique({ where: { supabaseId } });
  }

  async updateProfile(supabaseId: string, dto: UserProfileUpdateDto) {
    const user = await this.prisma.user.findUnique({ where: { supabaseId } });
    if (!user) throw new BadRequestException("Unknown user");
    return this.prisma.user.update({
      where: { id: user.id },
      data: {
        ...(dto.displayName !== undefined ? { displayName: dto.displayName } : {}),
        ...(dto.avatarUrl !== undefined ? { avatarUrl: dto.avatarUrl } : {}),
      },
      include: { tutorProfile: { select: { id: true } } },
    });
  }

  // ── NFR-04 (PDPA): self-service account deletion ─────────────────────

  /**
   * Compute whether the calling user may delete their account. Any active
   * commitment blocks deletion; each blocker is a ready-to-render Thai
   * string so the dialog can list them verbatim.
   */
  async getDeletionEligibility(
    supabaseId: string,
  ): Promise<DeletionEligibility> {
    const user = await this.prisma.user.findUnique({
      where: { supabaseId },
      select: { id: true, tutorProfile: { select: { id: true } } },
    });
    if (!user) throw new BadRequestException("Unknown user");
    const userId = user.id;
    const tutorProfileId = user.tutorProfile?.id ?? null;

    const [
      activeBookings,
      pendingPayments,
      releasedForPayout,
      pendingPayouts,
      openReports,
      openPostpone,
    ] = await Promise.all([
      // Active commitments on either side of the booking.
      this.prisma.booking.count({
        where: {
          status: {
            in: ["requested", "accepted", "paid", "postpone_pending"],
          },
          OR: [{ studentId: userId }, { tutor: { userId } }],
        },
      }),
      // Payments still in flight for money this user paid.
      this.prisma.paymentIntent.count({
        where: {
          payerId: userId,
          status: { in: ["slip_uploaded", "verifying", "held_in_escrow"] },
        },
      }),
      // Tutor earnings queued for the next payout batch.
      tutorProfileId
        ? this.prisma.paymentIntent.count({
            where: {
              status: "released_for_payout",
              booking: { tutorId: tutorProfileId },
            },
          })
        : Promise.resolve(0),
      // Payout rows the admin hasn't transferred yet.
      tutorProfileId
        ? this.prisma.payout.count({
            where: {
              tutorId: tutorProfileId,
              status: { in: ["pending", "in_progress"] },
            },
          })
        : Promise.resolve(0),
      // Reports filed by or against this user, still open.
      this.prisma.report.count({
        where: {
          status: { in: ["pending", "under_review", "escalated"] },
          OR: [{ reporterId: userId }, { targetUserId: userId }],
        },
      }),
      // Postpone negotiations on this user's bookings that haven't resolved.
      this.prisma.postponeRequest.count({
        where: {
          status: "negotiating",
          booking: {
            is: { OR: [{ studentId: userId }, { tutor: { userId } }] },
          },
        },
      }),
    ]);

    const blockers: string[] = [];
    if (activeBookings > 0) {
      blockers.push(
        `คุณมีคลาสที่กำลังดำเนินอยู่ ${activeBookings} รายการ — กรุณาจัดการให้เสร็จสิ้นก่อนลบบัญชี`,
      );
    }
    if (pendingPayments > 0) {
      blockers.push(
        `คุณมีรายการชำระเงินที่รอตรวจสอบหรืออยู่ระหว่างพักเงิน ${pendingPayments} รายการ`,
      );
    }
    const payoutCount = releasedForPayout + pendingPayouts;
    if (payoutCount > 0) {
      blockers.push(
        `คุณมีเงินที่รอการโอนเข้าบัญชี ${payoutCount} รายการ — กรุณารอให้การโอนเสร็จสิ้นก่อน`,
      );
    }
    if (openReports > 0) {
      blockers.push(
        `คุณมีรายงานที่ยังไม่ได้รับการแก้ไข ${openReports} รายการ`,
      );
    }
    if (openPostpone > 0) {
      blockers.push(
        `คุณมีการเจรจาเลื่อนคลาสที่ยังไม่สิ้นสุด ${openPostpone} รายการ`,
      );
    }

    return { canDelete: blockers.length === 0, blockers };
  }

  /**
   * Step 1 of the destructive flow: re-auth with the password, re-check
   * eligibility, stamp the request, then email a 1h confirmation link.
   * No data is destroyed here — that only happens on confirm.
   */
  async requestDeletion(
    supabaseId: string,
    dto: RequestDeletionDto,
  ): Promise<RequestDeletionResult> {
    const user = await this.prisma.user.findUnique({
      where: { supabaseId },
      select: { id: true, email: true, deletedAt: true },
    });
    if (!user) throw new BadRequestException("Unknown user");
    if (user.deletedAt) {
      throw new BadRequestException("บัญชีนี้ถูกลบไปแล้ว");
    }

    // Re-authenticate the destructive action server-side.
    const ok = await this.supabaseAdmin.verifyPassword(
      user.email,
      dto.password,
    );
    if (!ok) {
      throw new UnauthorizedException("รหัสผ่านไม่ถูกต้อง");
    }

    // Guard against a race where a commitment appeared after the dialog
    // opened — never let a request through if it's no longer eligible.
    const eligibility = await this.getDeletionEligibility(supabaseId);
    if (!eligibility.canDelete) {
      throw new BadRequestException({
        code: "DELETION_BLOCKED",
        message: "ยังไม่สามารถลบบัญชีได้ — มีรายการที่ต้องเคลียร์ก่อน",
        blockers: eligibility.blockers,
      });
    }

    const reason = this.composeReason(dto);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { deletionRequestedAt: new Date(), deletionReason: reason },
    });

    const token = this.jwt.sign(
      { sub: user.id, purpose: DELETION_TOKEN_PURPOSE },
      { secret: this.deletionSecret(), expiresIn: DELETION_TOKEN_TTL },
    );
    const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:3000";
    const confirmUrl = `${webOrigin}/account/delete/confirm?token=${encodeURIComponent(token)}`;

    const { sent } = await this.supabaseAdmin.sendAccountDeletionEmail(
      user.email,
      confirmUrl,
    );

    // Surface the link only when email delivery is stubbed (dev/tests).
    return { ok: true, devConfirmUrl: sent ? undefined : confirmUrl };
  }

  /**
   * Step 2: the user clicked the emailed link. Verify the 1h token and run
   * the irreversible deletion. Idempotent — a second click on an already
   * deleted account just returns ok.
   */
  async confirmDeletion(token: string): Promise<ConfirmDeletionResult> {
    let payload: DeletionTokenPayload;
    try {
      payload = this.jwt.verify<DeletionTokenPayload>(token, {
        secret: this.deletionSecret(),
      });
    } catch {
      throw new BadRequestException(
        "ลิงก์ยืนยันไม่ถูกต้องหรือหมดอายุแล้ว — กรุณาเริ่มขั้นตอนลบบัญชีใหม่",
      );
    }
    if (payload.purpose !== DELETION_TOKEN_PURPOSE || !payload.sub) {
      throw new BadRequestException("ลิงก์ยืนยันไม่ถูกต้อง");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, deletedAt: true, deletionReason: true },
    });
    if (!user) throw new BadRequestException("ไม่พบบัญชีผู้ใช้");
    if (user.deletedAt) return { ok: true }; // already deleted — idempotent

    await this.executeDeletion(user.id, user.deletionReason ?? undefined);
    return { ok: true };
  }

  /**
   * The irreversible deletion, all in one transaction:
   *  1. Anonymize PII on the surviving User row.
   *  2. Hard-delete sensitive personal records (chat messages, push subs,
   *     notification prefs) + null out tutor OAuth tokens so no zombie
   *     Google session survives.
   *  3. Hide any tutor profile from search.
   *  4. Stamp deletedAt + the year-2099 suspension sentinel (login block).
   *  5. Write an audit-log row.
   *
   * Completed bookings, refund-ledger rows, and payouts are intentionally
   * left in place — they FK back to the now-anonymized User, preserving the
   * accounting/tax trail without retaining personal data (PDPA balance).
   *
   * Note: the User model has no phone column, so the spec's "phone → null"
   * is a no-op here; avatarUrl + displayName + email cover the stored PII.
   */
  async executeDeletion(userId: string, reason?: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, tutorProfile: { select: { id: true } } },
    });
    if (!user) throw new BadRequestException("ไม่พบบัญชีผู้ใช้");

    const now = new Date();
    await this.prisma.$transaction([
      // Hard-delete personal records. PushSubscription / NotificationPreference
      // cascade on a User row drop, but we soft-delete, so purge explicitly.
      this.prisma.chatMessage.deleteMany({ where: { authorId: userId } }),
      this.prisma.pushSubscription.deleteMany({ where: { userId } }),
      this.prisma.notificationPreference.deleteMany({ where: { userId } }),
      // Tutor: drop the Google refresh token (kills any zombie session and
      // disables search visibility) and hide the profile from search.
      ...(user.tutorProfile
        ? [
            this.prisma.tutorProfile.update({
              where: { id: user.tutorProfile.id },
              data: {
                googleRefreshToken: null,
                googleEmail: null,
                googleConnectedAt: null,
                hiddenFromSearchAt: now,
              },
            }),
          ]
        : []),
      // Anonymize the surviving User row + lock out login.
      this.prisma.user.update({
        where: { id: userId },
        data: {
          email: `deleted-${userId}@peerahat.deleted`,
          displayName: "ผู้ใช้ที่ลบบัญชี",
          avatarUrl: null,
          deletedAt: now,
          deletionReason: reason ?? null,
          suspendedUntil: PERMANENT_SENTINEL,
        },
      }),
      // Audit trail (NFR-05) — same loginAuditLog channel admin actions use.
      this.prisma.loginAuditLog.create({
        data: {
          userId,
          ip: "system",
          userAgent: `account-self-deletion:user=${userId}`,
        },
      }),
    ]);
  }

  /** Compose the optional reason code + free text into one stored string. */
  private composeReason(dto: RequestDeletionDto): string | null {
    const labels: Record<string, string> = {
      no_longer_use: "ไม่ได้ใช้แล้ว",
      switched_service: "เปลี่ยนไปใช้บริการอื่น",
      platform_issue: "มีปัญหากับแพลตฟอร์ม",
      other: "อื่นๆ",
    };
    const parts: string[] = [];
    if (dto.reasonCode) parts.push(labels[dto.reasonCode] ?? dto.reasonCode);
    if (dto.reason) parts.push(dto.reason);
    return parts.length ? parts.join(" — ") : null;
  }

  private deletionSecret(): string {
    const secret = process.env.ACCOUNT_DELETION_JWT_SECRET;
    if (!secret) {
      throw new Error(
        "ACCOUNT_DELETION_JWT_SECRET is not set — required to sign/verify account-deletion confirmation links",
      );
    }
    return secret;
  }
}
