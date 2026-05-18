import {
  BadRequestException,
  ServiceUnavailableException,
} from "@nestjs/common";
import type { GenerateContentResponse } from "@google/genai";

import {
  TcasAiParserService,
  countPdfPages,
  costFor,
} from "./tcas-ai-parser.service";

// Build a minimum-viable PDF byte sequence with N page objects. The parser's
// page counter is a regex over the raw bytes, so we don't need a real PDF —
// just the marker tokens it scans for.
function fakePdfBytes(pageCount: number): Buffer {
  const header = "%PDF-1.4\n";
  const pages = Array.from(
    { length: pageCount },
    (_, i) => `1 ${i} obj\n<< /Type /Page >>\nendobj\n`,
  ).join("");
  const catalog = "2 0 obj\n<< /Type /Pages /Count " + pageCount + " >>\nendobj\n";
  const trailer = "\n%%EOF\n";
  return Buffer.from(header + pages + catalog + trailer);
}

function fakeResponse(opts: {
  rows: unknown[];
  promptTokens?: number;
  completionTokens?: number;
}): GenerateContentResponse {
  return {
    text: JSON.stringify(opts.rows),
    usageMetadata: {
      promptTokenCount: opts.promptTokens ?? 1000,
      candidatesTokenCount: opts.completionTokens ?? 500,
      totalTokenCount: (opts.promptTokens ?? 1000) + (opts.completionTokens ?? 500),
    },
  } as unknown as GenerateContentResponse;
}

const goodRow = {
  orderNumber: 1,
  faculty: "คณะวิศวกรรมศาสตร์",
  major: "วิศวกรรมคอมพิวเตอร์",
  subTrack: null,
  programType: null,
  quotaSeats: 80,
  gpaxMin: null,
  totalMinScore: 60,
  exams: [
    {
      type: "single",
      system: "tgat",
      code: "",
      name: "TGAT",
      weight: 20,
      min: null,
    },
    {
      type: "single",
      system: "tpat",
      code: "30",
      name: "TPAT 3",
      weight: 30,
      min: null,
    },
    {
      type: "single",
      system: "aLevel",
      code: "61",
      name: "คณิตศาสตร์ประยุกต์ 1",
      weight: 50,
      min: null,
    },
  ],
  confidence: 0.9,
  notes: null,
};

