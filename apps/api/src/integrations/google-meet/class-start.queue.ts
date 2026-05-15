import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from "@nestjs/common";
import { Queue, Worker } from "bullmq";
import IORedis, { type Redis } from "ioredis";

import { PrismaService } from "../../prisma/prisma.service";
import { GoogleMeetService } from "./google-meet.service";

export const CLASS_START_QUEUE = "class-start";

/**
 * FR-TH-17: owns the class-start BullMQ queue + worker pair.
 *
 * Each paid booking enqueues exactly one delayed job at
 * `scheduledAt - GOOGLE_MEET_LEAD_MINUTES`, keyed by bookingId so
 * cancellation/re-enqueue from postpone-confirm is clean. Adding the same
 * jobId again replaces the prior delayed job (BullMQ dedupes by jobId).
 *
 * The worker runs idempotently: it re-loads the booking, aborts if status
 * has drifted off `paid`, then delegates to GoogleMeetService —
 * which itself is idempotent on Booking.meetLink. So a retry, a manual
 * replay, or an enqueue collision all end with one Meet link and one
 * system chat message.
 *
 * Honors JOBS_ENABLED=false (OpenAPI export, redis-less local runs) and
 * GOOGLE_MEET_ENABLED=false (worker posts the fallback chat message
 * instead of calling Calendar).
 */
@Injectable()
export class ClassStartQueue implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ClassStartQueue.name);
  private connection?: Redis;
  private queue?: Queue;
  private worker?: Worker;

  constructor(
    private readonly googleMeet: GoogleMeetService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    if (process.env.JOBS_ENABLED === "false") {
      this.logger.log("JOBS_ENABLED=false — class-start queue disabled");
      return;
    }
    const url = process.env.REDIS_URL ?? "redis://localhost:6379";
    this.connection = new IORedis(url, { maxRetriesPerRequest: null });

    this.queue = new Queue(CLASS_START_QUEUE, { connection: this.connection });

    this.worker = new Worker(
      CLASS_START_QUEUE,
      async (job) => {
        const bookingId = String(job.data?.bookingId ?? "");
        if (!bookingId) throw new Error("Job missing bookingId");
        await this.handle(bookingId);
      },
      { connection: this.connection },
    );
    this.worker.on("failed", (job, err) => {
      this.logger.error(
        `class-start ${job?.id} failed: ${err.message}`,
      );
    });
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue?.close();
    this.connection?.disconnect();
  }

  /**
   * Idempotent: re-enqueueing with the same bookingId replaces the prior
   * delayed job. Lead time is read each call so env changes take effect
   * on the next enqueue without a restart.
   */
  async enqueueForBooking(bookingId: string, scheduledAt: Date): Promise<void> {
    if (!this.queue) return;
    const leadMinutes = this.leadMinutes();
    const runAt = new Date(scheduledAt.getTime() - leadMinutes * 60_000);
    const delay = Math.max(0, runAt.getTime() - Date.now());
    await this.queue.add(
      "fire",
      { bookingId },
      { jobId: `class-start-${bookingId}`, delay, removeOnComplete: true },
    );
  }

  async cancelForBooking(bookingId: string): Promise<void> {
    if (!this.queue) return;
    const job = await this.queue.getJob(`class-start-${bookingId}`);
    if (job) {
      try {
        await job.remove();
      } catch {
        // job may have already fired between getJob and remove; safe to ignore.
      }
    }
  }

  /**
   * Exposed for tests + manual replays via a one-off script. In production
   * this is only ever called by the worker.
   */
  async handle(bookingId: string): Promise<void> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: { status: true },
    });
    if (!booking) {
      this.logger.warn(`Booking ${bookingId} not found at class-start fire — skipping`);
      return;
    }
    if (booking.status !== "paid") {
      this.logger.log(
        `Booking ${bookingId} status=${booking.status}, not paid — skipping link generation`,
      );
      return;
    }
    if (this.googleMeet.isEnabled()) {
      await this.googleMeet.createForBooking(bookingId);
    } else {
      await this.googleMeet.postFallbackMessage(bookingId);
    }
  }

  private leadMinutes(): number {
    const raw = process.env.GOOGLE_MEET_LEAD_MINUTES;
    if (!raw) return 5;
    const n = Number.parseInt(raw, 10);
    if (Number.isNaN(n) || n < 0) return 5;
    return n;
  }
}
