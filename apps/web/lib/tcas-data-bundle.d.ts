// Hand-written types for the JSON re-exported by tcas-data-bundle.js.
// TS resolves `./tcas-data-bundle` to this declaration; webpack resolves it
// to the sibling .js. Keeping the types here (instead of letting tsc infer
// them from the JSON) is what keeps the typecheck fast — see the .js header.
import type {
  CalendarFile,
  KkuQuotaFile,
  KkuStatFile,
  TcasQuotaFile,
  TcasStatFile,
} from "./tcas-data";

export const kkuQuota: KkuQuotaFile;
export const kkuStat: KkuStatFile;
export const tcasCalendar: CalendarFile;
export const tcasQuota: TcasQuotaFile;
export const tcasStat: TcasStatFile;
