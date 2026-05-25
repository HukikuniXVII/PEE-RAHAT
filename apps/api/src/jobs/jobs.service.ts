import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { Queue, Worker } from "bullmq";
import IORedis, { type Redis } from "ioredis";

import { GroupSessionService } from "../bookings/group-session.service";
import { KycService } from "../kyc/kyc.service";
import { PaymentsService } from "../payments/payments.service";
import { ReportCronService } from "../reports/report-cron.service";

const RELEASE_FOR_PAYOUT_QUEUE = "release-for-payout";
const KYC_ARCHIVE_QUEUE = "kyc-archive";
const REPORT_SLA_QUEUE = "reports-sla-check";
const REPORT_STALE_QUEUE = "reports-stale-cleanup";
const REPORT_EVIDENCE_QUEUE = "reports-evidence-cleanup";
// FR-TH-18: group session failure sweepers.
const GROUP_INVITE_EXPIRY_QUEUE = "group-invite-expiry";
const GROUP_PAYMENT_DEADLINE_QUEUE = "group-payment-deadline";

const RELEASE_FOR_PAYOUT_CRON = "0 3 * * *"; // 03:00 every day
const KYC_ARCHIVE_CRON = "0 * * * *"; // top of every hour
const REPORT_SLA_CRON = "*/30 * * * *"; // every 30 minutes
const REPORT_STALE_CRON = "30 3 * * *"; // 03:30 every day
const REPORT_EVIDENCE_CRON = "0 4 * * *"; // 04:00 every day
const GROUP_INVITE_EXPIRY_CRON = "0 * * * *"; // top of every hour
const GROUP_PAYMENT_DEADLINE_CRON = "*/30 * * * *"; // every 30 minutes

/**
 * BullMQ scheduler for the recurring back-office jobs:
 * - FR-PM-05 / FR-PM-06: release-for-payout flips paid bookings to
 *   completed once their 24h report window closes, and moves the linked
 *   intent into the released_for_payout queue. No money moves here —
 *   admin runs /admin/payouts/generate-batch on the 15th / 30th to
 *   aggregate the queue into per-tutor Payout rows.
 * - NFR-03: archiveVerified moves KYC files from the hot bucket to
 *   cold archive once admin approves the submission. Hourly cadence
 *   keeps us well inside the 24h SLA.
 *
 * The previous auto-batch payout cron (15th / 30th 02:00) was retired
 * in the manual-payments refactor — every batch is now admin-triggered.
 *
 * Set JOBS_ENABLED=false to skip startup (used by openapi:export and
 * by anyone who wants to run the API without Redis attached).
 */
