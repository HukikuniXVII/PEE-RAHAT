// Untyped JSON-bundling shim for the /tcas scaffold — see tcas-data-server.ts.
// Kept as a plain .js: the web tsconfig `include` covers only .ts/.tsx, so
// this file stays out of the TS program and tsc never deep-infers the ~16 MB
// of JSON literal types these imports would otherwise produce. webpack still
// bundles the JSON into the Next.js standalone server output, and the
// adjacent tcas-data-bundle.d.ts supplies the real types to TS consumers.
import kkuQuota from "../../api/scripts/scrapers/data/kku-quota-69.json";
import kkuStat from "../../api/scripts/scrapers/data/kku-stat-68.json";
import tcasCalendar from "../../api/scripts/scrapers/data/tcas-calendar-69.json";
import tcasQuota from "../../api/scripts/scrapers/data/tcas-quota-69.json";
import tcasStat from "../../api/scripts/scrapers/data/tcas-stat-68.json";

export { kkuQuota, kkuStat, tcasCalendar, tcasQuota, tcasStat };
