import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTourAccess, isStopLocked } from "@/lib/access";
import { freeStopsCount } from "@/lib/format";
import { isUuid } from "@/lib/validate";
import type {
  StopAudioRow,
  StopImageRow,
  TourStopRow,
} from "@/lib/database.types";

/**
 * Stops for a tour, with the 15% paywall applied per the caller's session.
 * Locked stops return title + order only — never their content or audio URL.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { tourId: string } },
) {
  if (!isUuid(params.tourId)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const supabase = createClient();
  const admin = createAdminClient();

  const { data: tour } = await admin
    .from("tours")
    .select("id, price_usd, type, status, is_active")
    .eq("id", params.tourId)
    .maybeSingle();

  if (!tour || tour.status !== "approved" || !tour.is_active) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const access = await getTourAccess(tour, user?.id ?? null);

  // Admin client so RLS on stop_audios doesn't hide segments — this route
  // enforces the paywall itself (locked stops return title only).
  const { data: rows } = await admin
    .from("tour_stops")
    .select("*, stop_images(*), stop_audios(*)")
    .eq("tour_id", tour.id)
    .order("order_index", { ascending: true });

  const stops = (rows ?? []) as unknown as (TourStopRow & {
    stop_images: StopImageRow[];
    stop_audios: StopAudioRow[];
  })[];
  const total = stops.length;

  const payload = stops.map((s) => {
    const locked = isStopLocked(s.order_index, total, access);
    if (locked) {
      return {
        id: s.id,
        order_index: s.order_index,
        title: s.title,
        locked: true as const,
      };
    }
    const audios = [...(s.stop_audios ?? [])]
      .sort((a, b) => a.order_index - b.order_index)
      .map((a) => ({
        id: a.id,
        url: `/api/audio/segment/${a.id}`,
        duration: a.duration_seconds,
        label: a.label,
      }));
    return {
      id: s.id,
      order_index: s.order_index,
      title: s.title,
      description: s.description,
      latitude: s.latitude,
      longitude: s.longitude,
      audios,
      images: [...(s.stop_images ?? [])].sort(
        (a, b) => a.order_index - b.order_index,
      ),
      locked: false as const,
    };
  });

  return NextResponse.json({
    tourId: tour.id,
    type: tour.type,
    access,
    freeCount: freeStopsCount(total),
    total,
    stops: payload,
  });
}
