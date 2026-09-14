/**
 * AI itinerary pricing: generation itself is free (no daily limit, no
 * credits) — only unlocking the full narration of a specific generated
 * itinerary costs money, one time, for that itinerary. Mirrors the tour
 * purchase model (price in USD, charged in BRL at the live rate) rather
 * than a credit wallet.
 */
export const ITINERARY_PRICE_USD = Number(
  process.env.ITINERARY_PRICE_USD ?? process.env.NEXT_PUBLIC_ITINERARY_PRICE_USD ?? 3.9,
);

/** Stops unlocked before payment (order_index 0..N-1). */
export const ITINERARY_FREE_STOPS = Number(
  process.env.ITINERARY_FREE_STOPS ?? process.env.NEXT_PUBLIC_ITINERARY_FREE_STOPS ?? 1,
);
