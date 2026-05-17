import { BadRequestException } from "@nestjs/common";

const MAX_WINDOW_DAYS = 31;
const MAX_WINDOW_MS = MAX_WINDOW_DAYS * 24 * 60 * 60 * 1000;

/**
 * Parses ISO `from`/`to` query params for availability/busy endpoints and
 * enforces an upper bound so an unbounded window can't fan out into the
 * weeks × rules cost of expandWeeklyRules. Used by /tutors/:id/availability
 * and /bookings/mine/busy.
 */
export function parseAvailabilityWindow(
  from: string,
  to: string,
): { fromDate: Date; toDate: Date } {
  const fromDate = new Date(from);
  const toDate = new Date(to);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    throw new BadRequestException("from and to must be ISO datetimes");
  }
  if (fromDate.getTime() >= toDate.getTime()) {
    throw new BadRequestException("from must be earlier than to");
  }
  if (toDate.getTime() - fromDate.getTime() > MAX_WINDOW_MS) {
    throw new BadRequestException(
      `availability window must be at most ${MAX_WINDOW_DAYS} days`,
    );
  }
  return { fromDate, toDate };
}
