import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { ZodError } from "zod";

import type { ApiError } from "@peerahat/types";

/**
 * Normalizes every error reaching the HTTP layer to the ApiError contract
 * declared in @peerahat/types ({ statusCode, message, code?, details? }) so
 * the web api-client can rely on a single envelope shape — including the
 * `code` field that BookingOverlapError (and any future typed error)
 * discriminates on.
 *
 * - HttpException with string body → message is the string.
 * - HttpException with object body → preserves `code`, folds a
 *   class-validator string[] message into details.errors, and merges any
 *   extra structured keys (e.g. conflictingBookingId) into details.
 * - Anything else → logged as unhandled and returned as a generic 500 so
 *   internals never leak to clients.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = "Internal server error";
    let code: string | undefined;
    let details: Record<string, unknown> | undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === "string") {
        message = res;
      } else if (res && typeof res === "object") {
        const body = res as Record<string, unknown>;
        const rawMessage = body.message;
        if (typeof rawMessage === "string") {
          message = rawMessage;
        } else if (Array.isArray(rawMessage)) {
          // class-validator emits string[] of field errors.
          message = rawMessage.join(", ");
          details = { errors: rawMessage };
        } else {
          message = exception.message;
        }
        if (typeof body.code === "string") {
          code = body.code;
        }
        const extras: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(body)) {
          if (k === "statusCode" || k === "message" || k === "error" || k === "code") {
            continue;
          }
          extras[k] = v;
        }
        if (Object.keys(extras).length > 0) {
          details = { ...(details ?? {}), ...extras };
        }
      }
    } else if (exception instanceof ZodError) {
      // Controllers that call schema.parse(raw) — e.g. updateMyBank — throw
      // ZodError on malformed input. Without this branch the filter would
      // log+swallow them as unhandled 500s. Mirror the BadRequestException
      // shape that explicit safeParse callsites use so frontends discriminate
      // identically: { code: "VALIDATION_ERROR", details.issues: [...] }.
      statusCode = HttpStatus.BAD_REQUEST;
      message = "Validation failed";
      code = "VALIDATION_ERROR";
      details = { issues: exception.issues };
    } else if (exception instanceof Error) {
      this.logger.error(
        `Unhandled exception on ${request.method} ${request.originalUrl}: ${exception.message}`,
        exception.stack,
      );
    } else {
      this.logger.error(
        `Unknown exception on ${request.method} ${request.originalUrl}: ${String(exception)}`,
      );
    }

    const body: ApiError = {
      statusCode,
      message,
      ...(code !== undefined ? { code } : {}),
      ...(details !== undefined ? { details } : {}),
    };
    response.status(statusCode).json(body);
  }
}