describe("TcasAiParserService", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Placeholder key keeps the SDK quiet during constructor — we never
    // actually call it because the spec spies on callGemini.
    process.env = {
      ...originalEnv,
      TCAS_AI_IMPORT_ENABLED: "true",
      GEMINI_API_KEY: "test-placeholder-key",
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("kill-switch", () => {
    it("rejects with 503 when TCAS_AI_IMPORT_ENABLED is false", async () => {
      process.env.TCAS_AI_IMPORT_ENABLED = "false";
      const svc = new TcasAiParserService();
      await expect(
        svc.parsePdf(fakePdfBytes(2), {
          university: "U",
          round: "r3_admission",
          admissionYear: 2569,
        }),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });
  });

  describe("preflight", () => {
    it("rejects oversized PDFs", async () => {
      process.env.GEMINI_MAX_PDF_MB = "1";
      const svc = new TcasAiParserService();
      const tooBig = Buffer.alloc(2 * 1024 * 1024); // 2 MB
      await expect(
        svc.parsePdf(tooBig, {
          university: "U",
          round: "r3_admission",
          admissionYear: 2569,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("rejects PDFs with too many pages", async () => {
      process.env.GEMINI_MAX_PDF_PAGES = "5";
      const svc = new TcasAiParserService();
      await expect(
        svc.parsePdf(fakePdfBytes(10), {
          university: "U",
          round: "r3_admission",
          admissionYear: 2569,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe("happy path", () => {
    it("returns parsed rows + token + cost metadata", async () => {
      const svc = new TcasAiParserService();
      jest
        .spyOn(svc as never as { callGemini: () => Promise<unknown> }, "callGemini")
        .mockResolvedValue(
          fakeResponse({
            rows: [goodRow],
            promptTokens: 2000,
            completionTokens: 800,
          }),
        );
      const result = await svc.parsePdf(fakePdfBytes(2), {
        university: "จุฬาฯ",
        round: "r3_admission",
        admissionYear: 2569,
      });
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]?.faculty).toBe("คณะวิศวกรรมศาสตร์");
      expect(result.rows[0]?.confidence).toBeCloseTo(0.9);
      expect(result.modelUsed).toBe("gemini-2.0-flash");
      expect(result.promptTokens).toBe(2000);
      expect(result.completionTokens).toBe(800);
      // 2000 * 0.10/M + 800 * 0.40/M = 0.0002 + 0.00032 = 0.00052
      expect(result.estimatedCostUsd).toBeCloseTo(0.00052, 5);
    });
  });

  describe("fallback model", () => {
    it("reparses with fallback when >30% of rows are low-confidence", async () => {
      const svc = new TcasAiParserService();
      const lowConfRow = { ...goodRow, confidence: 0.4 };
      const spy = jest
        .spyOn(svc as never as { callGemini: () => Promise<unknown> }, "callGemini")
        .mockResolvedValueOnce(
          fakeResponse({ rows: [goodRow, lowConfRow, lowConfRow] }),
        )
        .mockResolvedValueOnce(
          fakeResponse({ rows: [goodRow, goodRow, goodRow] }),
        );
      const result = await svc.parsePdf(fakePdfBytes(2), {
        university: "U",
        round: "r3_admission",
        admissionYear: 2569,
      });
      expect(spy).toHaveBeenCalledTimes(2);
      expect(result.modelUsed).toBe("gemini-2.5-pro");
    });

    it("skips fallback when allowFallback=false even with low confidence", async () => {
      const svc = new TcasAiParserService();
      const lowConfRow = { ...goodRow, confidence: 0.4 };
      const spy = jest
        .spyOn(svc as never as { callGemini: () => Promise<unknown> }, "callGemini")
        .mockResolvedValue(
          fakeResponse({ rows: [lowConfRow, lowConfRow, lowConfRow] }),
        );
      const result = await svc.parsePdf(fakePdfBytes(2), {
        university: "U",
        round: "r3_admission",
        admissionYear: 2569,
        allowFallback: false,
      });
      expect(spy).toHaveBeenCalledTimes(1);
      expect(result.modelUsed).toBe("gemini-2.0-flash");
    });
  });

  describe("error mapping", () => {
    it("maps 429 to ServiceUnavailable with Thai message", async () => {
      const svc = new TcasAiParserService();
      jest
        .spyOn(svc as never as { callGemini: () => Promise<unknown> }, "callGemini")
        .mockRejectedValue(
          Object.assign(new Error("Rate limit hit"), { status: 429 }),
        );
      const promise = svc.parsePdf(fakePdfBytes(2), {
        university: "U",
        round: "r3_admission",
        admissionYear: 2569,
      });
      await expect(promise).rejects.toBeInstanceOf(ServiceUnavailableException);
      await expect(promise).rejects.toMatchObject({
        message: expect.stringContaining("เกินโควต้า"),
      });
    });

    it("maps 400 invalid-PDF to BadRequest", async () => {
      const svc = new TcasAiParserService();
      jest
        .spyOn(svc as never as { callGemini: () => Promise<unknown> }, "callGemini")
        .mockRejectedValue(
          Object.assign(new Error("Invalid file format"), { status: 400 }),
        );
      await expect(
        svc.parsePdf(fakePdfBytes(2), {
          university: "U",
          round: "r3_admission",
          admissionYear: 2569,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe("zod re-validation", () => {
    it("demotes confidence on rows whose components don't sum to 100", async () => {
      const svc = new TcasAiParserService();
      const badSumRow = {
        ...goodRow,
        exams: [
          {
            type: "single",
            system: "tgat",
            code: "",
            name: "TGAT",
            weight: 40,
            min: null,
          },
          {
            type: "single",
            system: "tpat",
            code: "30",
            name: "TPAT 3",
            weight: 40,
            min: null,
          },
          // sum = 80, not 100 → zod's refine fails
        ],
        confidence: 0.9,
        notes: null,
      };
      jest
        .spyOn(svc as never as { callGemini: () => Promise<unknown> }, "callGemini")
        .mockResolvedValue(
          fakeResponse({ rows: [badSumRow], promptTokens: 1, completionTokens: 1 }),
        );
      const result = await svc.parsePdf(fakePdfBytes(2), {
        university: "U",
        round: "r3_admission",
        admissionYear: 2569,
        allowFallback: false,
      });
      expect(result.rows[0]?.confidence).toBeLessThanOrEqual(0.3);
      expect(result.rows[0]?.notes).toContain("Schema");
    });

    it("preserves a valid chooseHighest group through zod", async () => {
      const svc = new TcasAiParserService();
      const chooseRow = {
        ...goodRow,
        exams: [
          {
            type: "single",
            system: "tgat",
            code: "",
            name: "TGAT",
            weight: 20,
            min: null,
          },
          {
            type: "chooseHighest",
            weight: 80,
            min: null,
            options: [
              { system: "aLevel", code: "61", name: "Math1" },
              { system: "aLevel", code: "64", name: "Physics" },
            ],
          },
        ],
        confidence: 0.55,
      };
      jest
        .spyOn(svc as never as { callGemini: () => Promise<unknown> }, "callGemini")
        .mockResolvedValue(fakeResponse({ rows: [chooseRow] }));
      const result = await svc.parsePdf(fakePdfBytes(2), {
        university: "U",
        round: "r3_admission",
        admissionYear: 2569,
        allowFallback: false,
      });
      expect(result.rows[0]?.confidence).toBeCloseTo(0.55);
      expect(result.rows[0]?.components.exams).toHaveLength(2);
      expect(result.rows[0]?.components.exams[1]?.type).toBe("chooseHighest");
    });
  });

  describe("invalid LLM output", () => {
    it("400s when AI returns non-JSON text", async () => {
      const svc = new TcasAiParserService();
      jest
        .spyOn(svc as never as { callGemini: () => Promise<unknown> }, "callGemini")
        .mockResolvedValue({
          text: "I cannot do that.",
          usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1 },
        } as unknown as GenerateContentResponse);
      await expect(
        svc.parsePdf(fakePdfBytes(2), {
          university: "U",
          round: "r3_admission",
          admissionYear: 2569,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("400s when AI returns an object instead of an array", async () => {
      const svc = new TcasAiParserService();
      jest
        .spyOn(svc as never as { callGemini: () => Promise<unknown> }, "callGemini")
        .mockResolvedValue(
          fakeResponse({
            rows: [],
          }),
        );
      // Replace the array with an object via a custom mock.
      jest
        .spyOn(svc as never as { callGemini: () => Promise<unknown> }, "callGemini")
        .mockResolvedValue({
          text: '{"not": "an array"}',
          usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1 },
        } as unknown as GenerateContentResponse);
      await expect(
        svc.parsePdf(fakePdfBytes(2), {
          university: "U",
          round: "r3_admission",
          admissionYear: 2569,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});

describe("countPdfPages", () => {
  it("counts /Type /Page entries while skipping /Type /Pages", () => {
    const bytes = Buffer.from(
      "%PDF-1.4\n" +
        "1 0 obj << /Type /Pages /Count 3 >> endobj\n" +
        "2 0 obj << /Type /Page >> endobj\n" +
        "3 0 obj << /Type/Page >> endobj\n" +
        "4 0 obj << /Type /Page>> endobj\n",
    );
    expect(countPdfPages(bytes)).toBe(3);
  });

  it("returns 0 on a non-PDF buffer", () => {
    expect(countPdfPages(Buffer.from("hello world"))).toBe(0);
  });
});

describe("costFor", () => {
  it("uses Flash pricing for gemini-2.0-flash", () => {
    expect(costFor("gemini-2.0-flash", 1_000_000, 1_000_000)).toBeCloseTo(
      0.5,
      6,
    );
  });

  it("uses Pro pricing for gemini-2.5-pro", () => {
    expect(costFor("gemini-2.5-pro", 1_000_000, 1_000_000)).toBeCloseTo(
      6.25,
      6,
    );
  });

  it("returns 0 for unknown models (defensive)", () => {
    expect(costFor("gemini-unknown", 1_000_000, 1_000_000)).toBe(0);
  });
});
