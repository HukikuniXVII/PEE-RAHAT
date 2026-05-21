import fs from "node:fs";
import path from "node:path";
import { cache } from "react";

import type {
  CalendarFile,
  KkuQuotaFile,
  KkuStatFile,
  TcasQuotaFile,
  TcasStatFile,
} from "./tcas-data";

// ─── TEMPORARY DEV-ONLY LOADERS ──────────────────────────────────────
// SERVER-ONLY MODULE. Never import this file from a "use client"
// component — `node:fs` cannot be bundled for the browser. The `-server`
// suffix is the convention here. Pure types + helpers live in the
// sibling `./tcas-data.ts` which is safe to import from anywhere.
//
// Reads the scraped JSON dumps in apps/api/scripts/scrapers/data/ directly
// from disk inside the Next.js server. Works in `pnpm dev` because the
// monorepo files are local; will NOT work in a deployed Next.js build
// without bundling the JSON. Once the Prisma models + import script + API
// endpoints in NETSAT-TCAS-DB.md land, replace these loaders with calls
// through `createApiClient().tcas.*`.
// ─────────────────────────────────────────────────────────────────────

const DATA_DIR = path.resolve(
  process.cwd(),
  "../../apps/api/scripts/scrapers/data",
);

// `cache` is React 18's per-request memo — server components inside the
// same render tree share the parsed JSON instead of re-reading and
// re-parsing the file on every consumer.

export const loadKkuQuota = cache((): KkuQuotaFile => {
  const raw = fs.readFileSync(
    path.join(DATA_DIR, "kku-quota-69.json"),
    "utf-8",
  );
  return JSON.parse(raw);
});

export const loadKkuStat = cache((): KkuStatFile => {
  const raw = fs.readFileSync(
    path.join(DATA_DIR, "kku-stat-68.json"),
    "utf-8",
  );
  return JSON.parse(raw);
});

export const loadCalendar = cache((): CalendarFile => {
  const raw = fs.readFileSync(
    path.join(DATA_DIR, "tcas-calendar-69.json"),
    "utf-8",
  );
  return JSON.parse(raw);
});

// ─── TCAS R3 dumps (cross-university, ~15 MB combined) ───────────────
// These are big. `cache()` ensures we parse once per request even if
// multiple server components ask for them. Future work: replace with
// paginated API endpoints so the client never receives the full dump.

export const loadTcasQuota = cache((): TcasQuotaFile => {
  const raw = fs.readFileSync(
    path.join(DATA_DIR, "tcas-quota-69.json"),
    "utf-8",
  );
  return JSON.parse(raw);
});

export const loadTcasStat = cache((): TcasStatFile => {
  const raw = fs.readFileSync(
    path.join(DATA_DIR, "tcas-stat-68.json"),
    "utf-8",
  );
  return JSON.parse(raw);
});
