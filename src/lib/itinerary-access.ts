import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export type ItineraryAccessState = "purchased" | "locked";

/**
 * Access to the full narration of one generated itinerary. Unlike tours,
 * there's no free tier and no expiry — generation is always free, and a
 * completed purchase unlocks that itinerary for good.
 */
export async function getItineraryAccess(
  itineraryId: string,
  userId: string | null,
): Promise<ItineraryAccessState> {
  if (!userId || !isSupabaseConfigured) return "locked";

  const supabase = createClient();
  const { data } = await supabase
    .from("itinerary_purchases")
    .select("status")
    .eq("user_id", userId)
    .eq("itinerary_id", itineraryId)
    .eq("status", "completed")
    .maybeSingle();

  return data ? "purchased" : "locked";
}
