import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import IORedis, { type Redis } from "ioredis";
import { randomUUID } from "node:crypto";

// 1h TTL matches the spec — long enough that an admin can step away during
// preview review without losing context, short enough that abandoned uploads
// don't pile up.
const STASH_TTL_SECONDS = 3600;
const KEY_PREFIX = "tcas:upload:";

@Injectable()
export class TcasImportCache implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TcasImportCache.name);
  private redis?: Redis;
  // Falls back to an in-memory map when REDIS_URL is unset OR
  // JOBS_ENABLED=false — keeps openapi:export and offline dev working.
  private readonly memoryFallback = new Map<
    string,
    { value: unknown; expiresAt: number }
  >();

  onModuleInit() {
    if (process.env.JOBS_ENABLED === "false") {
      this.logger.log(
        "JOBS_ENABLED=false — using in-memory stash (no Redis)",
      );
      return;
    }
    const url = process.env.REDIS_URL ?? "redis://localhost:6379";
    this.redis = new IORedis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 2,
    });
    this.redis.on("error", (err) => {
      this.logger.warn(`Redis error (falling back to memory): ${err.message}`);
    });
    void this.redis.connect().catch(() => {
      // Connection failure is non-fatal — we'll keep using memoryFallback.
      this.redis = undefined;
    });
  }

  async onModuleDestroy() {
    await this.redis?.quit();
  }

  async stash<T>(payload: T): Promise<string> {
    const id = randomUUID();
    const key = KEY_PREFIX + id;
    const serialized = JSON.stringify(payload);
    if (this.redis && this.redis.status === "ready") {
      await this.redis.set(key, serialized, "EX", STASH_TTL_SECONDS);
    } else {
      this.memoryFallback.set(key, {
        value: payload,
        expiresAt: Date.now() + STASH_TTL_SECONDS * 1000,
      });
    }
    return id;
  }

  async fetch<T>(uploadId: string): Promise<T | null> {
    const key = KEY_PREFIX + uploadId;
    if (this.redis && this.redis.status === "ready") {
      const raw = await this.redis.get(key);
      if (raw === null) return null;
      return JSON.parse(raw) as T;
    }
    const hit = this.memoryFallback.get(key);
    if (!hit) return null;
    if (hit.expiresAt < Date.now()) {
      this.memoryFallback.delete(key);
      return null;
    }
    return hit.value as T;
  }

  async drop(uploadId: string): Promise<void> {
    const key = KEY_PREFIX + uploadId;
    if (this.redis && this.redis.status === "ready") {
      await this.redis.del(key);
    } else {
      this.memoryFallback.delete(key);
    }
  }
}
