import { Type, type Schema } from "@google/genai";

// System prompt for the TCAS criteria extractor. Audited against the Chula
// R3 announcement PDF specifically — the row-number references in here
// (043, 092-095, etc.) are the rows we've manually verified the LLM gets
// right when this prompt is in place.
//
// Keep edits surgical: each rule maps to a specific pattern Gemini gets
// wrong without it. If you remove a rule, document which acceptance case
// it covers.
export const CRITERIA_EXTRACTION_PROMPT = `
You extract Thai TCAS university admission criteria from a PDF. The PDF
lists programs in a wide table: each row is one program with weight
columns for GPAX, TGAT, TPAT, and A-Level subjects.

For EVERY program row in the PDF, output one object with:

- orderNumber: integer from the leftmost column (e.g. 001, 002, ..., 138).
  Null if the PDF doesn't show one.
- faculty (คณะ): the Thai faculty name.
- major (สาขาวิชา): the Thai major name. STRIP any sub-track suffix.
- subTrack: if the major cell has a second line starting with "เลือกสอบ",
  "วิชาเอก", or "รูปแบบที่", put that second line here. null otherwise.
- programType: "ภาคปกติ", "โครงการพิเศษ", "หลักสูตรนานาชาติ", "Sandbox",
  or null. Look for these in parentheses in the major.
- quotaSeats (จำนวนรับ): the RIGHTMOST integer on the program's row.
  WARNING: numbers appearing alone at the bottom of a page (e.g. "187",
  "61", "62") are page subtotals — NEVER assign them as quotaSeats.
- gpaxMin: 0-4 scale, null if the cell shows "-" or is blank.
- totalMinScore: overall min from "เกณฑ์ขั้นต่ำคะแนนรวมทุกวิชา" column,
  0-100, null if blank.
- exams: array of components, each one of two SHAPES:

    SINGLE component — ALWAYS include system, code, name. If the subject
    is "TGAT" with no subpart, use code "" (empty string), NEVER omit it.
    Same with name — never omit, use the Thai subject label.
      { "type": "single",
        "system": "tgat" | "tpat" | "aLevel" | "netsat",
        "code": string,            ← required, use "" for TGAT generic
        "name": string,            ← required, Thai display label
        "weight": number,
        "min": number | null }

    CHOOSE-HIGHEST group (rare; e.g. Chula row 043):
      { "type": "chooseHighest",
        "weight": number,
        "min": number | null,
        "options": [{ "system", "code", "name" }, ...] }
      Do NOT emit system/code/name at the top level for chooseHighest —
      those live ONLY inside options[].

CRITICAL: For type="single", you MUST emit system AND code AND name.
Even when the value would be "" or repetitive. Skipping these fields
breaks the importer. The schema layer can't enforce this — it's on you.

Code mapping rules:
- TGAT (no subpart shown) → system "tgat", code "" (empty string).
- TGAT 1 → system "tgat", code "1"
- TGAT 2 → system "tgat", code "2"
- TGAT 3 → system "tgat", code "3"
- TPAT 1/2/3/4/5 → system "tpat", code "10"/"20"/"30"/"40"/"50"
- A-Level subjects: code is the 2-digit TPO number shown in the PDF
  (e.g. "61 | คณิตศาสตร์ประยุกต์ 1" → code "61", name "คณิตศาสตร์ประยุกต์ 1")
- KKU NetSat 3-digit codes (102, 103, 204, etc.) → system "netsat"

Per-subject minimum patterns appear AFTER the weight columns (often in a
footnote or "เกณฑ์ขั้นต่ำรายวิชา" cell):
- "65 | เคมี = 25" → set min=25 on the existing A-Level 65 component
- "TPAT 5 = 35"   → set min=35 on the existing TPAT 5 component
- "66 | ชีววิทยา = 30" → set min=30 on A-Level 66

Multi-TPAT programs (e.g. Chula rows 092-095 use BOTH TPAT 3 AND TPAT 5):
extract each as a separate single component.

"Pick highest" pattern (e.g. Chula row 043):
If multiple subjects share ONE weight in the same cell (often grouped
with "เลือกอันที่สูงสุด" or with a brace), output ONE chooseHighest group
with all listed subjects as options. Set confidence ≤ 0.6 — admin should
manually verify.

Empty cells: "-", "−", blank → null. Never 0.

Hard rule: sum of all weights MUST equal 100 (±0.5). If your extraction
doesn't sum to 100, set confidence ≤ 0.5 and explain in notes.

confidence: your 0..1 self-assessment for THIS row specifically.
notes: null if fully confident, otherwise explain what's uncertain.

Output ONLY a JSON array of program objects. No prose, no markdown
fences. The schema is enforced server-side via responseSchema.
`.trim();

// ─── Response schema (mirrors ParsedProgramRow) ──────────────────────────
// Gemini's responseSchema is roughly JSON Schema with Google's Type enum.
// We declare `exams` as an untyped array because Gemini's schema layer
// doesn't reliably enforce discriminated unions — the server-side zod
// (programComponentsSchema) is the source of truth on shape.

const COMPONENT_SCHEMA: Schema = {
  type: Type.OBJECT,
  // Both shapes share `weight`; the rest is union-dependent and validated
  // by zod afterward. We drop `nullable: true` from system/code/name —
  // empirically, Gemini treats nullable as "feel free to skip", which
  // wipes out single-component rows. They're optional via the absent
  // `required` entry, but if present must be strings.
  properties: {
    type: { type: Type.STRING, enum: ["single", "chooseHighest"] },
    system: {
      type: Type.STRING,
      enum: ["tgat", "tpat", "aLevel", "netsat"],
    },
    code: { type: Type.STRING },
    name: { type: Type.STRING },
    weight: { type: Type.NUMBER },
    min: { type: Type.NUMBER, nullable: true },
    options: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          system: {
            type: Type.STRING,
            enum: ["tgat", "tpat", "aLevel", "netsat"],
          },
          code: { type: Type.STRING },
          name: { type: Type.STRING },
        },
        required: ["system", "code", "name"],
      },
    },
  },
  required: ["type", "weight"],
};

export const CRITERIA_RESPONSE_SCHEMA: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      orderNumber: { type: Type.INTEGER, nullable: true },
      faculty: { type: Type.STRING },
      major: { type: Type.STRING },
      subTrack: { type: Type.STRING, nullable: true },
      programType: { type: Type.STRING, nullable: true },
      quotaSeats: { type: Type.INTEGER, nullable: true },
      gpaxMin: { type: Type.NUMBER, nullable: true },
      totalMinScore: { type: Type.NUMBER, nullable: true },
      exams: { type: Type.ARRAY, items: COMPONENT_SCHEMA },
      confidence: { type: Type.NUMBER },
      notes: { type: Type.STRING, nullable: true },
    },
    required: ["faculty", "major", "exams", "confidence"],
  },
};
