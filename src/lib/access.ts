import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { freeStopsCount } from "@/lib/format";
import type { TourRow } from "@/lib/database.types";

export type AccessState = "free" | "purchased" | "expired" | "locked";

/** True when this access state grants the full tour (all stops). */
export function hasFullAccess(state: AccessState): boolean {
  return state === "free" || state === "purchased";
}

/**
 * Given the total stop count and an access state, which stop indexes
 * (order_index) are unlocked. Preview stops stay unlocked for paid tours.
 */
export function unlockedThrough(totalStops: number, state: AccessState): number {
  if (hasFullAccess(state)) return totalStops;
  return freeStopsCount(totalStops); // first N stops are the free preview
}

export function isStopLocked(
  orderIndex: number,
  totalStops: number,
  state: AccessState,
): boolean {
  return orderIndex >= unlockedThrough(totalStops, state);
}

/**
 * Determine a user's access to a tour.
 * - free:      price is 0 — everyone gets everything
 * - purchased: a completed purchase that has not expired
 * - expired:   a completed purchase whose expires_at has passed
 * - locked:    paid tour, no purchase (15% preview applies)
 */
export async function getTourAccess(
  tour: Pick<TourRow, "id" | "price_usd">,
  userId: string | null,
): Promise<AccessState> {
  if (Number(tour.price_usd) === 0) return "free";
  if (!userId || !isSupabaseConfigured) return "locked";

  const supabase = createClient();
  const { data } = await supabase
    .from("purchases")
    .select("status, expires_at")
    .eq("user_id", userId)
    .eq("tour_id", tour.id)
    .eq("status", "completed")
    .maybeSingle();

  if (!data) return "locked";
  if (data.expires_at && new Date(data.expires_at) < new Date()) return "expired";
  return "purchased";
}
