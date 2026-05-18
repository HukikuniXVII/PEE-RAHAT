import { parseStatsCsv } from "./stats-csv.parser";

const HEADER =
  "courseCode,university,campus,faculty,major,subTrack,jointCode,year,round,quotaSeats,applicants,passedRound1,passedRound2,maxScoreR1,minScoreR1,maxScoreR2,minScoreR2";

describe("parseStatsCsv", () => {
  it("parses a two-pass CUPT row (TCAS67 layout)", () => {
    const csv = [
      HEADER,
      `10010121300501A,จุฬาลงกรณ์มหาวิทยาลัย,วิทยาเขตหลัก,คณะวิศวกรรมศาสตร์,หลักสูตรวิศวกรรมศาสตรบัณฑิต สาขาวิชาวิศวกรรมคอมพิวเตอร์,,0,2567,r3_admission,65,579,65,65,90.4218,72.4888,90.4218,72.2942`,
    ].join("\n");
    const r = parseStatsCsv(csv);
    expect(r.errorCount).toBe(0);
    const row = r.rows[0]!;
    if (!row.ok) throw new Error("expected ok row");
    expect(row.data.courseCode).toBe("10010121300501A");
    expect(row.data.campus).toBe("วิทยาเขตหลัก");
    expect(row.data.passedRound1).toBe(65);
    expect(row.data.passedRound2).toBe(65);
    expect(row.data.minScoreR2).toBeCloseTo(72.2942);
  });

  it("parses a single-pass row (TCAS68 r3_1 layout, passedRound2 empty)", () => {
    const csv = [
      HEADER,
      `10010121300501A,จุฬาลงกรณ์มหาวิทยาลัย,วิทยาเขตหลัก,คณะวิศวกรรมศาสตร์,หลักสูตรวิศวกรรมศาสตรบัณฑิต สาขาวิชาวิศวกรรมคอมพิวเตอร์,,0,2568,r3_admission,80,460,80,,89.0164,74.9664,,`,
    ].join("\n");
    const r = parseStatsCsv(csv);
    expect(r.errorCount).toBe(0);
    const row = r.rows[0]!;
    if (!row.ok) throw new Error("expected ok row");
    expect(row.data.passedRound1).toBe(80);
    expect(row.data.passedRound2).toBeNull();
    expect(row.data.minScoreR1).toBeCloseTo(74.9664);
    expect(row.data.minScoreR2).toBeNull();
  });

  it("accepts fractional passedRound1/2 (CUPT row 2899 ships 41.1709)", () => {
    const csv = [
      HEADER,
      `CC1,U,,F,M,,,2568,r3_admission,10,151,10,41.1709,46.3295,10.0,46.3295,40.8607`,
    ].join("\n");
    const r = parseStatsCsv(csv);
    expect(r.errorCount).toBe(0);
    const row = r.rows[0]!;
    if (!row.ok) throw new Error("expected ok");
    expect(row.data.passedRound2).toBeCloseTo(41.1709);
  });

  it("strips comma thousands-separators (CUPT exports use them)", () => {
    const csv = [
      HEADER,
      `CC1,U,,F,M,,,2568,r3_admission,"1,417","12,345",215,,82.6,59.98,,`,
    ].join("\n");
    const r = parseStatsCsv(csv);
    const row = r.rows[0]!;
    if (!row.ok) throw new Error("expected ok");
    expect(row.data.quotaSeats).toBe(1417);
    expect(row.data.applicants).toBe(12345);
  });

  it("errors when round is unrecognized", () => {
    const csv = [
      HEADER,
      `CC1,U,,F,M,,,2568,not_a_round,100,200,100,100,80,60,80,60`,
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
    expect(row.error).toMatch(/round|applicants/);
  });
});
