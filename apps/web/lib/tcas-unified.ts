// Client-safe shared types + math helpers for the redesigned /tcas
// workspace. Both NETSAT (KKU) programs and TCAS R3 programs map onto
// these types via mapKkuProgram / mapTcasProgram (called server-side
// in page.tsx so the client receives a single homogeneous list).

import { calculateScore, isGpaxCode } from "@peerahat/types";

import type {
  KkuProgram,
  KkuStatRecord,
  TcasProgram,
  TcasStatRecord,
} from "./tcas-data";

export type ProgramSource = "kku-netsat" | "tcas-r3";

export interface HistorySnapshot {
  year: number;
  min: number | null;
  max: number | null;
  mean: number | null;
  // mytcas-only: predicted current-year minimum, two estimators
  estMean?: number | null;
  estRegression?: number | null;
}

export interface UnifiedProgramWeight {
  examCode: string;
  weightPercent: number;
  rawSubjectName: string;
  minSubjectScore: number | null;
  /**
   * Raw-score upper bound for this exam (used by `normalize` in the
   * canonical algorithm). GPAX defaults to 4; everything else defaults
   * to 100. Mappers populate this so consumers don't need to know the
   * convention; non-mapped entries fall back to `maxScoreFor`'s inference
   * (GPAX → 4 else 100). Future systems with non-standard scales (e.g.
   * NETSAT subjects with 0-500 raw range) should populate this
   * explicitly at the mapper layer so the score projection is correct.
   */
  maxScore?: number;
}

export interface UnifiedProgram {
  id: string;
  source: ProgramSource;
  university: string;
  faculty: string;
  programName: string;
  programType?: string;
  campus?: string | null;
  minTotalScore: number;
  minGpax: number | null;
  seats: number | null;
  weights: UnifiedProgramWeight[];
  sourceUrl: string;
  history: HistorySnapshot | null;
}

// ─── Mappers (call server-side) ──────────────────────────────────────

export function mapKkuProgram(
  p: KkuProgram,
  stat: KkuStatRecord | undefined,
): UnifiedProgram {
  return {
    id: `kku-${p.id}`,
    source: "kku-netsat",
    university: p.university,
    faculty: p.faculty,
    programName: p.program_name,
    campus: null,
    minTotalScore: p.min_total_percent,
    minGpax: p.min_gpax ?? null,
    seats: null,
    weights: p.weights.map((w) => ({
      examCode: w.exam_code,
      weightPercent: w.weight_percent,
      rawSubjectName: w.raw_subject_name,
      minSubjectScore: w.min_subject_score,
      // Mapper sets the canonical maxScore so downstream consumers
      // don't have to special-case GPAX. Upstream (KKU/TCAS R3) scrapers
      // don't carry maxScore today, so we infer: GPAX → 4 (forced),
      // everything else → undefined (falls back to 100 via maxScoreFor).
      maxScore: isGpaxCode(w.exam_code) ? 4 : undefined,
    })),
    sourceUrl: p.source_url,
    history: stat
      ? {
          year: stat.year,
          min: stat.min_score,
          max: stat.max_score,
          mean: stat.mean_score,
        }
      : null,
  };
}

