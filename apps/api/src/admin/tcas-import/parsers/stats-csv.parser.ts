import Papa from "papaparse";
import { tcasRoundSchema, type TcasRound } from "@peerahat/types";

import {
  type ParseResult,
  type ParseRowResult,
  type ParsedStatsRow,
  makeResult,
} from "./types";

const REQUIRED = [
  "courseCode",
  "university",
  "faculty",
  "major",
  "year",
  "round",
  "quotaSeats",
  "applicants",
  "passedRound1",
  "passedRound2",
] as const;

function cell(row: Record<string, unknown>, key: string): string {
  const v = row[key];
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

function intOrZero(s: string): number | null {
  if (s === "") return 0;
  const n = Number(s);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return null;
  return n;
}

function floatOrNull(s: string): number | null {
  if (s === "") return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return NaN;
  return n;
}

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

  const year = Number(cell(row, "year"));
  if (!Number.isInteger(year) || year < 2500 || year > 2600) {
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

  const quotaSeats = intOrZero(cell(row, "quotaSeats"));
  const applicants = intOrZero(cell(row, "applicants"));
  const passedRound1 = intOrZero(cell(row, "passedRound1"));
  const passedRound2 = intOrZero(cell(row, "passedRound2"));
  if (
    quotaSeats === null ||
    applicants === null ||
    passedRound1 === null ||
    passedRound2 === null
  ) {
    return {
      rowIndex,
      ok: false,
      error: "quotaSeats / applicants / passedRound* ต้องเป็นจำนวนเต็ม",
    };
  }

  const scoreFields = {
    maxScoreR1: floatOrNull(cell(row, "maxScoreR1")),
    minScoreR1: floatOrNull(cell(row, "minScoreR1")),
    maxScoreR2: floatOrNull(cell(row, "maxScoreR2")),
    minScoreR2: floatOrNull(cell(row, "minScoreR2")),
  };
  for (const [k, v] of Object.entries(scoreFields)) {
    if (Number.isNaN(v as number)) {
      return { rowIndex, ok: false, error: `${k} ต้องเป็นตัวเลขหรือเว้นว่าง` };
    }
  }

  return {
    rowIndex,
    ok: true,
    data: {
      courseCode,
      university,
      faculty,
      major,
      year,
      round,
      quotaSeats,
      applicants,
      passedRound1,
      passedRound2,
      ...scoreFields,
    },
  };
}
