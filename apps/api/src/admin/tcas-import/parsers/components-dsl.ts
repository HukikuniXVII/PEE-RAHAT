import type { ProgramComponent, ProgramComponents } from "@peerahat/types";

import {
  EXAM_CATALOGUE,
  unknownKeyError,
} from "../../../tcas/exam-catalogue";

// Mini-DSL for the `components` column in the criteria CSV.
// Syntax: semicolon-separated items of the form `key=weight` or `key=weight/min`.
// `key` is the catalogue key (e.g. `tgat`, `tpat:30`, `aLevel:61`, `netsat:103`).
// Whitespace around items + the `=` / `/` separators is tolerated.
//
// Example: `tgat=20;tpat:30=30;netsat:103=30/20;netsat:204=20/20`

const ITEM = /^([a-zA-Z]+)(?::([a-zA-Z0-9]+))?$/;

export interface DslParseOk {
  ok: true;
  components: ProgramComponents;
}
export interface DslParseErr {
  ok: false;
  error: string;
}
export type DslParseResult = DslParseOk | DslParseErr;

export function parseComponentsDsl(
  input: string,
  opts: { gpaxMin: number | null },
): DslParseResult {
  const raw = (input ?? "").trim();
  if (!raw) {
    return { ok: false, error: "คอลัมน์ components ต้องไม่ว่าง" };
  }

  const items = raw
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (items.length === 0) {
    return { ok: false, error: "คอลัมน์ components ต้องไม่ว่าง" };
  }

  const exams: ProgramComponent[] = [];
  const seenKeys = new Set<string>();

  for (const item of items) {
    const eq = item.indexOf("=");
    if (eq < 0) {
      return {
        ok: false,
        error: `รายการ "${item}" ต้องอยู่ในรูป key=weight หรือ key=weight/min`,
      };
    }
    const key = item.slice(0, eq).trim();
    const valueRaw = item.slice(eq + 1).trim();
    if (!key || !valueRaw) {
      return {
        ok: false,
        error: `รายการ "${item}" รูปแบบไม่ถูกต้อง`,
      };
    }

    // weight or weight/min
    const slash = valueRaw.indexOf("/");
    const weightStr = slash < 0 ? valueRaw : valueRaw.slice(0, slash).trim();
    const minStr = slash < 0 ? null : valueRaw.slice(slash + 1).trim();
    const weight = Number(weightStr);
    if (!Number.isFinite(weight) || weight <= 0 || weight > 100) {
      return {
        ok: false,
        error: `รายการ "${item}" น้ำหนัก (${weightStr}) ต้องเป็นตัวเลข 0-100`,
      };
    }
    let min: number | null = null;
    if (minStr !== null) {
      const m = Number(minStr);
      if (!Number.isFinite(m) || m < 0) {
        return {
          ok: false,
          error: `รายการ "${item}" คะแนนขั้นต่ำ (${minStr}) ต้องเป็นตัวเลข ≥ 0`,
        };
      }
      min = m;
    }

    // Validate key shape and look it up in the catalogue.
    if (!ITEM.test(key)) {
      return {
        ok: false,
        error: `รหัสวิชา "${key}" ต้องอยู่ในรูป system หรือ system:code`,
      };
    }
    if (seenKeys.has(key)) {
      return { ok: false, error: `รหัสวิชา "${key}" ซ้ำในแถวเดียวกัน` };
    }
    seenKeys.add(key);

    const entry = EXAM_CATALOGUE[key];
    if (!entry) {
      return { ok: false, error: unknownKeyError(key) };
    }

    const match = key.match(ITEM)!;
    const code = match[2] ?? "";

    exams.push({
      system: entry.system,
      code,
      name: entry.nameTh,
      weight,
      min,
    });
  }

  // Tolerance ±0.5 mirrors the runtime zod refinement so that CSV-typed
  // weights with rounding (9.33 + 9.33 + 9.34 = 100) pass cleanly.
  const sum = exams.reduce((a, e) => a + e.weight, 0);
  if (Math.abs(sum - 100) > 0.5) {
    return {
      ok: false,
      error: `น้ำหนักรวม ${sum.toFixed(2)} ต้องเท่ากับ 100 (±0.5)`,
    };
  }

  return {
    ok: true,
    components: { gpaxMin: opts.gpaxMin, exams },
  };
}
