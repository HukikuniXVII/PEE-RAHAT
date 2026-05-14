import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from "@nestjs/common";
import { Queue, Worker } from "bullmq";
import IORedis, { type Redis } from "ioredis";

export const POSTPONE_TIMEOUT_QUEUE = "postpone-timeout";

type Resolver = (requestId: string) => Promise<void>;

/**
 * FR-TH-13: owns the postpone-timeout BullMQ queue + worker pair.
 *
 * Each PostponeRequest enqueues exactly one delayed job at `chatExpiresAt`,
 * keyed by requestId so confirm/cancel can remove it cleanly.
 *
 * Worker setup lives here (not in JobsService) to keep PostponeService's
 * dependencies inside the bookings module. The resolver is registered by
 * PostponeService.onModuleInit — there's a tiny race window at boot if a
 * job is due immediately, which the worker handler guards against.
 *
 * Respects JOBS_ENABLED=false (the same flag JobsService uses) so OpenAPI
 * export and Redis-less runs stay clean.
 */
@Injectable()
export class PostponeQueue implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PostponeQueue.name);
  private connection?: Redis;
  private queue?: Queue;
  private worker?: Worker;
  private resolver?: Resolver;

  async onModuleInit() {
    if (process.env.JOBS_ENABLED === "false") {
      this.logger.log("JOBS_ENABLED=false — postpone-timeout disabled");
      return;
    }
    const url = process.env.REDIS_URL ?? "redis://localhost:6379";
    this.connection = new IORedis(url, { maxRetriesPerRequest: null });

    this.queue = new Queue(POSTPONE_TIMEOUT_QUEUE, {
      connection: this.connection,
    });

    this.worker = new Worker(
      POSTPONE_TIMEOUT_QUEUE,
      async (job) => {
        if (!this.resolver) {
          throw new Error(
            "Postpone resolver not registered — PostponeService.onModuleInit must run first",
          );
        }
        const requestId = String(job.data?.requestId ?? "");
        if (!requestId) throw new Error("Job missing requestId");
        await this.resolver(requestId);
      },
      { connection: this.connection },
    );
    this.worker.on("failed", (job, err) => {
      this.logger.error(
        `postpone-timeout ${job?.id} failed: ${err.message}`,
      );
    });
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue?.close();
    this.connection?.disconnect();
  }

  setResolver(resolver: Resolver) {
    this.resolver = resolver;
  }

  /**
   * Idempotent: re-enqueueing with the same requestId replaces the prior
   * delayed job because BullMQ dedupes by jobId.
   */
  async enqueueTimeout(requestId: string, runAt: Date): Promise<void> {
    if (!this.queue) return;
    const delay = Math.max(0, runAt.getTime() - Date.now());
    await this.queue.add(
      "resolve",
      { requestId },
      { jobId: `postpone-timeout-${requestId}`, delay, removeOnComplete: true },
    );
  }

  async cancelTimeout(requestId: string): Promise<void> {
    if (!this.queue) return;
    const job = await this.queue.getJob(`postpone-timeout-${requestId}`);
    if (job) {
      try {
        await job.remove();
      } catch {
        // job may have already fired between getJob and remove; safe to ignore.
      }
    }
  }
}
