import { parseCriteriaCsv } from "./criteria-csv.parser";

const HEADER =
  "university,campus,faculty,major,subTrack,programType,courseCode,round,admissionYear,quotaSeats,gpaxMin,totalMinScore,sourceUrl,components";

describe("parseCriteriaCsv", () => {
  it("parses a Chulalongkorn r3_admission row", () => {
    const csv = [
      HEADER,
      `"จุฬาลงกรณ์มหาวิทยาลัย",,"คณะวิศวกรรมศาสตร์","วิศวกรรมศาสตร์",,,,r3_admission,2569,215,2.00,51,https://example.com,"tgat=20;tpat:30=30;aLevel:61=20;aLevel:64=20;aLevel:65=10"`,
    ].join("\n");

    const r = parseCriteriaCsv(csv);
    expect(r.errorCount).toBe(0);
    expect(r.okCount).toBe(1);
    const first = r.rows[0]!;
    if (!first.ok) throw new Error("expected ok row");
    expect(first.data.university).toBe("จุฬาลงกรณ์มหาวิทยาลัย");
    expect(first.data.round).toBe("r3_admission");
    expect(first.data.admissionYear).toBe(2569);
    expect(first.data.quotaSeats).toBe(215);
    expect(first.data.components.gpaxMin).toBe(2.0);
    expect(first.data.totalMinScore).toBe(51);
    expect(first.data.components.exams).toHaveLength(5);
  });

  it("parses a KKU r2_quota_kku_netsat row with per-subject mins", () => {
    const csv = [
      HEADER,
      `"มหาวิทยาลัยขอนแก่น",,"คณะวิศวกรรมศาสตร์","วิศวกรรมคอมพิวเตอร์",,"ภาคปกติ",,r2_quota_kku_netsat,2569,30,,30,https://apps.admissions.kku.ac.th/x,"tpat:30=20;netsat:102=30;netsat:103=30/20;netsat:204=20/20"`,
    ].join("\n");

    const r = parseCriteriaCsv(csv);
    expect(r.errorCount).toBe(0);
    expect(r.okCount).toBe(1);
    const first = r.rows[0]!;
    if (!first.ok) throw new Error("expected ok row");
    expect(first.data.round).toBe("r2_quota_kku_netsat");
    expect(first.data.programType).toBe("ภาคปกติ");
    expect(first.data.totalMinScore).toBe(30);
    expect(first.data.components.gpaxMin).toBeNull();
    const netsatMath = first.data.components.exams.find(
      (e) => e.system === "netsat" && e.code === "103",
    );
    expect(netsatMath?.min).toBe(20);
  });

  it("emits an error for an unknown round value", () => {
    const csv = [
      HEADER,
      `"U",,F,M,,,,r9_invalid,2569,30,,30,,"tgat=100"`,
    ].join("\n");
    const r = parseCriteriaCsv(csv);
    expect(r.errorCount).toBe(1);
    const row = r.rows[0]!;
    if (row.ok) throw new Error("expected error row");
    expect(row.error).toMatch(/r9_invalid|ไม่ถูกต้อง/);
  });

  it("emits an error for a non-Buddhist-era year", () => {
    const csv = [
      HEADER,
      `"U",,F,M,,,,r3_admission,2026,30,,30,,"tgat=100"`,
    ].join("\n");
    const r = parseCriteriaCsv(csv);
    const row = r.rows[0]!;
    if (row.ok) throw new Error("expected error");
    expect(row.error).toMatch(/พ\.ศ\./);
  });

  it("emits a single header-level error when a required column is missing", () => {
    const csv = [
      "university,faculty,major,round,admissionYear",
      `U,F,M,r3_admission,2569`,
    ].join("\n");
    const r = parseCriteriaCsv(csv);
    expect(r.errorCount).toBe(1);
    const row = r.rows[0]!;
    if (row.ok) throw new Error("expected error row");
    expect(row.error).toMatch(/components/);
  });

  it("surfaces unknown-key DSL errors with the row number", () => {
    const csv = [
      HEADER,
      `U,,F,M,,,,r3_admission,2569,30,,,,"tgat=50;netsat:999=50"`,
    ].join("\n");
    const r = parseCriteriaCsv(csv);
    expect(r.errorCount).toBe(1);
    const row = r.rows[0]!;
    if (row.ok) throw new Error("expected error row");
    expect(row.rowIndex).toBe(2);
    expect(row.error).toMatch(/exam-catalogue\.ts/);
  });

  it("ignores a leading `#` documentation comment row", () => {
    const csv = [
      `# components syntax: key=weight or key=weight/min, separated by ;`,
      HEADER,
      `U,,F,M,,,,r3_admission,2569,30,,,,"tgat=100"`,
    ].join("\n");
    const r = parseCriteriaCsv(csv);
    expect(r.okCount).toBe(1);
    expect(r.errorCount).toBe(0);
  });

  it("mixes ok and error rows independently", () => {
    const csv = [
      HEADER,
      `U,,F,M,,,,r3_admission,2569,30,,,,"tgat=100"`,
      `U2,,F,M2,,,,r3_admission,2569,30,,,,"netsat:999=100"`,
      `U3,,F,M3,,,,r3_admission,2569,30,,,,"tgat=50;tpat:30=50"`,
    ].join("\n");
    const r = parseCriteriaCsv(csv);
    expect(r.okCount).toBe(2);
    expect(r.errorCount).toBe(1);
    expect(r.rows[1]!.ok).toBe(false);
    expect(r.rows[0]!.ok).toBe(true);
    expect(r.rows[2]!.ok).toBe(true);
  });
});
