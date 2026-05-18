import * as XLSX from "xlsx";

import { parseStatsXlsx } from "./stats-xlsx.parser";

function buildXlsx(rows: Array<Record<string, unknown>>): Buffer {
  const sheet = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "Sheet1");
  const out = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return out as Buffer;
}

describe("parseStatsXlsx (CUPT layouts)", () => {
  it("parses the single-pass TCAS68 r3_1 layout (13 cols, one ผ่าน)", () => {
    const buf = buildXlsx([
      {
        สถาบัน: "จุฬาลงกรณ์มหาวิทยาลัย",
        วิทยาเขต: "วิทยาเขตหลัก",
        รหัสหลักสูตร: "10010121300501A",
        คณะ: "คณะวิศวกรรมศาสตร์",
        หลักสูตร: "หลักสูตรวิศวกรรมศาสตรบัณฑิต สาขาวิชาวิศวกรรมคอมพิวเตอร์",
        รายละเอียด: "",
        "สาขา/วิชาเอก": "",
        รหัสรับร่วม: "0",
        รับ: "80",
        สมัคร: "460",
        ผ่าน: "80",
        คะแนนสูงสุด: "89.0164",
        คะแนนต่ำสุด: "74.9664",
      },
    ]);

    const r = parseStatsXlsx(buf, { year: 2568, round: "r3_admission" });
    expect(r.errorCount).toBe(0);
    const row = r.rows[0]!;
    if (!row.ok) throw new Error("expected ok row");
    expect(row.data.courseCode).toBe("10010121300501A");
    expect(row.data.campus).toBe("วิทยาเขตหลัก");
    expect(row.data.major).toBe(
      "หลักสูตรวิศวกรรมศาสตรบัณฑิต สาขาวิชาวิศวกรรมคอมพิวเตอร์",
    );
    expect(row.data.subTrack).toBeNull();
    expect(row.data.jointCode).toBe("0");
    expect(row.data.passedRound1).toBe(80);
    expect(row.data.passedRound2).toBeNull();
    expect(row.data.minScoreR1).toBeCloseTo(74.9664);
    expect(row.data.maxScoreR1).toBeCloseTo(89.0164);
    expect(row.data.minScoreR2).toBeNull();
  });

  it("parses the two-pass TCAS67 layout (16 cols, ผ่าน(รอบ1) + ผ่าน(รอบ2))", () => {
    const buf = buildXlsx([
      {
        สถาบัน: "จุฬาลงกรณ์มหาวิทยาลัย",
        วิทยาเขต: "วิทยาเขตหลัก",
        รหัสหลักสูตร: "10010121300501A",
        คณะ: "คณะวิศวกรรมศาสตร์",
        หลักสูตร: "หลักสูตรวิศวกรรมศาสตรบัณฑิต สาขาวิชาวิศวกรรมคอมพิวเตอร์",
        รายละเอียด: "",
        "สาขา/วิชาเอก": "",
        รหัสรับร่วม: "0",
        รับ: "65",
        สมัคร: "579",
        "ผ่าน(รอบ1)": "65",
        "ผ่าน(รอบ2)": "65",
        คะแนนต่ำสุด: "72.4888",
        คะแนนสูงสุด: "90.4218",
        "คะแนนต่ำสุด หลังประมวลผลรอบ 2": "72.2942",
        "คะแนนสูงสุด หลังประมวลผลรอบ 2": "90.4218",
      },
    ]);

    const r = parseStatsXlsx(buf, { year: 2567, round: "r3_admission" });
    expect(r.errorCount).toBe(0);
    const row = r.rows[0]!;
    if (!row.ok) throw new Error("expected ok row");
    expect(row.data.passedRound1).toBe(65);
    expect(row.data.passedRound2).toBe(65);
    expect(row.data.minScoreR1).toBeCloseTo(72.4888);
    expect(row.data.maxScoreR1).toBeCloseTo(90.4218);
    expect(row.data.minScoreR2).toBeCloseTo(72.2942);
    expect(row.data.maxScoreR2).toBeCloseTo(90.4218);
  });

  it("strips commas in CUPT-style numbers (\"1,417\")", () => {
    const buf = buildXlsx([
      {
        สถาบัน: "U",
        วิทยาเขต: "",
        รหัสหลักสูตร: "CC1",
        คณะ: "F",
        หลักสูตร: "P",
        รายละเอียด: "",
        "สาขา/วิชาเอก": "",
        รหัสรับร่วม: "0",
        รับ: "390",
        สมัคร: "1,417", // <-- comma
        ผ่าน: "390",
        คะแนนสูงสุด: "82.6000",
        คะแนนต่ำสุด: "59.9831",
      },
    ]);
    const r = parseStatsXlsx(buf, { year: 2568, round: "r3_admission" });
    expect(r.errorCount).toBe(0);
    const row = r.rows[0]!;
    if (!row.ok) throw new Error("expected ok");
    expect(row.data.applicants).toBe(1417);
  });

  it("keeps สาขา/วิชาเอก in subTrack, not folded into major", () => {
    const buf = buildXlsx([
      {
        สถาบัน: "U",
        วิทยาเขต: "",
        รหัสหลักสูตร: "CC1",
        คณะ: "F",
        หลักสูตร: "หลักสูตรวิศวกรรมศาสตรบัณฑิต",
        รายละเอียด: "สาขาวิชาวิศวกรรมศาสตร์",
        "สาขา/วิชาเอก": "วิชาเอกหุ่นยนต์",
        รหัสรับร่วม: "0",
        รับ: "1",
        สมัคร: "1",
        ผ่าน: "1",
        คะแนนสูงสุด: "",
        คะแนนต่ำสุด: "",
      },
    ]);
    const r = parseStatsXlsx(buf, { year: 2568, round: "r3_admission" });
    expect(r.errorCount).toBe(0);
    const row = r.rows[0]!;
    if (!row.ok) throw new Error("expected ok");
    expect(row.data.major).toBe(
      "หลักสูตรวิศวกรรมศาสตรบัณฑิต สาขาวิชาวิศวกรรมศาสตร์",
    );
    expect(row.data.subTrack).toBe("วิชาเอกหุ่นยนต์");
  });

  it("errors when a required Thai header is absent", () => {
    const buf = buildXlsx([
      {
        รหัสหลักสูตร: "X",
        คณะ: "F",
        หลักสูตร: "P",
        รับ: 1,
        สมัคร: 1,
        ผ่าน: 1,
      },
    ]);
    const r = parseStatsXlsx(buf, { year: 2568, round: "r3_admission" });
    expect(r.errorCount).toBe(1);
    const row = r.rows[0]!;
    if (row.ok) throw new Error("expected error");
    expect(row.error).toMatch(/สถาบัน/);
  });

  it("errors when neither ผ่าน nor ผ่าน(รอบ1) is present", () => {
    const buf = buildXlsx([
      {
        สถาบัน: "U",
        วิทยาเขต: "",
        รหัสหลักสูตร: "CC1",
        คณะ: "F",
        หลักสูตร: "P",
        รายละเอียด: "",
        รับ: 1,
        สมัคร: 1,
      },
    ]);
    const r = parseStatsXlsx(buf, { year: 2568, round: "r3_admission" });
    expect(r.errorCount).toBe(1);
    const row = r.rows[0]!;
    if (row.ok) throw new Error("expected error");
    expect(row.error).toMatch(/ผ่าน|layout/);
  });
});
