import { intervalsOverlap } from "./bookings.service";

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
