/** Currencies offered in the trip creator. Others still work if typed. */
export const TRIP_CURRENCIES = [
  "BRL",
  "USD",
  "EUR",
  "GBP",
  "ARS",
  "CLP",
  "MXN",
  "JPY",
  "CHF",
  "CAD",
  "AUD",
] as const;

export function cleanName(v: unknown, max = 60): string {
  return typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "";
}

export function cleanEmoji(v: unknown): string {
  const s = typeof v === "string" ? v.trim() : "";
  return s && s.length <= 16 ? s : "";
}

export function cleanCurrency(v: unknown): string | null {
  return typeof v === "string" && /^[A-Za-z]{3}$/.test(v.trim())
    ? v.trim().toUpperCase()
    : null;
}

export function cleanAmount(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || n <= 0 || n > 1_000_000_000) return null;
  return Math.round(n * 100) / 100;
}

export function cleanDate(v: unknown): string {
  const s = typeof v === "string" ? v.slice(0, 10) : "";
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : new Date().toISOString().slice(0, 10);
}
