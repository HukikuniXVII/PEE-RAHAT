import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { Queue, Worker } from "bullmq";
import IORedis, { type Redis } from "ioredis";

import { KycService } from "../kyc/kyc.service";
import { PaymentsService } from "../payments/payments.service";

const RELEASE_FOR_PAYOUT_QUEUE = "release-for-payout";
const KYC_ARCHIVE_QUEUE = "kyc-archive";

const RELEASE_FOR_PAYOUT_CRON = "0 3 * * *"; // 03:00 every day
const KYC_ARCHIVE_CRON = "0 * * * *"; // top of every hour

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

  constructor(
    @Inject(PaymentsService) private readonly payments: PaymentsService,
    @Inject(KycService) private readonly kyc: KycService,
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

    this.logger.log(
      `Jobs registered: ${RELEASE_FOR_PAYOUT_QUEUE} (${RELEASE_FOR_PAYOUT_CRON}), ${KYC_ARCHIVE_QUEUE} (${KYC_ARCHIVE_CRON})`,
    );
  }

  async onModuleDestroy() {
    await Promise.all([
      this.releaseWorker?.close(),
      this.kycArchiveWorker?.close(),
      this.releaseQueue?.close(),
      this.kycArchiveQueue?.close(),
    ]);
    if (this.connection) {
      this.connection.disconnect();
    }
  }
}
