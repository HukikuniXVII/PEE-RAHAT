import { parseStatsCsv } from "./stats-csv.parser";

const HEADER =
  "courseCode,university,faculty,major,year,round,quotaSeats,applicants,passedRound1,passedRound2,maxScoreR1,minScoreR1,maxScoreR2,minScoreR2";

describe("parseStatsCsv", () => {
  it("parses a CUPT-style stats row end-to-end", () => {
    const csv = [
      HEADER,
      `10010121300001A,จุฬาลงกรณ์มหาวิทยาลัย,คณะวิศวกรรมศาสตร์,หลักสูตรวิศวกรรมศาสตรบัณฑิต สาขาวิศวกรรมศาสตร์,2568,r3_admission,390,1417,390,390,82.6,59.9831,82.6,59.883`,
    ].join("\n");
    const r = parseStatsCsv(csv);
    expect(r.errorCount).toBe(0);
    const row = r.rows[0]!;
    if (!row.ok) throw new Error("expected ok row");
    expect(row.data.courseCode).toBe("10010121300001A");
    expect(row.data.year).toBe(2568);
    expect(row.data.applicants).toBe(1417);
    expect(row.data.minScoreR2).toBeCloseTo(59.883);
  });

  it("treats missing score columns as null", () => {
    const csv = [
      HEADER,
      `CC1,U,F,M,2568,r3_admission,100,200,100,100,,,,`,
    ].join("\n");
    const r = parseStatsCsv(csv);
    const row = r.rows[0]!;
    if (!row.ok) throw new Error("expected ok");
    expect(row.data.maxScoreR1).toBeNull();
    expect(row.data.minScoreR1).toBeNull();
  });

  it("errors when round is unrecognized", () => {
    const csv = [
      HEADER,
      `CC1,U,F,M,2568,not_a_round,100,200,100,100,80,60,80,60`,
    ].join("\n");
    const r = parseStatsCsv(csv);
    const row = r.rows[0]!;
    if (row.ok) throw new Error("expected error");
    expect(row.error).toMatch(/round/);
  });

  it("errors when a required column is missing", () => {
    const csv = [
      "courseCode,university,faculty,major,year,quotaSeats",
      `CC1,U,F,M,2568,100`,
    ].join("\n");
    const r = parseStatsCsv(csv);
    expect(r.errorCount).toBe(1);
    const row = r.rows[0]!;
    if (row.ok) throw new Error("expected error");
    expect(row.error).toMatch(/round/);
  });
});
