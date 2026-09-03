import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ItineraryPlayer } from "@/components/itinerary/itinerary-player";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { normalizeItinerary } from "@/lib/itinerary";
import { isUuid } from "@/lib/validate";

interface Props {
  params: { itineraryId: string };
}

async function loadItinerary(id: string) {
  if (!isUuid(id) || !isSupabaseConfigured) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("ai_itineraries")
    .select("id, user_id, city_name, itinerary, generated_stops, is_saved")
    .eq("id", id)
    .maybeSingle();
  return data ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const it = await loadItinerary(params.itineraryId);
  if (!it) return {};
  return { title: it.city_name ?? "Itinerary", robots: { index: false } };
}

export default async function ItineraryPage({ params }: Props) {
  const it = await loadItinerary(params.itineraryId);
  if (!it) notFound();

  const rich =
    normalizeItinerary(it.itinerary) ?? normalizeItinerary(it.generated_stops);
  if (!rich) notFound();

  const [user, audios] = await Promise.all([
    getSessionUser(),
    createAdminClient()
      .from("itinerary_audios")
      .select("stop_index, status, audio_url, duration_seconds")
      .eq("itinerary_id", it.id)
      .eq("kind", "stop"),
  ]);

  return (
    <ItineraryPlayer
      itineraryId={it.id}
      cityName={it.city_name ?? ""}
      itinerary={rich}
      initialSaved={!!it.is_saved && user?.id === it.user_id}
      initialAudios={audios.data ?? []}
    />
  );
}
