import * as XLSX from "xlsx";
import type { TcasRound } from "@peerahat/types";

import { parseStatsRow } from "./stats-csv.parser";
import {
  type ParseResult,
  type ParseRowResult,
  type ParsedStatsRow,
  makeResult,
} from "./types";

// Header mapping for the CUPT xlsx layout. Keys are the source Thai header,
// values are the canonical name our row-validator expects.
const THAI_HEADER_MAP: Record<string, string> = {
  รหัสหลักสูตร: "courseCode",
  สถาบัน: "university",
  คณะ: "faculty",
  หลักสูตร: "_program",
  รายละเอียด: "_detail",
  รับ: "quotaSeats",
  สมัคร: "applicants",
  "ผ่าน ประมวลผลครั้งที่ 1": "passedRound1",
  "ผ่าน ประมวลผลครั้งที่ 2": "passedRound2",
  "คะแนนสูงสุด ประมวลผลครั้งที่ 1": "maxScoreR1",
  "คะแนนต่ำสุด ประมวลผลครั้งที่ 1": "minScoreR1",
  "คะแนนสูงสุด ประมวลผลครั้งที่ 2": "maxScoreR2",
  "คะแนนต่ำสุด ประมวลผลครั้งที่ 2": "minScoreR2",
};

function normalizeHeader(h: string): string {
  // Collapse internal whitespace and trim. CUPT exports sometimes have
  // double-spaces or trailing newlines in headers.
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
  // defval: "" so missing cells come through as empty strings, matching the
  // CSV parser's contract.
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

  const have = new Set(headerMap.values());
  for (const required of [
    "courseCode",
    "university",
    "faculty",
    "_program",
    "quotaSeats",
    "applicants",
  ]) {
    if (!have.has(required)) {
      return makeResult([
        {
          rowIndex: 0,
          ok: false,
          error: `ไฟล์ Excel ขาดคอลัมน์ที่จำเป็น (มองหา header: "${reverseLookup(required) ?? required}")`,
        },
      ]);
    }
  }

  raw.forEach((src, idx) => {
    const rowIndex = idx + 2;
    // Translate Thai-header row into our canonical shape.
    const translated: Record<string, unknown> = {
      year: meta.year,
      round: meta.round,
    };
    for (const [thaiHeader, value] of Object.entries(src)) {
      const canonical = headerMap.get(thaiHeader);
      if (canonical) translated[canonical] = value;
    }
    // `major` is the join of หลักสูตร + รายละเอียด, separated by " " — matches
    // how CUPT displays them in their public PDFs.
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
