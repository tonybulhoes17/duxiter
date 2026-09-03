/** The paid "extra itineraries" pack. */
export const ITINERARY_PACK_CREDITS = Number(
  process.env.ITINERARY_PACK_CREDITS ?? process.env.NEXT_PUBLIC_ITINERARY_PACK_CREDITS ?? 5,
);

/** Price in BRL (reais). */
export const ITINERARY_PACK_PRICE_BRL = Number(
  process.env.ITINERARY_PACK_PRICE_BRL ??
    process.env.NEXT_PUBLIC_ITINERARY_PACK_PRICE_BRL ??
    14.9,
);

export function itineraryPackPriceLabel(): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(ITINERARY_PACK_PRICE_BRL);
}
