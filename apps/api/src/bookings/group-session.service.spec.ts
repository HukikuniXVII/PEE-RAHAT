import { BadRequestException } from "@nestjs/common";

import {
  normalizeInviteEmails,
  shouldConfirmGroup,
  shouldMoveToTutorReview,
} from "./group-session.service";

describe("GroupSessionService pure helpers (FR-TH-18)", () => {
  describe("normalizeInviteEmails", () => {
    const ctx = (
      hostEmail = "host@example.com",
      alreadyParticipating: string[] = [],
    ) => ({
      hostEmail,
      alreadyParticipating: new Set(
        alreadyParticipating.map((e) => e.toLowerCase()),
      ),
    });

    it("lowercases + trims + dedupes", () => {
      expect(
        normalizeInviteEmails([" A@B.com ", "a@b.com", "C@D.com"], ctx()),
      ).toEqual(["a@b.com", "c@d.com"]);
    });

    it("rejects self-invite (case-insensitive)", () => {
      expect(() =>
        normalizeInviteEmails(["HOST@example.com"], ctx("host@example.com")),
      ).toThrow(BadRequestException);
    });

    it("rejects already-participating emails", () => {
      expect(() =>
        normalizeInviteEmails(
          ["x@y.com"],
          ctx("host@example.com", ["X@Y.com"]),
        ),
      ).toThrow(BadRequestException);
    });

    it("skips empty + whitespace-only entries silently", () => {
      expect(normalizeInviteEmails(["", "  ", "a@b.com"], ctx())).toEqual([
        "a@b.com",
      ]);
    });
  });

  describe("shouldMoveToTutorReview", () => {
    it("false until every seat is filled", () => {
      const participants = [{ status: "accepted" }, { status: "accepted" }];
      expect(shouldMoveToTutorReview(participants, 3)).toBe(false);
    });

    it("false if any seat is still 'invited'", () => {
      const participants = [
        { status: "accepted" },
        { status: "accepted" },
        { status: "invited" },
      ];
      expect(shouldMoveToTutorReview(participants, 3)).toBe(false);
    });

    it("false if any seat is 'declined'", () => {
      const participants = [
        { status: "accepted" },
        { status: "declined" },
        { status: "accepted" },
      ];
      expect(shouldMoveToTutorReview(participants, 3)).toBe(false);
    });

    it("true when every seat is accepted or paid (host may have prepaid)", () => {
      const participants = [
        { status: "paid" },
        { status: "accepted" },
        { status: "accepted" },
      ];
      expect(shouldMoveToTutorReview(participants, 3)).toBe(true);
    });
  });

  describe("shouldConfirmGroup", () => {
    it("false if anyone hasn't paid", () => {
      const participants = [{ status: "paid" }, { status: "accepted" }];
      expect(shouldConfirmGroup(participants, 2)).toBe(false);
    });

    it("false if fewer rows than capacity (some never invited)", () => {
      expect(shouldConfirmGroup([{ status: "paid" }], 2)).toBe(false);
    });

    it("true only when every seat is paid", () => {
      const participants = [
        { status: "paid" },
        { status: "paid" },
        { status: "paid" },
      ];
      expect(shouldConfirmGroup(participants, 3)).toBe(true);
    });
  });
});