export function mapTcasProgram(
  p: TcasProgram,
  stat: TcasStatRecord | undefined,
): UnifiedProgram {
  // TCAS R3 raw data has many programs sharing `external_id` because that
  // ID identifies the program/faculty, not the specific track. Folding
  // `project_id` into the React key keeps each track distinct. Final
  // dedupe happens in page.tsx (`mapTcasProgram` is many-to-one with the
  // raw rows, since the scrape contains literal byte-identical duplicates
  // — same external_id + project_id repeated 10–20 times).
  return {
    id: `tcas-${p.external_id}-${p.project_id ?? ""}`,
    source: "tcas-r3",
    university: p.university,
    faculty: p.faculty,
    programName: p.project_name_th
      ? `${p.program_name} — ${p.project_name_th}`
      : p.program_name,
    programType: p.program_type,
    campus: p.campus,
    minTotalScore: p.min_total_score,
    minGpax: p.min_gpax,
    seats: p.receive_student_number,
    weights: p.weights.map((w) => ({
      examCode: w.exam_code,
      weightPercent: w.weight_percent,
      rawSubjectName: w.raw_subject_name,
      minSubjectScore: w.min_subject_score,
      // Mapper sets the canonical maxScore so downstream consumers
      // don't have to special-case GPAX. Upstream (KKU/TCAS R3) scrapers
      // don't carry maxScore today, so we infer: GPAX → 4 (forced),
      // everything else → undefined (falls back to 100 via maxScoreFor).
      maxScore: isGpaxCode(w.exam_code) ? 4 : undefined,
    })),
    sourceUrl: p.source_url,
    history: stat
      ? {
          year: stat.year,
          min: stat.min_score,
          max: stat.max_score,
          mean: stat.mean_score,
          estMean: stat.est_min_score_mean,
          estRegression: stat.est_min_score_regression,
        }
      : null,
  };
}

// ─── Zones / scoring math ────────────────────────────────────────────

export type Zone = "danger" | "borderline" | "safe" | "unknown";

const ZONE_LABEL: Record<Zone, string> = {
  danger: "ต่ำกว่าเกณฑ์",
  borderline: "ลุ้น",
  safe: "น่าจะติด",
  unknown: "ไม่มีข้อมูล",
};

export function classifyZone(
  userScore: number,
  history: HistorySnapshot | null,
): Zone {
  if (!history || history.min == null) return "unknown";
  if (userScore < history.min) return "danger";
  // "Safe" threshold: prefer mean (typical admit), fall back to halfway
  // between min and max so we don't require user to hit the top.
  const upper =
    history.mean ??
    (history.max != null
      ? history.min + (history.max - history.min) * 0.5
      : history.min);
  if (userScore >= upper) return "safe";
  return "borderline";
}

export function zoneLabel(zone: Zone): string {
  return ZONE_LABEL[zone];
}

// 0–100, position within [min, max] (or null if range unknown)
export function rangePosition(
  userScore: number,
  history: HistorySnapshot | null,
): number | null {
  if (!history || history.min == null || history.max == null) return null;
  const span = history.max - history.min;
  if (span <= 0) return userScore >= history.min ? 100 : 0;
  return Math.max(0, Math.min(100, ((userScore - history.min) / span) * 100));
}

// +/- points vs historical minimum
export function pointsVsMin(
  userScore: number,
  history: HistorySnapshot | null,
): number | null {
  if (!history || history.min == null) return null;
  return userScore - history.min;
}

/**
 * Live in-page projection: convert the user's typed scores into a
 * weighted 0–100 total, delegated to the canonical algorithm so the
 * GPAX-as-weight (0–4 → 0–100) normalization rule is enforced exactly
 * once in the codebase.
 *
 * Behavior preserved vs the pre-canonical implementation:
 * - Returns `{ total, breakdown }` shape unchanged.
 * - Missing subjects contribute 0 (live UX while the user is still
 *   typing). For spec-true null semantics, callers should hit the
 *   backend whatIf endpoint instead.
 */
