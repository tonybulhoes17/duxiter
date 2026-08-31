import "server-only";

/**
 * USD -> BRL conversion. Prices are stored in USD (the catalogue reference);
 * customers are always charged in BRL. We fetch a live rate and cache it,
 * falling back to a configured constant if the provider is unreachable.
 */

const FALLBACK_RATE = Number(process.env.FX_USD_BRL_FALLBACK ?? "5.40");
const TTL_MS = 6 * 60 * 60 * 1000; // 6h
const PROVIDER = "https://economia.awesomeapi.com.br/json/last/USD-BRL";

let cache: { rate: number; at: number } | null = null;

export async function getUsdToBrlRate(): Promise<number> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.rate;

  try {
    const res = await fetch(PROVIDER, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const json = (await res.json()) as { USDBRL?: { bid?: string } };
      const rate = Number(json.USDBRL?.bid);
      if (Number.isFinite(rate) && rate > 1 && rate < 100) {
        cache = { rate, at: Date.now() };
        return rate;
      }
    }
  } catch {
    /* fall through to fallback / stale cache */
  }

  if (cache) return cache.rate; // stale but better than nothing
  return FALLBACK_RATE;
}

/** Convert a USD amount to BRL, rounded to 2 decimals. */
export function usdToBrl(amountUsd: number, rate: number): number {
  return Math.round(amountUsd * rate * 100) / 100;
}

/** BRL amount -> integer centavos for Stripe. */
export function toCentavos(amountBrl: number): number {
  return Math.round(amountBrl * 100);
}
