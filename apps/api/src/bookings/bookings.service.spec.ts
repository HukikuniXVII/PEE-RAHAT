import { expandWeeklyRules, intervalsOverlap } from "./bookings.service";

function at(iso: string): Date {
  return new Date(iso);
}

describe("intervalsOverlap (FR-TH-15)", () => {
  describe("boundary semantics — half-open intervals", () => {
    it("touching edges do not overlap (one ends at 14:00, next starts at 14:00)", () => {
      const a = [at("2026-05-14T13:00:00Z"), at("2026-05-14T14:00:00Z")] as const;
      const b = [at("2026-05-14T14:00:00Z"), at("2026-05-14T15:00:00Z")] as const;
      expect(intervalsOverlap(a[0], a[1], b[0], b[1])).toBe(false);
      // commutative
      expect(intervalsOverlap(b[0], b[1], a[0], a[1])).toBe(false);
    });

    it("1-minute overlap counts", () => {
      const a = [at("2026-05-14T13:00:00Z"), at("2026-05-14T14:00:00Z")] as const;
      const b = [at("2026-05-14T13:59:00Z"), at("2026-05-14T14:30:00Z")] as const;
      expect(intervalsOverlap(a[0], a[1], b[0], b[1])).toBe(true);
    });

    it("exact same interval is an overlap", () => {
      const a = [at("2026-05-14T13:00:00Z"), at("2026-05-14T14:00:00Z")] as const;
      expect(intervalsOverlap(a[0], a[1], a[0], a[1])).toBe(true);
    });

    it("one fully contains the other", () => {
      const outer = [at("2026-05-14T10:00:00Z"), at("2026-05-14T18:00:00Z")] as const;
      const inner = [at("2026-05-14T13:00:00Z"), at("2026-05-14T14:00:00Z")] as const;
      expect(intervalsOverlap(outer[0], outer[1], inner[0], inner[1])).toBe(true);
      expect(intervalsOverlap(inner[0], inner[1], outer[0], outer[1])).toBe(true);
    });

    it("disjoint with a gap returns false", () => {
      const a = [at("2026-05-14T10:00:00Z"), at("2026-05-14T11:00:00Z")] as const;
      const b = [at("2026-05-14T13:00:00Z"), at("2026-05-14T14:00:00Z")] as const;
      expect(intervalsOverlap(a[0], a[1], b[0], b[1])).toBe(false);
    });

  });

  describe("30-min slot adjacency (the new slot granularity)", () => {
    // 13:00–13:30 ending exactly at 13:30 leaves 13:30–14:00 free.
    it("back-to-back 30-min slots are NOT overlapping", () => {
      const first = [at("2026-05-14T13:00:00Z"), at("2026-05-14T13:30:00Z")] as const;
      const second = [at("2026-05-14T13:30:00Z"), at("2026-05-14T14:00:00Z")] as const;
      expect(intervalsOverlap(first[0], first[1], second[0], second[1])).toBe(false);
    });

    // A 60-min class at 13:00 reserves 13:00–14:00; a 30-min slot at 13:30
    // sits inside that span, so it IS an overlap.
    it("30-min slot inside a 60-min span is overlapping", () => {
      const hour = [at("2026-05-14T13:00:00Z"), at("2026-05-14T14:00:00Z")] as const;
      const half = [at("2026-05-14T13:30:00Z"), at("2026-05-14T14:00:00Z")] as const;
      expect(intervalsOverlap(hour[0], hour[1], half[0], half[1])).toBe(true);
    });
  });
});

describe("expandWeeklyRules (FR-TH-16)", () => {
  it("returns empty when no rules", () => {
    const from = new Date(2026, 4, 11); // Mon May 11 local
    const to = new Date(2026, 4, 18); // following Mon
    expect(expandWeeklyRules([], from, to)).toEqual([]);
  });

  it("emits one interval per matching day in the window", () => {
    // Mon (weekday=1) 12:00–13:00 lunch block.
    const rule = { weekday: 1, startMinute: 12 * 60, endMinute: 13 * 60 };
    const from = new Date(2026, 4, 11); // Mon
    const to = new Date(2026, 4, 25); // 2 weeks later (exclusive)
    const intervals = expandWeeklyRules([rule], from, to);
    // Expected: Mon May 11 12:00–13:00, Mon May 18 12:00–13:00 — 2 intervals.
    expect(intervals).toHaveLength(2);
    expect(intervals[0]).toEqual({
      start: new Date(2026, 4, 11, 12, 0).toISOString(),
      end: new Date(2026, 4, 11, 13, 0).toISOString(),
    });
    expect(intervals[1]).toEqual({
      start: new Date(2026, 4, 18, 12, 0).toISOString(),
      end: new Date(2026, 4, 18, 13, 0).toISOString(),
    });
  });

  it("respects window boundaries — rule outside [from, to) is skipped", () => {
    const rule = { weekday: 1, startMinute: 12 * 60, endMinute: 13 * 60 };
    // Window is Tue→Wed only — no Mondays.
    const from = new Date(2026, 4, 12); // Tue
    const to = new Date(2026, 4, 14); // Thu (exclusive)
    expect(expandWeeklyRules([rule], from, to)).toEqual([]);
  });

  it("handles multiple rules on different weekdays", () => {
    const rules = [
      { weekday: 1, startMinute: 12 * 60, endMinute: 13 * 60 }, // Mon lunch
      { weekday: 5, startMinute: 18 * 60, endMinute: 19 * 60 }, // Fri evening
    ];
    const from = new Date(2026, 4, 11); // Mon
    const to = new Date(2026, 4, 18); // following Mon (exclusive)
    const intervals = expandWeeklyRules(rules, from, to);
    expect(intervals).toHaveLength(2); // one Mon + one Fri in the week.
  });
});
