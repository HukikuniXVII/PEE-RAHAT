/**
 * Smoke test: call TcasAiParserService.parsePdf against a real TCAS PDF.
 *
 * Run from the apps/api workspace so --env-file picks up .env:
 *   pnpm --filter @peerahat/api exec tsx --env-file=.env \
 *     scripts/smoke-parse-chula.ts <path-to-pdf> [round] [year]
 *
 * Required env (in apps/api/.env):
 *   GEMINI_API_KEY=<your key>
 *   TCAS_AI_IMPORT_ENABLED=true
 *
 * Prints:
 *   - row count + confidence histogram + total cost + token usage
 *   - a sample of rows from each confidence band
 *   - acceptance-criteria checks (Chula R3 specific) with pass/fail
 *
 * Exit code is non-zero if any acceptance check fails. The asserts are
 * permissive — when our prompt gets close enough to the spec target, this
 * script flips to green. Tune the prompt in
 * apps/api/src/admin/tcas-import/ai/prompts/criteria-extraction.ts and
 * re-run until satisfied.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { TcasAiParserService } from "../src/admin/tcas-import/ai/tcas-ai-parser.service";

// ─── CLI args ────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error(
    "usage: tsx scripts/smoke-parse-chula.ts <pdf-path> [round] [year]\n" +
      "  pdf-path   path to the criteria PDF (.idea/* recommended)\n" +
      "  round      r1_portfolio | r2_quota_kku_netsat | r3_admission | r4_direct" +
      " (default: r3_admission)\n" +
      "  year       Buddhist Era year (default: 2569)",
  );
  process.exit(2);
}
const pdfPath = resolve(args[0]!);
const round = (args[1] ?? "r3_admission") as
  | "r1_portfolio"
  | "r2_quota_kku_netsat"
  | "r3_admission"
  | "r4_direct";
const year = args[2] ? Number(args[2]) : 2569;

if (!process.env.GEMINI_API_KEY) {
  console.error(
    "GEMINI_API_KEY is not set. Add it to apps/api/.env and re-run.",
  );
  process.exit(2);
}

// ─── Run ─────────────────────────────────────────────────────────────────

async function main() {
  const buffer = readFileSync(pdfPath);
  console.log(`Reading ${pdfPath} (${(buffer.length / 1024).toFixed(0)} KB)`);

  const svc = new TcasAiParserService();
  const started = Date.now();
  const result = await svc.parsePdf(buffer, {
    university: "จุฬาลงกรณ์มหาวิทยาลัย",
    round,
    admissionYear: year,
  });
  const wallMs = Date.now() - started;

  // ─── Summary ─────────────────────────────────────────────────────────
  const bands = { high: 0, medium: 0, low: 0 };
  for (const r of result.rows) {
    if (r.confidence >= 0.8) bands.high++;
    else if (r.confidence >= 0.5) bands.medium++;
    else bands.low++;
  }

  console.log("\n═══ Parse summary ═══");
  console.log(`  model:           ${result.modelUsed}`);
  console.log(`  rows extracted:  ${result.rows.length}`);
  console.log(
    `  confidence:      🟢 ${bands.high}  🟡 ${bands.medium}  🔴 ${bands.low}`,
  );
  console.log(
    `  tokens:          ${result.promptTokens} prompt + ${result.completionTokens} completion`,
  );
  console.log(`  estimated cost:  $${result.estimatedCostUsd.toFixed(4)}`);
  console.log(
    `  parse time:      ${(result.parseDurationMs / 1000).toFixed(1)}s (wall ${(
      wallMs / 1000
    ).toFixed(1)}s)`,
  );

  // ─── Samples ────────────────────────────────────────────────────────
  console.log("\n═══ Sample rows ═══");
  for (const band of ["high", "medium", "low"] as const) {
    const samples = result.rows
      .filter((r) => {
        if (band === "high") return r.confidence >= 0.8;
        if (band === "medium") return r.confidence >= 0.5 && r.confidence < 0.8;
        return r.confidence < 0.5;
      })
      .slice(0, 2);
    if (samples.length === 0) continue;
    console.log(`  -- ${band} confidence --`);
    for (const r of samples) {
      console.log(
        `    [#${r.orderNumber ?? "?"}] ${r.faculty} / ${r.major}` +
          (r.subTrack ? ` (${r.subTrack})` : "") +
          ` • quota=${r.quotaSeats}` +
          ` • conf=${r.confidence.toFixed(2)}`,
      );
    }
  }

  // ─── Acceptance checks (Chula R3 specific) ───────────────────────────
  console.log("\n═══ Acceptance checks ═══");
  const results: Array<{ pass: boolean; label: string }> = [];

  const highConfCount = bands.high + bands.medium - bands.medium / 2; // sloppy ≥0.7 estimate
  const above07 = result.rows.filter((r) => r.confidence >= 0.7).length;
  results.push({
    pass: above07 >= 120,
    label: `≥120 rows with confidence ≥0.7 — got ${above07}`,
  });

  // Row 043: chooseHighest with ≥4 options
  const row43 = result.rows.find((r) => r.orderNumber === 43);
  const row43HasChooseHighest =
    row43?.components.exams.some(
      (e) => e.type === "chooseHighest" && e.options.length >= 4,
    ) ?? false;
  results.push({
    pass: row43HasChooseHighest,
    label: `row 043 produces chooseHighest with ≥4 options`,
  });

  // No suspected page-subtotals as quota seats
  const subtotalSuspects = [187, 61, 62, 66, 32];
  const matchesSubtotal = result.rows.filter((r) =>
    r.quotaSeats !== null ? subtotalSuspects.includes(r.quotaSeats) : false,
  );
  // Pass if fewer than 10% of rows match these specific numbers (some real
  // programs may legitimately use 61/62/etc as quota, but a flood would
  // mean the LLM's grabbing the page-bottom totals).
  results.push({
    pass: matchesSubtotal.length < result.rows.length * 0.1,
    label: `<10% of rows have a quotaSeats matching known subtotals (got ${matchesSubtotal.length}/${result.rows.length})`,
  });

  // Multi-TPAT — at least one row should have ≥2 TPAT components
  const multiTpat = result.rows.filter(
    (r) =>
      r.components.exams.filter((e) => e.type === "single" && e.system === "tpat")
        .length >= 2,
  );
  results.push({
    pass: multiTpat.length >= 1,
    label: `at least one row has 2+ TPAT single components — got ${multiTpat.length}`,
  });

  // Per-subject mins — at least one row should set a min on a component
  const withMin = result.rows.filter((r) =>
    r.components.exams.some(
      (e) => (e.type === "single" || e.type === "chooseHighest") && e.min !== null,
    ),
  );
  results.push({
    pass: withMin.length >= 1,
    label: `at least one row has a per-subject minimum — got ${withMin.length}`,
  });

  // Sub-tracks — at least 5 rows with subTrack non-null
  const withSubTrack = result.rows.filter((r) => r.subTrack !== null);
  results.push({
    pass: withSubTrack.length >= 5,
    label: `at least 5 rows have a subTrack — got ${withSubTrack.length}`,
  });

  let failed = 0;
  for (const r of results) {
    console.log(`  ${r.pass ? "✓" : "✗"} ${r.label}`);
    if (!r.pass) failed++;
  }
  console.log(
    `\n${failed === 0 ? "✓ All checks pass" : `✗ ${failed}/${results.length} checks failed`}`,
  );
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(`\nSmoke test failed: ${(err as Error).message}`);
  console.error(err);
  process.exit(1);
});
