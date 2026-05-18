import * as XLSX from "xlsx";
import type { TcasRound } from "@peerahat/types";

import { parseStatsRow } from "./stats-csv.parser";
import {
  type ParseResult,
  type ParseRowResult,
  type ParsedStatsRow,
  makeResult,
} from "./types";

// Header → canonical-field map. Two CUPT layouts coexist:
//   • TCAS68 r3_1 (single-pass): 13 cols, one "ผ่าน" + one max/min pair.
//   • TCAS67 (two-pass):         16 cols, ผ่าน(รอบ1) + ผ่าน(รอบ2) and two
//                                pairs of min/max — the round-2 ones suffixed
//                                with "หลังประมวลผลรอบ 2".
// We keep one big map covering all observed names and detect the layout
// after we see which keys are present.
const THAI_HEADER_MAP: Record<string, string> = {
  // Identity columns — present in both layouts.
  สถาบัน: "university",
  วิทยาเขต: "campus",
  รหัสหลักสูตร: "courseCode",
  คณะ: "faculty",
  หลักสูตร: "_program",
  รายละเอียด: "_detail",
  "สาขา/วิชาเอก": "subTrack",
  รหัสรับร่วม: "jointCode",
  รับ: "quotaSeats",
  สมัคร: "applicants",

  // Single-pass (TCAS68 r3_1) — these land in the R1 fields. R2 stays null.
  ผ่าน: "passedRound1",
  คะแนนสูงสุด: "maxScoreR1",
  คะแนนต่ำสุด: "minScoreR1",

  // Two-pass (TCAS67 and older) — "(รอบ1)" / "(รอบ2)" with no space.
  "ผ่าน(รอบ1)": "passedRound1",
  "ผ่าน(รอบ2)": "passedRound2",
  "คะแนนต่ำสุด หลังประมวลผลรอบ 2": "minScoreR2",
  "คะแนนสูงสุด หลังประมวลผลรอบ 2": "maxScoreR2",
};

function normalizeHeader(h: string): string {
  return h.replace(/\s+/g, " ").trim();
}

export function parseStatsXlsx(
  buffer: Buffer,
  meta: { year: number; round: TcasRound; sourceFile?: string },
): ParseResult<ParsedStatsRow> {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) {
    return makeResult([
      { rowIndex: 0, ok: false, error: "ไฟล์ Excel ไม่มี sheet" },
    ]);
  }
  const sheet = wb.Sheets[sheetName];
  if (!sheet) {
    return makeResult([
      { rowIndex: 0, ok: false, error: "ไฟล์ Excel sheet แรกว่าง" },
    ]);
  }
  // raw:false keeps numeric cells as their formatted strings (which is what
  // CUPT exports use — "1,417" with the thousands separator). The stats-csv
  // parser strips the commas before parsing.
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });

  const rows: ParseRowResult<ParsedStatsRow>[] = [];

  const firstRow = raw[0];
  if (raw.length === 0 || !firstRow) {
    return makeResult([{ rowIndex: 0, ok: false, error: "ไฟล์ว่าง" }]);
  }

  // Build a normalized header → canonical-name map for THIS file.
  const fileHeaders = Object.keys(firstRow);
  const headerMap = new Map<string, string>();
  for (const h of fileHeaders) {
    const normalized = normalizeHeader(h);
    const mapped = THAI_HEADER_MAP[normalized];
    if (mapped) headerMap.set(h, mapped);
  }

  const haveCanonical = new Set(headerMap.values());
  for (const required of [
    "courseCode",
    "university",
    "faculty",
    "_program",
    "quotaSeats",
    "applicants",
  ]) {
    if (!haveCanonical.has(required)) {
      return makeResult([
        {
          rowIndex: 0,
          ok: false,
          error: `ไฟล์ Excel ขาดคอลัมน์ที่จำเป็น (มองหา header: "${reverseLookup(required) ?? required}")`,
        },
      ]);
    }
  }
  // Either layout must be detectable — at minimum we need one "passed" column.
  if (!haveCanonical.has("passedRound1")) {
    return makeResult([
      {
        rowIndex: 0,
        ok: false,
        error:
          'ไฟล์ Excel ไม่มีคอลัมน์ "ผ่าน" หรือ "ผ่าน(รอบ1)" — ไม่ทราบ layout',
      },
    ]);
  }

  raw.forEach((src, idx) => {
    const rowIndex = idx + 2;
    const translated: Record<string, unknown> = {
      year: meta.year,
      round: meta.round,
    };
    for (const [thaiHeader, value] of Object.entries(src)) {
      const canonical = headerMap.get(thaiHeader);
      if (canonical) translated[canonical] = value;
    }
    // `major` is the CUPT "หลักสูตร" + (optional) "รายละเอียด", joined.
    // The "สาขา/วิชาเอก" column gets its own subTrack field — DON'T fold it
    // into major, since the calculator uses subTrack to disambiguate rows.
    const programName = String(translated["_program"] ?? "").trim();
    const detail = String(translated["_detail"] ?? "").trim();
    translated.major = [programName, detail].filter(Boolean).join(" ");
    delete translated["_program"];
    delete translated["_detail"];

    rows.push(parseStatsRow(translated, rowIndex));
  });

  return makeResult(rows);
}

function reverseLookup(canonical: string): string | undefined {
  for (const [thai, c] of Object.entries(THAI_HEADER_MAP)) {
    if (c === canonical) return thai;
  }
  return undefined;
}
