import * as XLSX from "xlsx";

import { parseStatsXlsx } from "./stats-xlsx.parser";

function buildXlsx(rows: Array<Record<string, unknown>>): Buffer {
  const sheet = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "Sheet1");
  const out = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return out as Buffer;
}

describe("parseStatsXlsx (CUPT layout)", () => {
  it("maps Thai headers into the canonical shape", () => {
    const buf = buildXlsx([
      {
        รหัสหลักสูตร: "10010121300001A",
        สถาบัน: "จุฬาลงกรณ์มหาวิทยาลัย",
        คณะ: "คณะวิศวกรรมศาสตร์",
        หลักสูตร: "หลักสูตรวิศวกรรมศาสตรบัณฑิต",
        รายละเอียด: "สาขาวิศวกรรมศาสตร์",
        รับ: 390,
        สมัคร: 1417,
        "ผ่าน ประมวลผลครั้งที่ 1": 390,
        "ผ่าน ประมวลผลครั้งที่ 2": 390,
        "คะแนนสูงสุด ประมวลผลครั้งที่ 1": 82.6,
        "คะแนนต่ำสุด ประมวลผลครั้งที่ 1": 59.9831,
        "คะแนนสูงสุด ประมวลผลครั้งที่ 2": 82.6,
        "คะแนนต่ำสุด ประมวลผลครั้งที่ 2": 59.883,
      },
    ]);

    const r = parseStatsXlsx(buf, { year: 2568, round: "r3_admission" });
    expect(r.errorCount).toBe(0);
    expect(r.okCount).toBe(1);
    const row = r.rows[0]!;
    if (!row.ok) throw new Error("expected ok row");
    expect(row.data.courseCode).toBe("10010121300001A");
    expect(row.data.major).toBe(
      "หลักสูตรวิศวกรรมศาสตรบัณฑิต สาขาวิศวกรรมศาสตร์",
    );
    expect(row.data.year).toBe(2568);
    expect(row.data.round).toBe("r3_admission");
    expect(row.data.passedRound1).toBe(390);
    expect(row.data.minScoreR2).toBeCloseTo(59.883);
  });

  it("errors when a required Thai header is absent", () => {
    const buf = buildXlsx([
      {
        รหัสหลักสูตร: "X",
        คณะ: "F",
        หลักสูตร: "P",
        รับ: 1,
        สมัคร: 1,
      },
    ]);
    const r = parseStatsXlsx(buf, { year: 2568, round: "r3_admission" });
    expect(r.errorCount).toBe(1);
    const row = r.rows[0]!;
    if (row.ok) throw new Error("expected error");
    expect(row.error).toMatch(/สถาบัน/);
  });

  it("collapses internal whitespace in headers", () => {
    const buf = buildXlsx([
      {
        รหัสหลักสูตร: "X1",
        สถาบัน: "U",
        คณะ: "F",
        หลักสูตร: "P",
        รายละเอียด: "",
        รับ: 1,
        สมัคร: 1,
        "ผ่าน  ประมวลผลครั้งที่ 1": 1,
        "ผ่าน ประมวลผลครั้งที่ 2": 1,
      },
    ]);
    const r = parseStatsXlsx(buf, { year: 2568, round: "r3_admission" });
    expect(r.errorCount).toBe(0);
    const row = r.rows[0]!;
    if (!row.ok) throw new Error("expected ok");
    expect(row.data.passedRound1).toBe(1);
  });
});
