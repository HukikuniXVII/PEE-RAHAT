import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { GoogleGenAI, type GenerateContentResponse } from "@google/genai";
import {
  programComponentsSchema,
  type ParsedProgramRow,
  type ProgramComponents,
  type TcasRound,
} from "@peerahat/types";

import {
  CRITERIA_EXTRACTION_PROMPT,
  CRITERIA_RESPONSE_SCHEMA,
} from "./prompts/criteria-extraction";

// ─── Config + pricing ────────────────────────────────────────────────────

const DEFAULT_PRIMARY_MODEL = "gemini-2.0-flash";
const DEFAULT_FALLBACK_MODEL = "gemini-2.5-pro";
const DEFAULT_MAX_PDF_PAGES = 20;
const DEFAULT_MAX_PDF_MB = 20;
// Default 180s — Gemini Flash-tier latency on a 7-page criteria PDF with
// ~140 programs hovers around 60-120s. Override via GEMINI_TIMEOUT_MS for
// slower keys or larger PDFs.
const DEFAULT_TIMEOUT_MS = 180_000;
const PARSE_TIMEOUT_MS = Number(
  process.env.GEMINI_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS,
);
const LOW_CONFIDENCE_THRESHOLD = 0.7;
const LOW_CONFIDENCE_FALLBACK_RATIO = 0.3;

// Per-million-token rates as of 2026-05. Two-decimal precision is fine —
// these power the admin dashboard's "AI usage this month" tile, not billing.
// Source: ai.google.dev/pricing (paid tier).
const MODEL_PRICING: Record<string, { inputPerM: number; outputPerM: number }> =
  {
    "gemini-2.0-flash": { inputPerM: 0.1, outputPerM: 0.4 },
    "gemini-2.5-pro": { inputPerM: 1.25, outputPerM: 5.0 },
    "gemini-2.5-flash": { inputPerM: 0.3, outputPerM: 2.5 },
    // Cheaper Flash variant. Free-tier keys often have allocation here
    // when 2.0-flash / 2.5-pro show limit:0 — it's the practical default
    // for development on free-tier API keys.
    "gemini-2.5-flash-lite": { inputPerM: 0.1, outputPerM: 0.4 },
  };

// ─── Public contract ─────────────────────────────────────────────────────

export interface ParseContext {
  university: string;
  round: TcasRound;
  admissionYear: number;
  sourceUrl?: string;
  allowFallback?: boolean;
}

export interface ParseResult {
  rows: ParsedProgramRow[];
  modelUsed: string;
  promptTokens: number;
  completionTokens: number;
  parseDurationMs: number;
  estimatedCostUsd: number;
}

@Injectable()
export class TcasAiParserService {
  private readonly logger = new Logger(TcasAiParserService.name);
  private readonly client: GoogleGenAI;
  private readonly primaryModel: string;
  private readonly fallbackModel: string;
  private readonly maxPdfPages: number;
  private readonly maxPdfBytes: number;
  private readonly enabled: boolean;