export function calculateWeightedScore(
  weights: UnifiedProgramWeight[],
  scores: Record<string, number>,
): {
  total: number;
  breakdown: Array<{
    examCode: string;
    weightPercent: number;
    rawScore: number;
    contribution: number;
  }>;
} {
  // Extract GPAX under any case variant; the algorithm reads
  // `input.gpax` for any weight where isGpaxCode(examCode) is true.
  let gpax: number | null = null;
  for (const key of Object.keys(scores)) {
    if (isGpaxCode(key)) {
      gpax = scores[key]!;
      break;
    }
  }
  // Fill missing non-GPAX scores with 0 so the projection produces a
  // meaningful partial as the user fills the form one subject at a
  // time. Otherwise calculateScore returns null on first missing.
  const scoresWithZeros: Record<string, number> = { ...scores };
  for (const w of weights) {
    if (!isGpaxCode(w.examCode) && scoresWithZeros[w.examCode] == null) {
      scoresWithZeros[w.examCode] = 0;
    }
  }
  const result = calculateScore(
    {
      minGpax: null,
      minTotalPercent: null,
      weights: weights.map((w) => ({
        examCode: w.examCode,
        weightPercent: w.weightPercent,
        // Honor any explicit maxScore set at the mapper layer (Phase 4);
        // falls back to maxScoreFor's GPAX → 4 / else → 100 inference
        // when undefined.
        maxScore: w.maxScore,
      })),
    },
    { scores: scoresWithZeros, gpax: gpax ?? 0 },
  );
  return {
    total: result.weightedScore ?? 0,
    breakdown: result.breakdown.map((b) => ({
      examCode: b.examCode,
      weightPercent: b.weightPercent,
      rawScore: b.rawScore,
      contribution: b.contribution,
    })),
  };
}

// ─── Subject categorisation ──────────────────────────────────────────

export type SubjectCategory =
  | "TGAT"
  | "TPAT"
  | "A-Level"
  | "NETSAT"
  | "Other";

const CATEGORY_LABEL: Record<SubjectCategory, string> = {
  TGAT: "TGAT",
  TPAT: "TPAT",
  "A-Level": "A-Level",
  NETSAT: "NETSAT",
  Other: "อื่นๆ",
};

// TCAS69 exam-code → Thai display name (raw_subject_name is empty in the
// scraped quota, so the UI used to fall back to showing the raw code like
// "A_LV_61"). Codes match mytcas.com's official A-Level / TGAT / TPAT set.
const EXAM_CODE_LABEL_TH: Record<string, string> = {
  TGAT: "TGAT ความถนัดทั่วไป",
  TGAT1: "TGAT1 ภาษาอังกฤษ",
  TGAT2: "TGAT2 การคิดอย่างมีเหตุผล",
  TGAT3: "TGAT3 สมรรถนะการทำงาน",
  TPAT1: "TPAT1 กสพท",
  TPAT2: "TPAT2 ศิลปกรรม",
  TPAT3: "TPAT3 วิทย์-วิศวะ-เทคโน",
  TPAT4: "TPAT4 สถาปัตย์",
  TPAT5: "TPAT5 ครุศาสตร์",
  A_LV_61: "คณิตศาสตร์ประยุกต์ 1",
  A_LV_62: "คณิตศาสตร์ประยุกต์ 2",
  A_LV_63: "วิทยาศาสตร์ประยุกต์",
  A_LV_64: "ฟิสิกส์",
  A_LV_65: "เคมี",
  A_LV_66: "ชีววิทยา",
  A_LV_70: "สังคมศึกษา",
  A_LV_81: "ภาษาไทย",
  A_LV_82: "ภาษาอังกฤษ",
  A_LV_83: "ภาษาฝรั่งเศส",
  A_LV_84: "ภาษาเยอรมัน",
  A_LV_85: "ภาษาญี่ปุ่น",
  A_LV_86: "ภาษาเกาหลี",
  A_LV_87: "ภาษาจีน",
  A_LV_88: "ภาษาบาลี",
  A_LV_89: "ภาษาสเปน",
  NETSAT: "NETSAT",
  // TCAS R3-only: not a test the student sits — TCAS computes it from
  // where the applicant ranks this program in their up-to-10 choice list.
  // See PRIORITY_SCORE notes in app/tcas/_components/tcas-calculator.tsx
  // (hidden from the score-input row; shown in weight chips/pie/tooltips).
  PRIORITY_SCORE: "ลำดับการเลือก",
};

