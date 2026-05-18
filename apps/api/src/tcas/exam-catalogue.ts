import type { ExamSystem } from "@peerahat/types";

// FR-TC-01: single source of truth for human-readable exam names.
// Keys follow the `${system}:${code}` rule; the bare `system` form covers the generic
// case (e.g. TGAT before TPO 2569 broke it into 1/2/3). CSV parser fails if a
// component references a key that's absent from this table.
export const EXAM_CATALOGUE: Record<
  string,
  { system: ExamSystem; nameTh: string }
> = {
  gpax: { system: "gpax", nameTh: "GPAX" },

  // TGAT
  tgat: { system: "tgat", nameTh: "TGAT" },
  "tgat:1": { system: "tgat", nameTh: "TGAT 1 การสื่อสารภาษาอังกฤษ" },
  "tgat:2": { system: "tgat", nameTh: "TGAT 2 การคิดอย่างมีเหตุผล" },
  "tgat:3": { system: "tgat", nameTh: "TGAT 3 สมรรถนะการทำงาน" },

  // TPAT
  "tpat:10": { system: "tpat", nameTh: "TPAT 1 กสพท." },
  "tpat:20": { system: "tpat", nameTh: "TPAT 2 ศิลปกรรมศาสตร์" },
  "tpat:30": { system: "tpat", nameTh: "TPAT 3 วิทย์-เทคโนโลยี-วิศวะ" },
  "tpat:40": { system: "tpat", nameTh: "TPAT 4 สถาปัตยกรรม" },
  "tpat:50": { system: "tpat", nameTh: "TPAT 5 ครุศาสตร์" },

  // A-Level (TPO codes 61-89)
  "aLevel:61": { system: "aLevel", nameTh: "คณิตศาสตร์ประยุกต์ 1" },
  "aLevel:62": { system: "aLevel", nameTh: "คณิตศาสตร์ประยุกต์ 2" },
  "aLevel:63": { system: "aLevel", nameTh: "วิทยาศาสตร์ประยุกต์" },
  "aLevel:64": { system: "aLevel", nameTh: "ฟิสิกส์" },
  "aLevel:65": { system: "aLevel", nameTh: "เคมี" },
  "aLevel:66": { system: "aLevel", nameTh: "ชีววิทยา" },
  "aLevel:70": { system: "aLevel", nameTh: "สังคมศึกษา" },
  "aLevel:81": { system: "aLevel", nameTh: "ภาษาไทย" },
  "aLevel:82": { system: "aLevel", nameTh: "ภาษาอังกฤษ" },
  "aLevel:83": { system: "aLevel", nameTh: "ภาษาฝรั่งเศส" },
  "aLevel:84": { system: "aLevel", nameTh: "ภาษาเยอรมัน" },
  "aLevel:85": { system: "aLevel", nameTh: "ภาษาญี่ปุ่น" },
  "aLevel:86": { system: "aLevel", nameTh: "ภาษาเกาหลี" },
  "aLevel:87": { system: "aLevel", nameTh: "ภาษาจีน" },
  "aLevel:88": { system: "aLevel", nameTh: "ภาษาบาลี" },
  "aLevel:89": { system: "aLevel", nameTh: "ภาษาสเปน" },

  // KKU NetSat (codes from apps.admissions.kku.ac.th)
  "netsat:102": { system: "netsat", nameTh: "SAT1 ภาษาอังกฤษ" },
  "netsat:103": { system: "netsat", nameTh: "SAT1 คณิตศาสตร์" },
  "netsat:104": { system: "netsat", nameTh: "SAT1 ภาษาไทย" },
  "netsat:105": { system: "netsat", nameTh: "SAT1 สังคมศึกษา" },
  "netsat:201": { system: "netsat", nameTh: "SAT2 เคมี" },
  "netsat:202": { system: "netsat", nameTh: "SAT2 ชีววิทยา" },
  "netsat:203": { system: "netsat", nameTh: "SAT2 คณิตศาสตร์" },
  "netsat:204": { system: "netsat", nameTh: "SAT2 ฟิสิกส์" },
};

export function lookupExam(
  key: string,
): { system: ExamSystem; nameTh: string } | undefined {
  return EXAM_CATALOGUE[key];
}

export function isKnownExamKey(key: string): boolean {
  return key in EXAM_CATALOGUE;
}

// Used by the parser to surface a Thai error message that names the missing key
// AND points the operator at the file they need to edit.
export function unknownKeyError(key: string): string {
  return `เพิ่มรหัสวิชา ${key} ลงใน exam-catalogue.ts ก่อนนำเข้า`;
}
