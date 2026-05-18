import Papa from "papaparse";
import { tcasRoundSchema, type TcasRound } from "@peerahat/types";

import { parseComponentsDsl } from "./components-dsl";
import {
  type ParseResult,
  type ParseRowResult,
  type ParsedCriteriaRow,
  makeResult,
} from "./types";

// Columns expected in the header row. Order does not matter; we read by name.
const REQUIRED_HEADERS = [
  "university",
  "faculty",
  "major",
  "round",
  "admissionYear",
  "components",
] as const;

const OPTIONAL_HEADERS = [
  "campus",
  "subTrack",
  "programType",
  "courseCode",
  "quotaSeats",
  "gpaxMin",
  "totalMinScore",
  "sourceUrl",
] as const;

type Header =
  | (typeof REQUIRED_HEADERS)[number]
  | (typeof OPTIONAL_HEADERS)[number];

function cell(row: Record<string, unknown>, key: Header): string {
  const v = row[key];
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

function nullable(s: string): string | null {
  return s === "" ? null : s;
}

function intOrNull(s: string): number | null {
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) && Number.isInteger(n) ? n : NaN;
}

function floatOrNull(s: string): number | null {
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

export function parseCriteriaCsv(csv: string): ParseResult<ParsedCriteriaRow> {
  // Strip BOM (Excel saves UTF-8 CSVs with one). PapaParse handles quoted Thai
  // text fine, but a leading 0xFEFF would corrupt the first header name.
  const stripped = csv.replace(/^﻿/, "");

  // Permit a leading `#` comment row (used in the template to document the DSL).
  const lines = stripped.split(/\r?\n/);
  const commentStripped = lines
    .filter((line, idx) => !(idx === 0 && line.trimStart().startsWith("#")))
    .join("\n");

  const parsed = Papa.parse<Record<string, unknown>>(commentStripped, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim(),
  });

  const rows: ParseRowResult<ParsedCriteriaRow>[] = [];

  if (parsed.errors.length > 0) {
    const e = parsed.errors[0]!;
    rows.push({
      rowIndex: e.row ?? 0,
      ok: false,
      error: `CSV อ่านไม่ได้: ${e.message}`,
    });
    return makeResult(rows);
  }

  const headerSet = new Set((parsed.meta.fields ?? []).map((h) => h.trim()));
  for (const h of REQUIRED_HEADERS) {
    if (!headerSet.has(h)) {
      rows.push({
        rowIndex: 0,
        ok: false,
        error: `ไฟล์ขาดคอลัมน์ที่จำเป็น: ${h}`,
      });
      return makeResult(rows);
    }
  }

  parsed.data.forEach((raw, idx) => {
    // rowIndex is 1-based and points at the data row (after header), matching
    // what an editor would see in Excel.
    const rowIndex = idx + 2;
    const row = raw as Record<string, unknown>;

    const university = cell(row, "university");
    const faculty = cell(row, "faculty");
    const major = cell(row, "major");
    const roundRaw = cell(row, "round");
    const admissionYearRaw = cell(row, "admissionYear");
    const componentsRaw = cell(row, "components");

    if (!university || !faculty || !major) {
      rows.push({
        rowIndex,
        ok: false,
        error: "ขาด university, faculty หรือ major",
      });
      return;
    }

    const roundParse = tcasRoundSchema.safeParse(roundRaw);
    if (!roundParse.success) {
      rows.push({
        rowIndex,
        ok: false,
        error: `รอบ "${roundRaw}" ไม่ถูกต้อง (ต้องเป็น r1_portfolio | r2_quota_kku_netsat | r3_admission | r4_direct)`,
      });
      return;
    }
    const round: TcasRound = roundParse.data;

    const admissionYear = Number(admissionYearRaw);
    if (
      !Number.isFinite(admissionYear) ||
      !Number.isInteger(admissionYear) ||
      admissionYear < 2500 ||
      admissionYear > 2600
    ) {
      rows.push({
        rowIndex,
        ok: false,
        error: `admissionYear "${admissionYearRaw}" ต้องเป็นปี พ.ศ. (เช่น 2569)`,
      });
      return;
    }

    const quotaSeatsParsed = intOrNull(cell(row, "quotaSeats"));
    if (Number.isNaN(quotaSeatsParsed)) {
      rows.push({
        rowIndex,
        ok: false,
        error: "quotaSeats ต้องเป็นจำนวนเต็ม",
      });
      return;
    }

    const gpaxMinParsed = floatOrNull(cell(row, "gpaxMin"));
    if (Number.isNaN(gpaxMinParsed)) {
      rows.push({
        rowIndex,
        ok: false,
        error: "gpaxMin ต้องเป็นตัวเลข 0-4 หรือเว้นว่าง",
      });
      return;
    }
    if (gpaxMinParsed !== null && (gpaxMinParsed < 0 || gpaxMinParsed > 4)) {
      rows.push({ rowIndex, ok: false, error: "gpaxMin ต้องอยู่ในช่วง 0-4" });
      return;
    }

    const totalMinParsed = floatOrNull(cell(row, "totalMinScore"));
    if (Number.isNaN(totalMinParsed)) {
      rows.push({
        rowIndex,
        ok: false,
        error: "totalMinScore ต้องเป็นตัวเลขหรือเว้นว่าง",
      });
      return;
    }

    const dsl = parseComponentsDsl(componentsRaw, { gpaxMin: gpaxMinParsed });
    if (!dsl.ok) {
      rows.push({ rowIndex, ok: false, error: dsl.error });
      return;
    }

    rows.push({
      rowIndex,
      ok: true,
      data: {
        university,
        campus: nullable(cell(row, "campus")),
        faculty,
        major,
        subTrack: nullable(cell(row, "subTrack")),
        programType: nullable(cell(row, "programType")),
        courseCode: nullable(cell(row, "courseCode")),
        round,
        admissionYear,
        quotaSeats: quotaSeatsParsed ?? 0,
        components: dsl.components,
        totalMinScore: totalMinParsed,
        sourceUrl: nullable(cell(row, "sourceUrl")),
      },
    });
  });

  return makeResult(rows);
}
