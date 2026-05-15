import { ClassStartQueue } from "./class-start.queue";

describe("ClassStartQueue.handle (FR-TH-17)", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });
  afterAll(() => {
    process.env = originalEnv;
  });

  type GoogleMeetMock = {
    isEnabled: jest.Mock<boolean, []>;
    createForBooking: jest.Mock<Promise<unknown>, [string]>;
    postFallbackMessage: jest.Mock<Promise<void>, [string]>;
  };

  function setup(booking: { status: string } | null) {
    const prisma = {
      booking: { findUnique: jest.fn(async () => booking) },
    };
    const googleMeet: GoogleMeetMock = {
      isEnabled: jest.fn(() => true),
      createForBooking: jest.fn(async (_id: string) => ({})),
      postFallbackMessage: jest.fn(async (_id: string) => undefined),
    };
    const q = new ClassStartQueue(googleMeet as never, prisma as never);
    return { q, prisma, googleMeet };
  }

  it("skips when booking not found", async () => {
    const { q, googleMeet } = setup(null);
    await q.handle("missing");
    expect(googleMeet.createForBooking).not.toHaveBeenCalled();
    expect(googleMeet.postFallbackMessage).not.toHaveBeenCalled();
  });

  it("skips when booking status drifted off 'paid' (refunded mid-delay)", async () => {
    const { q, googleMeet } = setup({ status: "refunded" });
    await q.handle("bk_1");
    expect(googleMeet.createForBooking).not.toHaveBeenCalled();
    expect(googleMeet.postFallbackMessage).not.toHaveBeenCalled();
  });

  it("calls createForBooking when paid and enabled", async () => {
    const { q, googleMeet } = setup({ status: "paid" });
    googleMeet.isEnabled.mockReturnValue(true);
    await q.handle("bk_1");
    expect(googleMeet.createForBooking).toHaveBeenCalledWith("bk_1");
    expect(googleMeet.postFallbackMessage).not.toHaveBeenCalled();
  });

  it("calls postFallbackMessage when paid but disabled", async () => {
    const { q, googleMeet } = setup({ status: "paid" });
    googleMeet.isEnabled.mockReturnValue(false);
    await q.handle("bk_1");
    expect(googleMeet.createForBooking).not.toHaveBeenCalled();
    expect(googleMeet.postFallbackMessage).toHaveBeenCalledWith("bk_1");
  });
});
