// Lightweight client-side console ring buffer for bug reports. Patches
// console.error / console.warn once to record the last N entries; the bug
// dialog reads them as an opt-in attachment (the checkbox, default on).
//
// Privacy: nothing leaves the browser unless the user submits a report with
// the "include console log" box ticked — this only buffers in memory.

const MAX_ENTRIES = 50;
const buffer: string[] = [];
let installed = false;

function record(level: string, args: unknown[]): void {
  const parts = args.map((a) => {
    if (typeof a === "string") return a;
    if (a instanceof Error) return `${a.name}: ${a.message}`;
    try {
      return JSON.stringify(a);
    } catch {
      return String(a);
    }
  });
  buffer.push(`[${level}] ${parts.join(" ")}`);
  if (buffer.length > MAX_ENTRIES) buffer.shift();
}

/** Idempotently wrap console.error / console.warn. Safe to call on every
 *  mount; only the first call patches. No-op during SSR. */
export function installConsoleCapture(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;

  const origError = console.error.bind(console);
  const origWarn = console.warn.bind(console);

  console.error = (...args: unknown[]) => {
    record("error", args);
    origError(...args);
  };
  console.warn = (...args: unknown[]) => {
    record("warn", args);
    origWarn(...args);
  };
}

/** The captured entries, newest last, joined as a single string. Empty
 *  string when nothing was captured. */
export function getConsoleLog(): string {
  return buffer.join("\n");
}
