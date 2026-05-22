import type {
  CalendarFile,
  KkuQuotaFile,
  KkuStatFile,
  TcasQuotaFile,
  TcasStatFile,
} from "./tcas-data";
import {
  kkuQuota,
  kkuStat,
  tcasCalendar,
  tcasQuota,
  tcasStat,
} from "./tcas-data-bundle";

// ─── TEMPORARY TCAS SCRAPED-DATA ACCESSORS ───────────────────────────
// Scaffold until the Prisma models + import script + API endpoints in
// NETSAT-TCAS-DB.md land — then replace these with `createApiClient().tcas.*`.
//
// The five scraped JSON dumps in apps/api/scripts/scrapers/data/ are now
// bundled into the build at compile time (via ./tcas-data-bundle.js).
// This replaced an `fs.readFileSync` loader that worked under `pnpm dev`
// (monorepo files on disk, cwd = apps/web) but threw inside the standalone
// Docker image: the JSON was never traced into .next/standalone, and the
// `process.cwd()`-relative path did not resolve from the `/app` runner cwd.
// Bundling makes dev and prod behave identically and removes the need for
// any `node:fs` access here.
// ─────────────────────────────────────────────────────────────────────

export const loadKkuQuota = (): KkuQuotaFile => kkuQuota;
export const loadKkuStat = (): KkuStatFile => kkuStat;
export const loadCalendar = (): CalendarFile => tcasCalendar;
export const loadTcasQuota = (): TcasQuotaFile => tcasQuota;
export const loadTcasStat = (): TcasStatFile => tcasStat;
