import { GoogleCalendarService } from "./google-calendar.service";

const eventsInsert = jest.fn();
const eventsDelete = jest.fn();

jest.mock("googleapis", () => ({
  google: {
    calendar: jest.fn(() => ({
      events: {
        insert: (...args: unknown[]) => eventsInsert(...args),
        delete: (...args: unknown[]) => eventsDelete(...args),
      },
    })),
  },
}));

function makeService() {
  const oauth = {
    getAuthorizedClient: jest.fn(async (_id: string) => ({})),
  };
  const prisma = {
    booking: {
      findUnique: jest.fn(async () => null),
      update: jest.fn(async () => ({})),
    },
  };
  const chat = {
    ensureThreadForBooking: jest.fn(async (_id: string) => ({ id: "th_1" })),
    postSystemMessage: jest.fn(
      async (_t: string, _b: string, _a: string) => undefined,
    ),
  };
  // attachToBooking-level coverage lives in a separate describe; the
  // tests below exercise the lower-level Calendar API methods directly,
  // so prisma/chat aren't called.
  const svc = new GoogleCalendarService(
    oauth as never,
    prisma as never,
    chat as never,
  );
  return { svc, oauth, prisma, chat };
}

describe("GoogleCalendarService (FR-TH-17 rev3)", () => {
  beforeEach(() => {
    eventsInsert.mockReset();
    eventsDelete.mockReset();
  });

  describe("createMeetLink", () => {
    it("calls events.insert with the right payload", async () => {
      eventsInsert.mockResolvedValueOnce({
        data: { id: "evt_1", hangoutLink: "https://meet.google.com/abc-defg-hij" },
      });
      const { svc, oauth } = makeService();
      const start = new Date("2026-05-20T13:00:00Z");
      const end = new Date("2026-05-20T14:00:00Z");

      const result = await svc.createMeetLink("tut_1", {
        title: "Pee Rahat: Math กับพี่นัท",
        startTime: start,
        endTime: end,
        attendeeEmails: ["student@example.com", "nut@gmail.com"],
      });

      expect(oauth.getAuthorizedClient).toHaveBeenCalledWith("tut_1");
      expect(result).toEqual({
        meetingUrl: "https://meet.google.com/abc-defg-hij",
        eventId: "evt_1",
      });
      const insertArgs = eventsInsert.mock.calls[0]![0];
      expect(insertArgs.calendarId).toBe("primary");
      expect(insertArgs.conferenceDataVersion).toBe(1);
      expect(insertArgs.sendUpdates).toBe("all");
      expect(insertArgs.requestBody.summary).toBe("Pee Rahat: Math กับพี่นัท");
      expect(insertArgs.requestBody.attendees).toEqual([
        { email: "student@example.com" },
        { email: "nut@gmail.com" },
      ]);
      expect(
        insertArgs.requestBody.conferenceData.createRequest.conferenceSolutionKey.type,
      ).toBe("hangoutsMeet");
    });

    it("falls back to entryPoints[].uri (video) when hangoutLink missing", async () => {
      eventsInsert.mockResolvedValueOnce({
        data: {
          id: "evt_2",
          conferenceData: {
            entryPoints: [
              { entryPointType: "more", uri: "https://meet.google.com/more" },
              { entryPointType: "video", uri: "https://meet.google.com/fallback" },
            ],
          },
        },
      });
      const { svc } = makeService();
      const result = await svc.createMeetLink("tut_1", {
        title: "x",
        startTime: new Date(),
        endTime: new Date(),
        attendeeEmails: [],
      });
      expect(result.meetingUrl).toBe("https://meet.google.com/fallback");
    });

    it("returns meetingUrl=null when Calendar omits both hangoutLink and entryPoints", async () => {
      eventsInsert.mockResolvedValueOnce({ data: { id: "evt_3" } });
      const { svc } = makeService();
      const result = await svc.createMeetLink("tut_1", {
        title: "x",
        startTime: new Date(),
        endTime: new Date(),
        attendeeEmails: [],
      });
      expect(result).toEqual({ meetingUrl: null, eventId: "evt_3" });
    });

    it("throws when Calendar returns no event id (data integrity)", async () => {
      eventsInsert.mockResolvedValueOnce({ data: {} });
      const { svc } = makeService();
      await expect(
        svc.createMeetLink("tut_1", {
          title: "x",
          startTime: new Date(),
          endTime: new Date(),
          attendeeEmails: [],
        }),
      ).rejects.toThrow(/no event id/);
    });
  });

  describe("deleteEvent", () => {
    it("calls events.delete with sendUpdates=all", async () => {
      eventsDelete.mockResolvedValueOnce({});
      const { svc } = makeService();
      await svc.deleteEvent("tut_1", "evt_42");
      expect(eventsDelete).toHaveBeenCalledWith({
        calendarId: "primary",
        eventId: "evt_42",
        sendUpdates: "all",
      });
    });

    it("swallows 4xx so postpone-confirm and regenerate stay unblocked", async () => {
      eventsDelete.mockRejectedValueOnce(new Error("404 Not Found"));
      const { svc } = makeService();
      await expect(svc.deleteEvent("tut_1", "evt_x")).resolves.toBeUndefined();
    });
  });
});
