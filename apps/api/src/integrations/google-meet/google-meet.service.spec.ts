import { BadRequestException, NotFoundException } from "@nestjs/common";

import { GoogleMeetService } from "./google-meet.service";

// Captured by the mock so each test can inspect or override per-call.
const eventsInsert = jest.fn();
const eventsDelete = jest.fn();

jest.mock("googleapis", () => ({
  google: {
    calendar: jest.fn(() => ({
      events: { insert: (...args: unknown[]) => eventsInsert(...args), delete: (...args: unknown[]) => eventsDelete(...args) },
    })),
    auth: { JWT: jest.fn().mockImplementation(() => ({})) },
  },
}));

const SAMPLE_BOOKING = {
  id: "bk_1",
  studentId: "u_student",
  subject: "Math A-Level",
  scheduledAt: new Date("2026-05-20T13:00:00Z"),
  durationMinutes: 60,
  meetingUrl: null as string | null,
  student: {
    id: "u_student",
    email: "student@example.com",
    displayName: "น้องเอ",
  },
  tutor: {
    user: { email: "tutor@example.com", displayName: "ภาส" },
  },
};

function makeService(overrides: { booking?: typeof SAMPLE_BOOKING | null } = {}) {
  const booking = overrides.booking === undefined ? SAMPLE_BOOKING : overrides.booking;
  const prisma = {
    booking: {
      findUnique: jest.fn(async () => booking),
      update: jest.fn(async () => booking),
    },
  };
  const chat = {
    ensureThreadForBooking: jest.fn(async (_bookingId: string) => ({ id: "th_1" })),
    postSystemMessage: jest.fn(
      async (_threadId: string, _body: string, _actorUserId: string) => undefined,
    ),
  };
  const svc = new GoogleMeetService(
    // intentional structural typing — we only call the methods we mock
    prisma as never,
    chat as never,
  );
  return { svc, prisma, chat };
}

