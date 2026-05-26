// Shared time helpers used by both the API and web app.
//
// PeeRahat operates exclusively in Thailand (FR-TH-*). Thailand stays on
// Asia/Bangkok year-round with no DST, so a fixed +07:00 offset is exact
// and avoids pulling in a TZ database on either side.

import { z } from "zod";

const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;

/**
 * Loose ISO date/datetime parser used by DTOs that the controller pipes
 * straight into `new Date(...)`. Shared between admin DTOs (period
 * ranges), payout DTOs (batchDate), and any other date-bearing input —
 * keeps the validation surface consistent across packages.
 */
export const dateStringSchema = z
  .string()
  .min(1)
  .refine((v) => !Number.isNaN(Date.parse(v)), {
    message: "Invalid date",
  });

/**
 * Returns the UTC instant corresponding to 00:00 of the next calendar day in
 * Asia/Bangkok. The "must book in advance" rule (FR-TH-12, FR-TH-18) is a
 * calendar-day boundary, not a rolling 24h window — at 23:00 Bangkok you can
 * still book for 00:30 the next day, but at 01:00 Bangkok you cannot book
 * anything later today.
 */
export function startOfTomorrowBangkok(now: Date = new Date()): Date {
  const bkkNow = new Date(now.getTime() + BANGKOK_OFFSET_MS);
  bkkNow.setUTCHours(0, 0, 0, 0);
  bkkNow.setUTCDate(bkkNow.getUTCDate() + 1);
  return new Date(bkkNow.getTime() - BANGKOK_OFFSET_MS);
}
