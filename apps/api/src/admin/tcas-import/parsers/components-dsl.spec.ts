import { parseComponentsDsl } from "./components-dsl";

describe("parseComponentsDsl", () => {
  it("parses a single key=weight item", () => {
    const r = parseComponentsDsl("tgat=100", { gpaxMin: null });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.components.exams).toEqual([
      { system: "tgat", code: "", name: "TGAT", weight: 100, min: null },
    ]);
  });

  it("parses multiple components and accepts whitespace", () => {
    const r = parseComponentsDsl(
      " tgat=20 ; tpat:30=30 ; aLevel:61=20 ; aLevel:64=20 ; aLevel:65=10 ",
      { gpaxMin: 2.0 },
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.components.gpaxMin).toBe(2.0);
    expect(r.components.exams).toHaveLength(5);
    expect(r.components.exams.map((e) => e.weight).reduce((a, b) => a + b))
      .toBe(100);
  });

  it("parses key=weight/min for per-subject thresholds", () => {
    const r = parseComponentsDsl(
      "tpat:30=20;netsat:102=30;netsat:103=30/20;netsat:204=20/20",
      { gpaxMin: null },
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const byCode = Object.fromEntries(
      r.components.exams.map((e) => [`${e.system}:${e.code}`, e]),
    );
    expect(byCode["netsat:103"]?.min).toBe(20);
    expect(byCode["netsat:204"]?.min).toBe(20);
    expect(byCode["netsat:102"]?.min).toBeNull();
    expect(byCode["tpat:30"]?.min).toBeNull();
  });

  it("accepts the ±0.5 tolerance (9.33+9.33+9.34 = 100)", () => {
    const r = parseComponentsDsl(
      "tpat:10=30;aLevel:61=14;aLevel:82=14;aLevel:64=9.33;aLevel:65=9.33;aLevel:66=9.34;aLevel:81=7;aLevel:70=7",
      { gpaxMin: null },
    );
    expect(r.ok).toBe(true);
  });

  it("rejects weights that don't sum to 100", () => {
    const r = parseComponentsDsl("tgat=50;tpat:30=30", { gpaxMin: null });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/น้ำหนักรวม/);
    expect(r.error).toMatch(/80/);
  });

  it("rejects unknown exam keys with a catalogue-pointing message", () => {
    const r = parseComponentsDsl("tgat=50;netsat:999=50", { gpaxMin: null });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/netsat:999/);
    expect(r.error).toMatch(/exam-catalogue\.ts/);
  });

  it("rejects bad syntax (missing =)", () => {
    const r = parseComponentsDsl("tgat-50;tpat:30=50", { gpaxMin: null });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/key=weight/);
  });

  it("rejects duplicate keys in the same row", () => {
    const r = parseComponentsDsl("tgat=50;tgat=50", { gpaxMin: null });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/ซ้ำ/);
  });

  it("rejects malformed key shape", () => {
    const r = parseComponentsDsl("123abc=100", { gpaxMin: null });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/system|รหัสวิชา/);
  });

  it("rejects negative or out-of-range weights", () => {
    expect(
      parseComponentsDsl("tgat=-10;tpat:30=110", { gpaxMin: null }).ok,
    ).toBe(false);
    expect(parseComponentsDsl("tgat=0", { gpaxMin: null }).ok).toBe(false);
  });

  it("rejects empty input", () => {
    expect(parseComponentsDsl("", { gpaxMin: null }).ok).toBe(false);
    expect(parseComponentsDsl("   ", { gpaxMin: null }).ok).toBe(false);
  });
});
