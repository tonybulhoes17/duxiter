import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/env";

/**
 * Server-side arrival tracking for UTM-tagged traffic (ad campaigns).
 * Runs during SSR, before any client JS — catches visitors who bounce
 * before hydration, which client-only tracking silently drops.
 */
export async function logServerTourView(
  tourId: string,
  utm: { utm_source?: string; utm_medium?: string; utm_campaign?: string },
) {
  if (!isSupabaseConfigured || !utm.utm_source) return;
  try {
    await createAdminClient()
      .from("analytics_events")
      .insert({
        event_type: "tour_view",
        tour_id: tourId,
        metadata: {
          utm_source: utm.utm_source,
          utm_medium: utm.utm_medium ?? null,
          utm_campaign: utm.utm_campaign ?? null,
          capture: "server",
        },
      });
  } catch {
    /* analytics must never break the page */
  }
}
