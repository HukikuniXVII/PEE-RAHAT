import { ZercleSlipService } from "./zercle-slip.service";
import type { ZercleSlipApiResponse } from "./zercle-slip.types";

function makeService(opts: {
  slipBytes?: string;
  callApi?: () => Promise<ZercleSlipApiResponse>;
  existingTransactionId?: string | null;
}) {
  const storage = {
    signDownload: jest.fn(async (_key: string) => ({ url: "https://stub/slip" })),
  };
  // Mock global fetch for the slip download — we only care that the URL
  // round-trips into base64; tests bypass callApi via the protected hook.
  const originalFetch = global.fetch;
  global.fetch = jest.fn(async () => ({
    ok: true,
    arrayBuffer: async () => Buffer.from(opts.slipBytes ?? "stub-bytes"),
  })) as unknown as typeof fetch;
  const prisma = {
    paymentIntent: {
      findFirst: jest.fn(async () =>
        opts.existingTransactionId ? { id: "pi_existing" } : null,
      ),
    },
  };
  const svc = new ZercleSlipService(storage as never, prisma as never);
  if (opts.callApi) {
    // The real impl awaits ZercleSlip docs; tests override the private hook
    // to focus on the business-rules layer.
    (svc as unknown as { callApi: () => Promise<ZercleSlipApiResponse> }).callApi =
      opts.callApi;
  }
  return {
    svc,
    storage,
    prisma,
    restoreFetch: () => {
      global.fetch = originalFetch;
    },
  };
}

const baseResponse: ZercleSlipApiResponse = {
  success: true,
  amount: 400,
  transactionId: "txn_abc_123",
  transferDate: new Date().toISOString(),
  recipient: { accountNumber: "1234567890", bank: "SCB" },
  sender: { accountNumber: "9999999999", bank: "KBank" },
};

describe("ZercleSlipService (FR-PM-02)", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.ZERCLE_SLIP_ENABLED = "true";
    process.env.ZERCLE_SLIP_API_KEY = "test-key";
    process.env.ZERCLE_SLIP_API_URL = "https://stub.zercle.local";
  });
  afterAll(() => {
    process.env = originalEnv;
  });

  describe("disabled mode", () => {
    it("ZERCLE_SLIP_ENABLED=false returns ok:false without touching storage or API", async () => {
      process.env.ZERCLE_SLIP_ENABLED = "false";
      const { svc, storage, restoreFetch } = makeService({});
      try {
        const out = await svc.verify({
          slipObjectKey: "slips/foo.png",
          expectedAmountThb: 400,
        });
        expect(out.ok).toBe(false);
        if (!out.ok) {
          expect(out.reason).toMatch(/disabled/);
          expect(out.raw).toBeNull();
        }
        expect(storage.signDownload).not.toHaveBeenCalled();
      } finally {
        restoreFetch();
      }
    });
  });

  describe("happy path", () => {
    it("passes amount + recipient + dedupe → returns transactionId + amountThb", async () => {
      process.env.ZERCLE_PLATFORM_ACCOUNT_NUMBER = "1234567890";
      const { svc, restoreFetch } = makeService({
        callApi: async () => baseResponse,
      });
      try {
        const out = await svc.verify({
          slipObjectKey: "slips/foo.png",
          expectedAmountThb: 400,
        });
        expect(out).toEqual({
          ok: true,
          transactionId: "txn_abc_123",
          amountThb: 400,
          raw: baseResponse,
        });
      } finally {
        restoreFetch();
      }
    });
  });

  describe("rejection paths", () => {
    it("rejects when API success=false", async () => {
      const { svc, restoreFetch } = makeService({
        callApi: async () => ({ success: false, failureReason: "OCR illegible" }),
      });
      try {
        const out = await svc.verify({
          slipObjectKey: "slips/foo.png",
          expectedAmountThb: 400,
        });
        expect(out.ok).toBe(false);
        if (!out.ok) expect(out.reason).toBe("OCR illegible");
      } finally {
        restoreFetch();
      }
    });

    it("rejects on amount mismatch (underpayment)", async () => {
      const { svc, restoreFetch } = makeService({
        callApi: async () => ({ ...baseResponse, amount: 399 }),
      });
      try {
        const out = await svc.verify({
          slipObjectKey: "slips/foo.png",
          expectedAmountThb: 400,
        });
        expect(out.ok).toBe(false);
        if (!out.ok) expect(out.reason).toMatch(/Amount mismatch/);
      } finally {
        restoreFetch();
      }
    });

    it("rejects on recipient mismatch when ZERCLE_PLATFORM_ACCOUNT_NUMBER set", async () => {
      process.env.ZERCLE_PLATFORM_ACCOUNT_NUMBER = "0000000001";
      const { svc, restoreFetch } = makeService({
        callApi: async () => baseResponse,
      });
      try {
        const out = await svc.verify({
          slipObjectKey: "slips/foo.png",
          expectedAmountThb: 400,
        });
        expect(out.ok).toBe(false);
        if (!out.ok) expect(out.reason).toMatch(/Recipient mismatch/);
      } finally {
        restoreFetch();
      }
    });

    it("rejects when transferDate is older than 24h", async () => {
      const oldDate = new Date(Date.now() - 30 * 60 * 60_000).toISOString();
      const { svc, restoreFetch } = makeService({
        callApi: async () => ({ ...baseResponse, transferDate: oldDate }),
      });
      try {
        const out = await svc.verify({
          slipObjectKey: "slips/foo.png",
          expectedAmountThb: 400,
        });
        expect(out.ok).toBe(false);
        if (!out.ok) expect(out.reason).toMatch(/older than 24h/);
      } finally {
        restoreFetch();
      }
    });

    it("rejects duplicate transactionId with duplicate:true flag", async () => {
      const { svc, restoreFetch } = makeService({
        callApi: async () => baseResponse,
        existingTransactionId: "txn_abc_123",
      });
      try {
        const out = await svc.verify({
          slipObjectKey: "slips/foo.png",
          expectedAmountThb: 400,
        });
        expect(out.ok).toBe(false);
        if (!out.ok) {
          expect(out.duplicate).toBe(true);
          expect(out.reason).toMatch(/Duplicate slip/);
        }
      } finally {
        restoreFetch();
      }
    });

    it("rejects when API returns no transactionId (can't dedupe)", async () => {
      const { svc, restoreFetch } = makeService({
        callApi: async () => ({ ...baseResponse, transactionId: undefined }),
      });
      try {
        const out = await svc.verify({
          slipObjectKey: "slips/foo.png",
          expectedAmountThb: 400,
        });
        expect(out.ok).toBe(false);
        if (!out.ok) expect(out.reason).toMatch(/no transactionId/);
      } finally {
        restoreFetch();
      }
    });
  });
});
