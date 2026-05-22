import {
  loadCalendar,
  loadKkuQuota,
  loadKkuStat,
  loadTcasQuota,
  loadTcasStat,
} from "@/lib/tcas-data-server";
import {
  type UnifiedProgram,
  mapKkuProgram,
  mapTcasProgram,
} from "@/lib/tcas-unified";

import { TcasCalculator } from "./_components/tcas-calculator";

// /tcas — ported from the Claude Design wireframe direction
// (pee-rahat/project/tcas-search-wf.jsx). Two pages in one screen:
//   Home   → tab pill · search · filter | program grid 3×3 | calendar
//   Detail → back · score input · dark zone advice · similar · pie+past-year
export default async function TcasPage() {
  // Five scraped JSON files loaded server-side via fs. Temporary dev
  // scaffold until the Prisma + API endpoints land per NETSAT-TCAS-DB.md.
  const [kkuQuota, kkuStat, tcasQuota, tcasStat, calendar] = [
    loadKkuQuota(),
    loadKkuStat(),
    loadTcasQuota(),
    loadTcasStat(),
    loadCalendar(),
  ];

  // Build the unified program list once on the server. Joining the
  // stat records here keeps the client payload smaller (no need to
  // ship both files separately).
  const kkuStatByKey = new Map<string, (typeof kkuStat.records)[number]>();
  for (const r of kkuStat.records) {
    kkuStatByKey.set(`${r.faculty}|${r.program_name}`, r);
  }
  const tcasStatById = new Map<string, (typeof tcasStat.records)[number]>();
  for (const r of tcasStat.records) {
    tcasStatById.set(r.external_id, r);
  }

  // Raw TCAS quota contains many byte-identical duplicate rows (one
  // external_id can repeat 100+ times across project_ids). Map first,
  // then keep first occurrence per unified id so React keys stay unique
  // — duplicate keys silently kept stale ProgramCard nodes mounted
  // through filter changes, which looked like the filter was broken.
  const raw: UnifiedProgram[] = [
    ...kkuQuota.programs.map((p) =>
      mapKkuProgram(p, kkuStatByKey.get(`${p.faculty}|${p.program_name}`)),
    ),
    ...tcasQuota.programs.map((p) =>
      mapTcasProgram(p, tcasStatById.get(p.external_id)),
    ),
  ];
  const seen = new Set<string>();
  const programs: UnifiedProgram[] = [];
  for (const p of raw) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    programs.push(p);
  }

  return <TcasCalculator programs={programs} calendar={calendar} />;
}
