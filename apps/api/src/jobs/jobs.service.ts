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
import { PayoutsService } from "../payments/payouts.service";

const ESCROW_QUEUE = "escrow-release";
const PAYOUTS_QUEUE = "payouts-compute";
const KYC_ARCHIVE_QUEUE = "kyc-archive";

const ESCROW_CRON = "*/5 * * * *"; // every 5 minutes
const PAYOUTS_CRON = "0 2 15,30 * *"; // 02:00 on the 15th and 30th
const KYC_ARCHIVE_CRON = "0 * * * *"; // top of every hour

/**
 * BullMQ scheduler for the recurring back-office jobs:
 * - FR-PM-05: releaseExpiredEscrow flips paid bookings to completed
 *   once their 24h report window closes without dispute.
 * - FR-PM-06: runScheduledPayout aggregates released intents into
 *   per-tutor Payout rows on the 15th and 30th of each month.
 * - NFR-03:   archiveVerified moves KYC files from the hot bucket to
 *   cold archive once admin approves the submission. Hourly cadence
 *   keeps us well inside the 24h SLA.
 *
 * Set JOBS_ENABLED=false to skip startup (used by openapi:export and
 * by anyone who wants to run the API without Redis attached).
 */
@Injectable()
export class JobsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobsService.name);
  private connection?: Redis;
  private escrowQueue?: Queue;
  private payoutsQueue?: Queue;
  private kycArchiveQueue?: Queue;
  private escrowWorker?: Worker;
  private payoutsWorker?: Worker;
  private kycArchiveWorker?: Worker;

  constructor(
    @Inject(PaymentsService) private readonly payments: PaymentsService,
    @Inject(PayoutsService) private readonly payouts: PayoutsService,
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

    this.escrowQueue = new Queue(ESCROW_QUEUE, { connection: this.connection });
    this.payoutsQueue = new Queue(PAYOUTS_QUEUE, { connection: this.connection });
    this.kycArchiveQueue = new Queue(KYC_ARCHIVE_QUEUE, {
      connection: this.connection,
    });

    this.escrowWorker = new Worker(
      ESCROW_QUEUE,
      async () => {
        const result = await this.payments.releaseExpiredEscrow();
        if (result.released > 0) {
          this.logger.log(`Released ${result.released} expired escrow(s)`);
        }
        return result;
      },
      { connection: this.connection },
    );
    this.escrowWorker.on("failed", (job, err) => {
      this.logger.error(`escrow-release ${job?.id} failed: ${err.message}`);
    });

    this.payoutsWorker = new Worker(
      PAYOUTS_QUEUE,
      async () => {
        const result = await this.payouts.runScheduledPayout();
        this.logger.log(
          `Scheduled payout created ${result.count} payout row(s)`,
        );
        return result;
      },
      { connection: this.connection },
    );
    this.payoutsWorker.on("failed", (job, err) => {
      this.logger.error(`payouts-compute ${job?.id} failed: ${err.message}`);
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

    // Repeatable jobs are upserted by name+pattern, so re-registering on
    // every boot is safe — bullmq dedupes.
    await this.escrowQueue.add(
      "tick",
      {},
      { repeat: { pattern: ESCROW_CRON } },
    );
    await this.payoutsQueue.add(
      "batch",
      {},
      { repeat: { pattern: PAYOUTS_CRON } },
    );
    await this.kycArchiveQueue.add(
      "tick",
      {},
      { repeat: { pattern: KYC_ARCHIVE_CRON } },
    );

    this.logger.log(
      `Jobs registered: ${ESCROW_QUEUE} (${ESCROW_CRON}), ${PAYOUTS_QUEUE} (${PAYOUTS_CRON}), ${KYC_ARCHIVE_QUEUE} (${KYC_ARCHIVE_CRON})`,
    );
  }

  async onModuleDestroy() {
    await Promise.all([
      this.escrowWorker?.close(),
      this.payoutsWorker?.close(),
      this.kycArchiveWorker?.close(),
      this.escrowQueue?.close(),
      this.payoutsQueue?.close(),
      this.kycArchiveQueue?.close(),
    ]);
    if (this.connection) {
      this.connection.disconnect();
    }
  }
}