@Injectable()
export class JobsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobsService.name);
  private connection?: Redis;
  private releaseQueue?: Queue;
  private kycArchiveQueue?: Queue;
  private releaseWorker?: Worker;
  private kycArchiveWorker?: Worker;
  private reportSlaQueue?: Queue;
  private reportStaleQueue?: Queue;
  private reportEvidenceQueue?: Queue;
  private reportSlaWorker?: Worker;
  private reportStaleWorker?: Worker;
  private reportEvidenceWorker?: Worker;
  private groupInviteExpiryQueue?: Queue;
  private groupPaymentDeadlineQueue?: Queue;
  private groupInviteExpiryWorker?: Worker;
  private groupPaymentDeadlineWorker?: Worker;

  constructor(
    @Inject(PaymentsService) private readonly payments: PaymentsService,
    @Inject(KycService) private readonly kyc: KycService,
    @Inject(ReportCronService)
    private readonly reportCron: ReportCronService,
    @Inject(GroupSessionService)
    private readonly groupSessions: GroupSessionService,
  ) {}

  async onModuleInit() {
    if (process.env.JOBS_ENABLED === "false") {
      this.logger.log("JOBS_ENABLED=false — skipping job registration");
      return;
    }
    const url = process.env.REDIS_URL ?? "redis://localhost:6379";
    // BullMQ requires maxRetriesPerRequest: null on the worker connection
    // so blocking commands aren't aborted mid-poll.
    this.connection = new IORedis(url, { maxRetriesPerRequest: null });

    this.releaseQueue = new Queue(RELEASE_FOR_PAYOUT_QUEUE, {
      connection: this.connection,
    });
    this.kycArchiveQueue = new Queue(KYC_ARCHIVE_QUEUE, {
      connection: this.connection,
    });
    this.reportSlaQueue = new Queue(REPORT_SLA_QUEUE, {
      connection: this.connection,
    });
    this.reportStaleQueue = new Queue(REPORT_STALE_QUEUE, {
      connection: this.connection,
    });
    this.reportEvidenceQueue = new Queue(REPORT_EVIDENCE_QUEUE, {
      connection: this.connection,
    });
    this.groupInviteExpiryQueue = new Queue(GROUP_INVITE_EXPIRY_QUEUE, {
      connection: this.connection,
    });
    this.groupPaymentDeadlineQueue = new Queue(GROUP_PAYMENT_DEADLINE_QUEUE, {
      connection: this.connection,
    });

    this.releaseWorker = new Worker(
      RELEASE_FOR_PAYOUT_QUEUE,
      async () => {
        const result = await this.payments.releaseForPayout();
        if (result.released > 0) {
          this.logger.log(
            `Released ${result.released} booking(s) for payout`,
          );
        }
        return result;
      },
      { connection: this.connection },
    );
    this.releaseWorker.on("failed", (job, err) => {
      this.logger.error(
        `${RELEASE_FOR_PAYOUT_QUEUE} ${job?.id} failed: ${err.message}`,
      );
    });

    this.kycArchiveWorker = new Worker(
      KYC_ARCHIVE_QUEUE,
      async () => {
        const result = await this.kyc.archiveVerified();
        if (result.archived > 0) {
          this.logger.log(`Archived ${result.archived} verified KYC submission(s)`);
        }
        return result;
      },
      { connection: this.connection },
    );
    this.kycArchiveWorker.on("failed", (job, err) => {
      this.logger.error(`kyc-archive ${job?.id} failed: ${err.message}`);
    });

    this.reportSlaWorker = new Worker(
      REPORT_SLA_QUEUE,
      async () => {
        const result = await this.reportCron.slaCheck();
        if (result.pinged > 0 || result.escalated > 0) {
          this.logger.log(
            `Report SLA check: pinged ${result.pinged}, escalated ${result.escalated}`,
          );
        }
        return result;
      },
      { connection: this.connection },
    );
    this.reportSlaWorker.on("failed", (job, err) => {
      this.logger.error(
        `${REPORT_SLA_QUEUE} ${job?.id} failed: ${err.message}`,
      );
    });

    this.reportStaleWorker = new Worker(
      REPORT_STALE_QUEUE,
      async () => {
        const result = await this.reportCron.staleCleanup();
        if (result.rejected > 0) {
          this.logger.log(
            `Report stale cleanup: auto-rejected ${result.rejected}`,
          );
        }
        return result;
      },
      { connection: this.connection },
    );
    this.reportStaleWorker.on("failed", (job, err) => {
      this.logger.error(
        `${REPORT_STALE_QUEUE} ${job?.id} failed: ${err.message}`,
      );
    });

    this.reportEvidenceWorker = new Worker(
      REPORT_EVIDENCE_QUEUE,
      async () => {
        const result = await this.reportCron.evidenceCleanup();
        if (result.purged > 0) {
          this.logger.log(
            `Report evidence cleanup: purged ${result.purged} file(s)`,
          );
        }
        return result;
      },
      { connection: this.connection },
    );
    this.reportEvidenceWorker.on("failed", (job, err) => {
      this.logger.error(
        `${REPORT_EVIDENCE_QUEUE} ${job?.id} failed: ${err.message}`,
      );
    });

    // FR-TH-18: invite-expiry sweep — fails every `forming` group whose
    // inviteExpiresAt has passed, with 100% host refund.
    this.groupInviteExpiryWorker = new Worker(
      GROUP_INVITE_EXPIRY_QUEUE,
      async () => {
        const result = await this.groupSessions.runInviteExpirySweep();
        if (result.failed > 0) {
          this.logger.log(
            `Group invite expiry: failed ${result.failed} group(s)`,
          );
        }
        return result;
      },
      { connection: this.connection },
    );
    this.groupInviteExpiryWorker.on("failed", (job, err) => {
      this.logger.error(
        `${GROUP_INVITE_EXPIRY_QUEUE} ${job?.id} failed: ${err.message}`,
      );
    });

    // FR-TH-18: payment-deadline sweep — fails every tutor_review group
    // where the tutor approved >24h ago and not every invitee has paid.
    this.groupPaymentDeadlineWorker = new Worker(
      GROUP_PAYMENT_DEADLINE_QUEUE,
      async () => {
        const result = await this.groupSessions.runPaymentDeadlineSweep();
        if (result.failed > 0) {
          this.logger.log(
            `Group payment deadline: failed ${result.failed} group(s)`,
          );
        }
        return result;
      },
      { connection: this.connection },
    );
    this.groupPaymentDeadlineWorker.on("failed", (job, err) => {
      this.logger.error(
        `${GROUP_PAYMENT_DEADLINE_QUEUE} ${job?.id} failed: ${err.message}`,
      );
    });

    // Drop the retired payouts-compute repeatable so it doesn't keep
    // firing against an upgraded API. removeRepeatableByKey is keyed
    // on `${name}:::${cron}:::${tz}` etc; we just sweep the legacy queue
    // outright since it has no remaining handlers.
    try {
      const legacy = new Queue("payouts-compute", { connection: this.connection });
      await legacy.obliterate({ force: true });
      await legacy.close();
    } catch (err) {
      this.logger.warn(`Could not obliterate legacy payouts-compute queue: ${String(err)}`);
    }

    // Repeatable jobs are upserted by name+pattern, so re-registering on
    // every boot is safe — bullmq dedupes.
    await this.releaseQueue.add(
      "tick",
      {},
      { repeat: { pattern: RELEASE_FOR_PAYOUT_CRON } },
    );
    await this.kycArchiveQueue.add(
      "tick",
      {},
      { repeat: { pattern: KYC_ARCHIVE_CRON } },
    );
    await this.reportSlaQueue.add(
      "tick",
      {},
      { repeat: { pattern: REPORT_SLA_CRON } },
    );
    await this.reportStaleQueue.add(
      "tick",
      {},
      { repeat: { pattern: REPORT_STALE_CRON } },
    );
    await this.reportEvidenceQueue.add(
      "tick",
      {},
      { repeat: { pattern: REPORT_EVIDENCE_CRON } },
    );
    await this.groupInviteExpiryQueue.add(
      "tick",
      {},
      { repeat: { pattern: GROUP_INVITE_EXPIRY_CRON } },
    );
    await this.groupPaymentDeadlineQueue.add(
      "tick",
      {},
      { repeat: { pattern: GROUP_PAYMENT_DEADLINE_CRON } },
    );

    this.logger.log(
      `Jobs registered: ${RELEASE_FOR_PAYOUT_QUEUE} (${RELEASE_FOR_PAYOUT_CRON}), ${KYC_ARCHIVE_QUEUE} (${KYC_ARCHIVE_CRON}), ${REPORT_SLA_QUEUE} (${REPORT_SLA_CRON}), ${REPORT_STALE_QUEUE} (${REPORT_STALE_CRON}), ${REPORT_EVIDENCE_QUEUE} (${REPORT_EVIDENCE_CRON}), ${GROUP_INVITE_EXPIRY_QUEUE} (${GROUP_INVITE_EXPIRY_CRON}), ${GROUP_PAYMENT_DEADLINE_QUEUE} (${GROUP_PAYMENT_DEADLINE_CRON})`,
    );
  }

  async onModuleDestroy() {
    await Promise.all([
      this.releaseWorker?.close(),
      this.kycArchiveWorker?.close(),
      this.reportSlaWorker?.close(),
      this.reportStaleWorker?.close(),
      this.reportEvidenceWorker?.close(),
      this.groupInviteExpiryWorker?.close(),
      this.groupPaymentDeadlineWorker?.close(),
      this.releaseQueue?.close(),
      this.kycArchiveQueue?.close(),
      this.reportSlaQueue?.close(),
      this.reportStaleQueue?.close(),
      this.reportEvidenceQueue?.close(),
      this.groupInviteExpiryQueue?.close(),
      this.groupPaymentDeadlineQueue?.close(),
    ]);
    if (this.connection) {
      this.connection.disconnect();
    }
  }
}