  constructor() {
    this.primaryModel =
      process.env.GEMINI_PRIMARY_MODEL ?? DEFAULT_PRIMARY_MODEL;
    this.fallbackModel =
      process.env.GEMINI_FALLBACK_MODEL ?? DEFAULT_FALLBACK_MODEL;
    this.maxPdfPages = Number(
      process.env.GEMINI_MAX_PDF_PAGES ?? DEFAULT_MAX_PDF_PAGES,
    );
    this.maxPdfBytes =
      Number(process.env.GEMINI_MAX_PDF_MB ?? DEFAULT_MAX_PDF_MB) * 1024 * 1024;
    this.enabled = process.env.TCAS_AI_IMPORT_ENABLED !== "false";
    // Construct the client even without a key — calls will fail at runtime
    // with a clearer message, and the kill-switch path tests skip the call.
    this.client = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY ?? "",
    });
  }

  async parsePdf(buffer: Buffer, ctx: ParseContext): Promise<ParseResult> {
    if (!this.enabled) {
      throw new ServiceUnavailableException(
        "AI importer ปิดอยู่ — ตั้งค่า TCAS_AI_IMPORT_ENABLED=true เพื่อเปิด",
      );
    }
    this.preflight(buffer);

    let result = await this.runOnce(this.primaryModel, buffer, ctx);

    if (ctx.allowFallback !== false && this.shouldFallback(result.rows)) {
      this.logger.log(
        `Low-confidence ratio above threshold — reparsing with ${this.fallbackModel}`,
      );
      result = await this.runOnce(this.fallbackModel, buffer, ctx);
    }

    return result;
  }

  /** Same model, no fallback — for the dedicated /reparse endpoint. */
  async reparseWith(
    model: string,
    buffer: Buffer,
    ctx: ParseContext,
  ): Promise<ParseResult> {
    if (!this.enabled) {
      throw new ServiceUnavailableException("AI importer ปิดอยู่");
    }
    this.preflight(buffer);
    return this.runOnce(model, buffer, ctx);
  }

  // ─── Internal helpers ─────────────────────────────────────────────────

  private preflight(buffer: Buffer): void {
    if (buffer.length > this.maxPdfBytes) {
      throw new BadRequestException(
        `ไฟล์ใหญ่เกิน ${(this.maxPdfBytes / 1024 / 1024).toFixed(0)} MB`,
      );
    }
    const pageCount = countPdfPages(buffer);
    if (pageCount > this.maxPdfPages) {
      throw new BadRequestException(
        `PDF มี ${pageCount} หน้า — เกินขีดจำกัด ${this.maxPdfPages} หน้า`,
      );
    }
  }

  private shouldFallback(rows: ParsedProgramRow[]): boolean {
    if (rows.length === 0) return false;
    const lowConfCount = rows.filter(
      (r) => r.confidence < LOW_CONFIDENCE_THRESHOLD,
    ).length;
    return lowConfCount / rows.length > LOW_CONFIDENCE_FALLBACK_RATIO;
  }

  private async runOnce(
    model: string,
    buffer: Buffer,
    ctx: ParseContext,
  ): Promise<ParseResult> {
    const started = Date.now();
    let response: GenerateContentResponse;
    try {
      response = await this.callGemini(model, buffer, ctx);
    } catch (err) {
      throw this.mapError(err);
    }
    const durationMs = Date.now() - started;

    const text = response.text?.trim() ?? "";
    if (!text) {
      throw new BadRequestException("AI คืนค่าว่าง — ลองรีพาร์สอีกครั้ง");
    }
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch (err) {
      this.logger.warn(`AI returned invalid JSON (${(err as Error).message})`);
      throw new BadRequestException("AI ตอบกลับไม่ใช่ JSON ที่ถูกต้อง");
    }
    if (!Array.isArray(raw)) {
      throw new BadRequestException("AI ต้องคืน array ของรายการ");
    }

    const rows: ParsedProgramRow[] = raw.map((entry, i) =>
      this.toRow(entry, i),
    );

    const promptTokens = response.usageMetadata?.promptTokenCount ?? 0;
    const completionTokens =
      response.usageMetadata?.candidatesTokenCount ?? 0;
    const estimatedCostUsd = costFor(
      model,
      promptTokens,
      completionTokens,
    );

    return {
      rows,
      modelUsed: model,
      promptTokens,
      completionTokens,
      parseDurationMs: durationMs,
      estimatedCostUsd,
    };
  }

  /** Wrapped so the spec can replace it via jest's prototype-spy pattern. */
  protected async callGemini(
    model: string,
    buffer: Buffer,
    ctx: ParseContext,
  ): Promise<GenerateContentResponse> {
    const data = buffer.toString("base64");
    const userText = [
      `University (preset): ${ctx.university}`,
      `Round: ${ctx.round}`,
      `Admission year (BE): ${ctx.admissionYear}`,
      ctx.sourceUrl ? `Source URL: ${ctx.sourceUrl}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PARSE_TIMEOUT_MS);
    try {
      return await this.client.models.generateContent({
        model,
        contents: [
          {
            role: "user",
            parts: [
              { inlineData: { mimeType: "application/pdf", data } },
              { text: userText },
            ],
          },
        ],
        config: {
          systemInstruction: CRITERIA_EXTRACTION_PROMPT,
          responseMimeType: "application/json",
          responseSchema: CRITERIA_RESPONSE_SCHEMA,
          temperature: 0.1,
          abortSignal: controller.signal,
        },
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // Normalize one LLM entry into a typed row. zod validates the components
  // shape (the responseSchema can't fully express the discriminated union),
  // and a failure demotes confidence so the admin sees it in red.
  private toRow(raw: unknown, idx: number): ParsedProgramRow {
    const entry = (raw ?? {}) as Record<string, unknown>;
    const examsRaw = Array.isArray(entry.exams) ? entry.exams : [];
    const candidate: ProgramComponents = {
      gpaxMin: numOrNull(entry.gpaxMin),
      // Backfill missing string fields on single components — Gemini will
      // occasionally drop `code` or `name`. Empty strings are valid for
      // zod and let the admin fix the row in the UI rather than losing it.
      exams: examsRaw.map((c) =>
        normalizeComponent(c),
      ) as ProgramComponents["exams"],
    };
    const parsed = programComponentsSchema.safeParse(candidate);
    let confidence =
      typeof entry.confidence === "number" ? entry.confidence : 0;
    let notes = typeof entry.notes === "string" ? entry.notes : null;
    let components: ProgramComponents = candidate;
    if (parsed.success) {
      components = parsed.data;
    } else {
      const message = parsed.error.issues
        .slice(0, 3)
        .map((i) => i.message)
        .join("; ");
      confidence = Math.min(confidence, 0.3);
      notes = notes
        ? `${notes} | Schema: ${message}`
        : `Schema: ${message}`;
      this.logger.debug(
        `row ${idx} failed zod: ${message} — confidence demoted to ${confidence}`,
      );
    }

    return {
      orderNumber: intOrNull(entry.orderNumber),
      faculty: typeof entry.faculty === "string" ? entry.faculty : "",
      major: typeof entry.major === "string" ? entry.major : "",
      subTrack: strOrNull(entry.subTrack),
      programType: strOrNull(entry.programType),
      quotaSeats: intOrNull(entry.quotaSeats),
      components,
      totalMinScore: numOrNull(entry.totalMinScore),
      confidence: clamp01(confidence),
      notes,
    };
  }

  private mapError(err: unknown): Error {
    const message = (err as Error)?.message ?? String(err);
    const lower = message.toLowerCase();
    const status = (err as { status?: number }).status;
    if (status === 429 || /rate.?limit|quota|resource_exhausted/.test(lower)) {
      return new ServiceUnavailableException(
        "เกินโควต้า AI วันนี้ — ลองอีกครั้งภายหลังหรือใช้ CSV",
      );
    }
    if (status === 400 || /invalid|cannot.*read|malformed/.test(lower)) {
      return new BadRequestException(`AI อ่าน PDF ไม่ได้ — ${message}`);
    }
    if (/abort|timeout/.test(lower)) {
      return new BadRequestException(
        `AI parse เกินเวลา ${PARSE_TIMEOUT_MS / 1000}s`,
      );
    }
    this.logger.error(`Unexpected Gemini error: ${message}`);
    return new ServiceUnavailableException(
      "AI ไม่ตอบ — ลองอีกครั้งภายหลัง",
    );
  }
}

// ─── Free functions exported for the spec ────────────────────────────────

export function countPdfPages(buffer: Buffer): number {
  // Each page object declares `/Type /Page` (or `/Type/Page`). The catalog
  // root is `/Type /Pages` — note the trailing `s`. The negative lookahead
  // skips it. This is approximate but matches every standard PDF we've seen.
  const text = buffer.toString("latin1");
  const matches = text.match(/\/Type\s*\/Page(?![a-zA-Z])/g);
  return matches?.length ?? 0;
}

export function costFor(
  model: string,
  promptTokens: number,
  completionTokens: number,
): number {
  const rates = MODEL_PRICING[model];
  if (!rates) return 0;
  const usd =
    (promptTokens * rates.inputPerM) / 1_000_000 +
    (completionTokens * rates.outputPerM) / 1_000_000;
  return Number(usd.toFixed(6));
}

// Repair a component as it came off the wire from Gemini. The LLM
// sometimes drops code/name/system on single components (despite the
// prompt's CRITICAL note); we fill them with "" so the row survives
// the per-row zod gate and lands in the admin's review screen rather
// than getting dumped wholesale.
function normalizeComponent(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object") return {};
  const c = raw as Record<string, unknown>;
  if (c.type === "single") {
    return {
      type: "single",
      system: typeof c.system === "string" ? c.system : "aLevel",
      code: typeof c.code === "string" ? c.code : "",
      name: typeof c.name === "string" ? c.name : "",
      weight: typeof c.weight === "number" ? c.weight : 0,
      min: numOrNull(c.min),
    };
  }
  if (c.type === "chooseHighest") {
    const options = Array.isArray(c.options) ? c.options : [];
    return {
      type: "chooseHighest",
      weight: typeof c.weight === "number" ? c.weight : 0,
      min: numOrNull(c.min),
      options: options.map((o) => {
        const opt = (o ?? {}) as Record<string, unknown>;
        return {
          system: typeof opt.system === "string" ? opt.system : "aLevel",
          code: typeof opt.code === "string" ? opt.code : "",
          name: typeof opt.name === "string" ? opt.name : "",
        };
      }),
    };
  }
  // Unknown type — pass through; zod will reject and demote confidence.
  return c;
}

function numOrNull(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return v;
}
function intOrNull(v: unknown): number | null {
  const n = numOrNull(v);
  return n === null ? null : Math.trunc(n);
}
function strOrNull(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}
function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}
