import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeItinerary } from "@/lib/itinerary";
import { synthesizeNarration } from "@/lib/tts";
import { isLocale } from "@/i18n/config";
import { isUuid } from "@/lib/validate";

export const runtime = "nodejs";
export const maxDuration = 60;

const BUCKET = "duxiter-public";

export async function POST(
  req: NextRequest,
  { params }: { params: { itineraryId: string } },
) {
  const id = params.itineraryId;
  if (!isUuid(id)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { stop?: number };
  const stopIndex = Number(body.stop);
  if (!Number.isInteger(stopIndex) || stopIndex < 0) {
    return NextResponse.json({ error: "bad_stop" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("ai_itineraries")
    .select("id, itinerary, generated_stops, language")
    .eq("id", id)
    .maybeSingle();
  if (!row) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const rich =
    normalizeItinerary(row.itinerary) ?? normalizeItinerary(row.generated_stops);
  const stop = rich?.stops[stopIndex];
  if (!rich || !stop) {
    return NextResponse.json({ error: "bad_stop" }, { status: 400 });
  }
  const lang = isLocale(row.language) ? row.language : "en";
  const text = stop.audioguide?.trim();
  if (!text || text.length < 20) {
    return NextResponse.json({ error: "no_text" }, { status: 422 });
  }

  // already done?
  const { data: existing } = await admin
    .from("itinerary_audios")
    .select("status, audio_url, duration_seconds")
    .eq("itinerary_id", id)
    .eq("stop_index", stopIndex)
    .eq("kind", "stop")
    .maybeSingle();
  if (existing?.status === "ready" && existing.audio_url) {
    return NextResponse.json({
      stopIndex,
      url: existing.audio_url,
      duration: existing.duration_seconds ?? null,
      status: "ready",
    });
  }

  await admin.from("itinerary_audios").upsert(
    {
      itinerary_id: id,
      stop_index: stopIndex,
      kind: "stop",
      status: "pending",
    },
    { onConflict: "itinerary_id,stop_index,kind" },
  );

  try {
    const { mp3, voice, charCount, durationSeconds } =
      await synthesizeNarration(text, lang);

    const path = `itinerary-audio/${id}/${stopIndex}.mp3`;
    const { error: upErr } = await admin.storage
      .from(BUCKET)
      .upload(path, mp3, { contentType: "audio/mpeg", upsert: true });
    if (upErr) throw new Error(`upload: ${upErr.message}`);

    const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
    const url = pub.publicUrl;

    await admin
      .from("itinerary_audios")
      .update({
        status: "ready",
        audio_path: path,
        audio_url: url,
        duration_seconds: durationSeconds,
        voice,
        char_count: charCount,
        error: null,
      })
      .eq("itinerary_id", id)
      .eq("stop_index", stopIndex)
      .eq("kind", "stop");

    return NextResponse.json({
      stopIndex,
      url,
      duration: durationSeconds,
      status: "ready",
    });
  } catch (err) {
    const detail =
      err instanceof Error ? err.message.slice(0, 300) : "unknown error";
    console.error("itinerary audio failed", id, stopIndex, detail);
    await admin
      .from("itinerary_audios")
      .update({ status: "failed", error: detail })
      .eq("itinerary_id", id)
      .eq("stop_index", stopIndex)
      .eq("kind", "stop");
    return NextResponse.json(
      { error: "synthesis_failed", detail },
      { status: 502 },
    );
  }
}