export function examCodeLabel(examCode: string): string {
  return EXAM_CODE_LABEL_TH[examCode] ?? examCode;
}

export function categoryFor(examCode: string): SubjectCategory {
  if (examCode.startsWith("TGAT")) return "TGAT";
  if (examCode.startsWith("TPAT")) return "TPAT";
  if (examCode.startsWith("A_LV") || examCode.startsWith("A_LEVEL"))
    return "A-Level";
  if (examCode.startsWith("NETSAT")) return "NETSAT";
  return "Other";
}

export function categoryLabel(cat: SubjectCategory): string {
  return CATEGORY_LABEL[cat];
}

export function groupWeightsByCategory(
  weights: UnifiedProgramWeight[],
): Array<{ category: SubjectCategory; items: UnifiedProgramWeight[] }> {
  const buckets = new Map<SubjectCategory, UnifiedProgramWeight[]>();
  const ORDER: SubjectCategory[] = [
    "TGAT",
    "TPAT",
    "A-Level",
    "NETSAT",
    "Other",
  ];
  for (const cat of ORDER) buckets.set(cat, []);
  for (const w of weights) buckets.get(categoryFor(w.examCode))!.push(w);
  return ORDER.filter((c) => buckets.get(c)!.length > 0).map((c) => ({
    category: c,
    items: buckets.get(c)!,
  }));
}

// ─── Search + faculty quick-tag matching ─────────────────────────────

export function programMatchesQuery(p: UnifiedProgram, q: string): boolean {
  if (!q) return true;
  const lower = q.trim().toLowerCase();
  return (
    p.university.toLowerCase().includes(lower) ||
    p.faculty.toLowerCase().includes(lower) ||
    p.programName.toLowerCase().includes(lower) ||
    p.weights.some((w) => w.examCode.toLowerCase().includes(lower))
  );
}

export interface FacultyTag {
  key: string;
  labelTh: string;
  // Faculty name OR-match on any of these substrings.
  keywords: string[];
}

export const FACULTY_TAGS: FacultyTag[] = [
  { key: "engineering", labelTh: "วิศวกรรม", keywords: ["วิศวกรรม"] },
  {
    key: "health",
    labelTh: "แพทย์ / สุขภาพ",
    keywords: [
      "แพทย",
      "เภสัช",
      "พยาบาล",
      "ทันต",
      "สัตว",
      "สาธารณสุข",
      "เทคนิคการแพทย",
      "กายภาพ",
    ],
  },
  { key: "science", labelTh: "วิทยาศาสตร์", keywords: ["วิทยาศาสตร์"] },
  {
    key: "arts",
    labelTh: "อักษร / มนุษย์",
    keywords: ["อักษร", "มนุษย", "ศิลป"],
  },
  {
    key: "business",
    labelTh: "บริหาร / บัญชี",
    keywords: ["บริหาร", "บัญชี", "พาณิชย"],
  },
  { key: "law-poli", labelTh: "นิติ / รัฐ", keywords: ["นิติ", "รัฐศาสตร์"] },
  {
    key: "education",
    labelTh: "ครุ / ศึกษา",
    keywords: ["ครุศาสตร์", "ศึกษาศาสตร์"],
  },
  {
    key: "agri",
    labelTh: "เกษตร / อาหาร",
    keywords: ["เกษตร", "อาหาร", "ประมง", "ป่าไม"],
  },
];

export function programMatchesTag(
  p: UnifiedProgram,
  tag: FacultyTag,
): boolean {
  return tag.keywords.some((kw) => p.faculty.includes(kw));
}

export const ROUND_FILTER_OPTIONS = [
  { value: "all", label: "ทุกรอบ" },
  { value: "kku-netsat", label: "รอบ 2 NETSAT (KKU)" },
  { value: "tcas-r3", label: "รอบ 3 Admission" },
] as const;

export type RoundFilter = (typeof ROUND_FILTER_OPTIONS)[number]["value"];
