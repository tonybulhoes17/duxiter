/** The paid "extra photo identifications" pack. */
export const IDENTIFY_PACK_CREDITS = Number(
  process.env.IDENTIFY_PACK_CREDITS ?? process.env.NEXT_PUBLIC_IDENTIFY_PACK_CREDITS ?? 10,
);

/** Price in BRL (reais). */
export const IDENTIFY_PACK_PRICE_BRL = Number(
  process.env.IDENTIFY_PACK_PRICE_BRL ??
    process.env.NEXT_PUBLIC_IDENTIFY_PACK_PRICE_BRL ??
    9.9,
);

/** Free identifications per calendar day before credits are consumed. */
export const IDENTIFY_FREE_DAILY = Number(
  process.env.IDENTIFY_FREE_DAILY ?? process.env.NEXT_PUBLIC_IDENTIFY_FREE_DAILY ?? 2,
);

export function identifyPackPriceLabel(): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(IDENTIFY_PACK_PRICE_BRL);
}
