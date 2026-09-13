import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { ItineraryPlayer } from "@/components/itinerary/itinerary-player";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth";
import { getItineraryAccess } from "@/lib/itinerary-access";
import { ITINERARY_FREE_STOPS, ITINERARY_PRICE_USD } from "@/lib/itinerary-pricing";
import { getUsdToBrlRate, usdToBrl } from "@/lib/fx";
import { formatBrl } from "@/lib/format";
import { isSupabaseConfigured } from "@/lib/env";
import { normalizeItinerary } from "@/lib/itinerary";
import { isUuid } from "@/lib/validate";
import type { Locale } from "@/i18n/config";

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

  const locale = (await getLocale()) as Locale;
  const user = await getSessionUser();
  const access = await getItineraryAccess(it.id, user?.id ?? null);
  const purchased = access === "purchased";

  const [audios, fxRate] = await Promise.all([
    createAdminClient()
      .from("itinerary_audios")
      .select("stop_index, kind, status, audio_url, duration_seconds")
      .eq("itinerary_id", it.id),
    getUsdToBrlRate(),
  ]);
  const priceLabel = formatBrl(usdToBrl(ITINERARY_PRICE_USD, fxRate), locale);

  // Lock stop content beyond the free preview until purchased. Coordinates
  // stay visible on every stop so the map still shows the whole route — only
  // the narration text is gated.
  const stops = rich.stops.map((s, i) => {
    const locked = !purchased && i >= ITINERARY_FREE_STOPS;
    if (!locked) return s;
    return {
      ...s,
      audioguide: "",
      to_next_stop: undefined,
      interesting_fact: undefined,
      dont_miss: [],
    };
  });
  const gatedItinerary = { ...rich, stops };

  // Audio for locked stops is never generated client-side, but filter here
  // too as defense in depth in case of a stale row from before purchase logic.
  const audioRows = (audios.data ?? []).filter(
    (a) => a.kind === "intro" || purchased || a.stop_index < ITINERARY_FREE_STOPS,
  );

  return (
    <ItineraryPlayer
      itineraryId={it.id}
      cityName={it.city_name ?? ""}
      itinerary={gatedItinerary}
      initialSaved={!!it.is_saved && user?.id === it.user_id}
      initialAudios={audioRows}
      access={access}
      freeStops={ITINERARY_FREE_STOPS}
      priceLabel={priceLabel}
    />
  );
}
