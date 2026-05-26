import {
  Controller,
  Get,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Request, Response } from "express";

import { SupabaseAuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import type { SupabaseJwtPayload } from "../auth/supabase-jwt.strategy";
import { PrismaService } from "../prisma/prisma.service";
import { SseGateway } from "./sse.gateway";

/**
 * FR-CM-08 — long-lived SSE channel for in-app notifications.
 *
 * Auth via `?token=<supabase-access-token>`; the JWT strategy in
 * supabase-jwt.strategy.ts was extended to also extract from the
 * `token` query param so EventSource can authenticate without a
 * header (the browser API doesn't allow setting one on EventSource).
 *
 * The handler bypasses NestJS's normal response pipeline by writing
 * to the raw Express `Response` directly — Nest treats the handler as
 * complete the moment we return, but the socket stays open until the
 * client disconnects (handled via `req.on("close")` below).
 */
@Controller("notifications")
export class NotificationsSseController {
  constructor(
    private readonly gateway: SseGateway,
    private readonly prisma: PrismaService,
  ) {}

  @Get("stream")
  @UseGuards(SupabaseAuthGuard)
  async stream(
    @CurrentUser() jwt: SupabaseJwtPayload,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { supabaseId: jwt.sub },
      select: { id: true },
    });
    if (!user) {
      res.status(401).end();
      return;
    }

    // SSE headers. Disable proxy buffering with X-Accel-Buffering off
    // (Nginx hint; harmless elsewhere) so chunks reach the client
    // immediately. Cache-Control no-transform stops middleware from
    // gzipping the stream and stalling it.
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    this.gateway.register(user.id, res);

    req.on("close", () => {
      this.gateway.unregister(user.id, res);
      // Don't res.end() — the connection is already closed.
    });
  }
}
