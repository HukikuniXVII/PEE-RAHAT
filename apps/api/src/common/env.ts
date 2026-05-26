/**
 * Shared env-var helpers. Kept in /common so every module that reads
 * tuning knobs from process.env validates them the same way.
 */

/** Parse a positive-integer env var, falling back to a default. */
export function readPositiveInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return n;
}