describe("GoogleMeetService (FR-TH-17)", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.GOOGLE_MEET_ENABLED = "true";
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = "bot@svc.iam";
    process.env.GOOGLE_CALENDAR_OWNER_EMAIL = "classes@peerahat.co";
    // Minimal valid JSON with a fake private_key, base64-encoded.
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64 = Buffer.from(
      JSON.stringify({ private_key: "-----BEGIN PRIVATE KEY-----\nfake\n-----END PRIVATE KEY-----" }),
    ).toString("base64");
    eventsInsert.mockReset();
    eventsDelete.mockReset();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("isEnabled()", () => {
    it("respects GOOGLE_MEET_ENABLED env", () => {
      const { svc } = makeService();
      expect(svc.isEnabled()).toBe(true);
      process.env.GOOGLE_MEET_ENABLED = "false";
      expect(svc.isEnabled()).toBe(false);
    });
  });

  describe("createForBooking — happy path", () => {
    it("calls Calendar API, persists link + eventId, posts system message", async () => {
      eventsInsert.mockResolvedValueOnce({
        data: { hangoutLink: "https://meet.google.com/abc-defg-hij", id: "evt_1" },
      });
      const { svc, prisma, chat } = makeService();

      const result = await svc.createForBooking("bk_1");

      expect(result).toEqual({ meetingUrl: "https://meet.google.com/abc-defg-hij", reused: false });
      expect(eventsInsert).toHaveBeenCalledTimes(1);
      const insertArgs = eventsInsert.mock.calls[0][0];
      expect(insertArgs.calendarId).toBe("primary");
      expect(insertArgs.conferenceDataVersion).toBe(1);
      expect(insertArgs.requestBody.attendees).toEqual([
        { email: "student@example.com", displayName: "น้องเอ" },
        { email: "tutor@example.com", displayName: "ภาส" },
      ]);
      expect(insertArgs.requestBody.conferenceData.createRequest.conferenceSolutionKey.type).toBe(
        "hangoutsMeet",
      );

      expect(prisma.booking.update).toHaveBeenCalledWith({
        where: { id: "bk_1" },
        data: expect.objectContaining({
          meetingUrl: "https://meet.google.com/abc-defg-hij",
          googleCalendarEventId: "evt_1",
          meetingGeneratedAt: expect.any(Date),
        }),
      });

      expect(chat.ensureThreadForBooking).toHaveBeenCalledWith("bk_1");
      expect(chat.postSystemMessage).toHaveBeenCalledTimes(1);
      const [threadId, body, actor] = chat.postSystemMessage.mock.calls[0]!;
      expect(threadId).toBe("th_1");
      expect(actor).toBe("u_student");
      expect(body).toContain("Math A-Level");
      expect(body).toContain("https://meet.google.com/abc-defg-hij");
      expect(body).toContain("60 นาที");
    });
  });

  describe("createForBooking — idempotency", () => {
    it("returns existing link without re-hitting Calendar when meetingUrl already set", async () => {
      const { svc, prisma, chat } = makeService({
        booking: { ...SAMPLE_BOOKING, meetingUrl: "https://meet.google.com/already-there" },
      });

      const result = await svc.createForBooking("bk_1");

      expect(result).toEqual({
        meetingUrl: "https://meet.google.com/already-there",
        reused: true,
      });
      expect(eventsInsert).not.toHaveBeenCalled();
      expect(prisma.booking.update).not.toHaveBeenCalled();
      expect(chat.postSystemMessage).not.toHaveBeenCalled();
    });
  });

  describe("createForBooking — error paths", () => {
    it("throws NotFoundException when booking missing", async () => {
      const { svc } = makeService({ booking: null });
      await expect(svc.createForBooking("missing")).rejects.toBeInstanceOf(NotFoundException);
    });

    it("throws BadRequestException when called while disabled", async () => {
      process.env.GOOGLE_MEET_ENABLED = "false";
      const { svc } = makeService();
      await expect(svc.createForBooking("bk_1")).rejects.toBeInstanceOf(BadRequestException);
    });

    it("logs but does not throw when hangoutLink AND entryPoints are missing", async () => {
      eventsInsert.mockResolvedValueOnce({ data: { id: "evt_1" } });
      const { svc, prisma, chat } = makeService();

      const result = await svc.createForBooking("bk_1");

      expect(result.meetingUrl).toBeNull();
      // Persistence and chat skipped when link is missing — we don't want
      // to ship a half-broken state to the student.
      expect(prisma.booking.update).not.toHaveBeenCalled();
      expect(chat.postSystemMessage).not.toHaveBeenCalled();
    });
  });

  describe("createForBooking — hangoutLink fallback", () => {
    it("falls back to conferenceData.entryPoints[].uri (video) when hangoutLink missing", async () => {
      // Workspace sometimes omits hangoutLink for service-account-created
      // events; the same URL is mirrored on the video entry point.
      eventsInsert.mockResolvedValueOnce({
        data: {
          id: "evt_2",
          conferenceData: {
            entryPoints: [
              { entryPointType: "more", uri: "https://meet.google.com/more" },
              { entryPointType: "video", uri: "https://meet.google.com/from-entry-point" },
              { entryPointType: "phone", uri: "tel:+1-555-0100" },
            ],
          },
        },
      });
      const { svc, prisma } = makeService();

      const result = await svc.createForBooking("bk_1");

      expect(result.meetingUrl).toBe("https://meet.google.com/from-entry-point");
      expect(prisma.booking.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            meetingUrl: "https://meet.google.com/from-entry-point",
          }),
        }),
      );
    });

    it("prefers hangoutLink when both are present", async () => {
      eventsInsert.mockResolvedValueOnce({
        data: {
          id: "evt_3",
          hangoutLink: "https://meet.google.com/canonical",
          conferenceData: {
            entryPoints: [
              { entryPointType: "video", uri: "https://meet.google.com/fallback" },
            ],
          },
        },
      });
      const { svc } = makeService();
      const result = await svc.createForBooking("bk_1");
      expect(result.meetingUrl).toBe("https://meet.google.com/canonical");
    });
  });

  describe("deleteEvent", () => {
    it("calls events.delete with sendUpdates=all", async () => {
      eventsDelete.mockResolvedValueOnce({});
      const { svc } = makeService();
      await svc.deleteEvent("evt_42");
      expect(eventsDelete).toHaveBeenCalledWith({
        calendarId: "primary",
        eventId: "evt_42",
        sendUpdates: "all",
      });
    });

    it("swallows API errors so a postpone confirm isn't blocked", async () => {
      eventsDelete.mockRejectedValueOnce(new Error("404 not found"));
      const { svc } = makeService();
      await expect(svc.deleteEvent("evt_42")).resolves.toBeUndefined();
    });

    it("no-ops when disabled", async () => {
      process.env.GOOGLE_MEET_ENABLED = "false";
      const { svc } = makeService();
      await svc.deleteEvent("evt_42");
      expect(eventsDelete).not.toHaveBeenCalled();
    });
  });

  describe("postFallbackMessage", () => {
    it("posts the Thai fallback into the booking thread", async () => {
      const { svc, chat } = makeService();
      await svc.postFallbackMessage("bk_1");
      expect(chat.ensureThreadForBooking).toHaveBeenCalledWith("bk_1");
      const [, body] = chat.postSystemMessage.mock.calls[0]!;
      expect(body).toContain("ติดต่อพี่ติว");
    });
  });
});
