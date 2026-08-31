import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type CodeError =
  | "not_found"
  | "inactive"
  | "expired"
  | "max_uses"
  | "wrong_tour";

export interface PriceQuote {
  basePriceUsd: number;
  discountUsd: number;
  finalPriceUsd: number;
  code: { id: string; code: string; label: string | null } | null;
  codeError: CodeError | null;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/**
 * Resolve the final USD price for a tour, applying a discount code if valid.
 * A bad code does not throw — it returns codeError and the undiscounted price.
 */
export async function quotePrice(
  tourId: string,
  basePriceUsd: number,
  rawCode?: string | null,
): Promise<PriceQuote> {
  const base = round2(Math.max(0, basePriceUsd));
  const empty: PriceQuote = {
    basePriceUsd: base,
    discountUsd: 0,
    finalPriceUsd: base,
    code: null,
    codeError: null,
  };

  const normalized = rawCode?.trim().toUpperCase();
  if (!normalized) return empty;

  const admin = createAdminClient();
  const { data: code } = await admin
    .from("discount_codes")
    .select(
      "id, code, description, discount_percent, discount_amount_usd, applies_to_tour_id, max_uses, used_count, expires_at, is_active",
    )
    .eq("code", normalized)
    .maybeSingle();

  if (!code) return { ...empty, codeError: "not_found" };
  if (!code.is_active) return { ...empty, codeError: "inactive" };
  if (code.expires_at && new Date(code.expires_at) < new Date())
    return { ...empty, codeError: "expired" };
  if (code.max_uses != null && code.used_count >= code.max_uses)
    return { ...empty, codeError: "max_uses" };
  if (code.applies_to_tour_id && code.applies_to_tour_id !== tourId)
    return { ...empty, codeError: "wrong_tour" };

  let discount = 0;
  if (code.discount_percent) {
    discount = round2((base * code.discount_percent) / 100);
  } else if (code.discount_amount_usd) {
    discount = round2(Number(code.discount_amount_usd));
  }
  discount = Math.min(discount, base);

  return {
    basePriceUsd: base,
    discountUsd: discount,
    finalPriceUsd: round2(base - discount),
    code: { id: code.id, code: code.code, label: code.description },
    codeError: null,
  };
}
