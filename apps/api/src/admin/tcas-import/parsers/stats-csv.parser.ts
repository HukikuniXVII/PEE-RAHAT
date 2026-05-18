import Papa from "papaparse";
import { tcasRoundSchema, type TcasRound } from "@peerahat/types";

import {
  type ParseResult,
  type ParseRowResult,
  type ParsedStatsRow,
  makeResult,
} from "./types";

// Required for both CSV and XLSX paths. passedRound1/2 are NOT required —
// CUPT's TCAS68 r3_1 layout publishes only a single "ผ่าน" column.
const REQUIRED = [
  "courseCode",
  "university",
  "faculty",
  "major",
  "year",
  "round",
  "quotaSeats",
  "applicants",
] as const;

function cell(row: Record<string, unknown>, key: string): string {
  const v = row[key];
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

// CUPT exports numbers as comma-separated strings ("1,417"). Strip them
// before Number() to avoid NaN on otherwise-valid input.
function stripCommas(s: string): string {
  return s.replace(/,/g, "");
}

function intOrNull(s: string): number | null | typeof BAD {
  const clean = stripCommas(s);
  if (clean === "") return null;
  const n = Number(clean);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return BAD;
  return n;
}

function requiredInt(s: string): number | typeof BAD {
  const clean = stripCommas(s);
  if (clean === "") return BAD;
  const n = Number(clean);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return BAD;
  return n;
}

function floatOrNull(s: string): number | null | typeof BAD {
  const clean = stripCommas(s);
  if (clean === "") return null;
  const n = Number(clean);
  if (!Number.isFinite(n)) return BAD;
  return n;
}

const BAD = Symbol("BAD");

export function parseStatsCsv(csv: string): ParseResult<ParsedStatsRow> {
  const stripped = csv.replace(/^﻿/, "");
  const parsed = Papa.parse<Record<string, unknown>>(stripped, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim(),
  });

  const rows: ParseRowResult<ParsedStatsRow>[] = [];

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
  for (const h of REQUIRED) {
    if (!headerSet.has(h)) {
      rows.push({ rowIndex: 0, ok: false, error: `ไฟล์ขาดคอลัมน์: ${h}` });
      return makeResult(rows);
    }
  }

  parsed.data.forEach((raw, idx) => {
    const rowIndex = idx + 2;
    const row = raw as Record<string, unknown>;
    const result = parseRow(row, rowIndex);
    rows.push(result);
  });

  return makeResult(rows);
}

// Shared row → result so the xlsx parser can reuse the same validation.
export function parseStatsRow(
  row: Record<string, unknown>,
  rowIndex: number,
): ParseRowResult<ParsedStatsRow> {
  return parseRow(row, rowIndex);
}

function parseRow(
  row: Record<string, unknown>,
  rowIndex: number,
): ParseRowResult<ParsedStatsRow> {
  const courseCode = cell(row, "courseCode");
  const university = cell(row, "university");
  const faculty = cell(row, "faculty");
  const major = cell(row, "major");
  if (!courseCode || !university || !faculty || !major) {
    return {
      rowIndex,
      ok: false,
      error: "ขาด courseCode, university, faculty หรือ major",
    };
  }

  const year = requiredInt(cell(row, "year"));
  if (year === BAD || year < 2500 || year > 2600) {
    return {
      rowIndex,
      ok: false,
      error: `year "${cell(row, "year")}" ต้องเป็นปี พ.ศ.`,
    };
  }

  const roundRaw = cell(row, "round");
  const roundParse = tcasRoundSchema.safeParse(roundRaw);
  if (!roundParse.success) {
    return {
      rowIndex,
      ok: false,
      error: `round "${roundRaw}" ไม่ถูกต้อง`,
    };
  }
  const round: TcasRound = roundParse.data;

  // CUPT sometimes ships rows where รับ/สมัคร are blank — accept them as
  // null and let the operator decide at preview time.
  const quotaSeats = intOrNull(cell(row, "quotaSeats"));
  const applicants = intOrNull(cell(row, "applicants"));
  if (quotaSeats === BAD || applicants === BAD) {
    return {
      rowIndex,
      ok: false,
      error: "quotaSeats / applicants ต้องเป็นจำนวนเต็มหรือเว้นว่าง",
    };
  }
  const passedRound1 = intOrNull(cell(row, "passedRound1"));
  const passedRound2 = intOrNull(cell(row, "passedRound2"));
  if (passedRound1 === BAD || passedRound2 === BAD) {
    return {
      rowIndex,
      ok: false,
      error: "passedRound1 / passedRound2 ต้องเป็นจำนวนเต็มหรือเว้นว่าง",
    };
  }

  const max1 = floatOrNull(cell(row, "maxScoreR1"));
  const min1 = floatOrNull(cell(row, "minScoreR1"));
  const max2 = floatOrNull(cell(row, "maxScoreR2"));
  const min2 = floatOrNull(cell(row, "minScoreR2"));
  if (max1 === BAD || min1 === BAD || max2 === BAD || min2 === BAD) {
    return {
      rowIndex,
      ok: false,
      error: "max/minScoreR* ต้องเป็นตัวเลขหรือเว้นว่าง",
    };
  }

  return {
    rowIndex,
    ok: true,
    data: {
      courseCode,
      university,
      campus: cell(row, "campus") || null,
      faculty,
      major,
      subTrack: cell(row, "subTrack") || null,
      jointCode: cell(row, "jointCode") || null,
      year,
      round,
      quotaSeats,
      applicants,
      passedRound1,
      passedRound2,
      maxScoreR1: max1,
      minScoreR1: min1,
      maxScoreR2: max2,
      minScoreR2: min2,
    },
  };
}
