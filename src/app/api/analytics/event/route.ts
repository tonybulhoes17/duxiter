import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { isUuid } from "@/lib/validate";
import type { Json } from "@/lib/database.types";

const EVENT_TYPES = new Set([
  "tour_view",
  "tour_start",
  "tour_complete",
  "city_view",
  "itinerary_generate",
  "camera_open",
]);

export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured) return NextResponse.json({ ok: true });

  let body: {
    event_type?: string;
    tour_id?: string;
    city_id?: string;
    metadata?: Record<string, unknown>;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  if (!body.event_type || !EVENT_TYPES.has(body.event_type)) {
    return NextResponse.json({ error: "bad_event" }, { status: 400 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.from("analytics_events").insert({
    event_type: body.event_type,
    tour_id: isUuid(body.tour_id) ? body.tour_id : null,
    city_id: isUuid(body.city_id) ? body.city_id : null,
    user_id: user?.id ?? null,
    metadata: (body.metadata ?? null) as Json,
  });

  return NextResponse.json({ ok: true });
}
