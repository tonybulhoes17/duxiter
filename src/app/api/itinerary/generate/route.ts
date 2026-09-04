import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createOpenAI,
  ITINERARY_MODEL,
  ITINERARY_WEB_SEARCH,
  extractJsonObject,
} from "@/lib/openai";
import { buildItineraryPrompt } from "@/lib/itinerary-prompt";
import { expandAudioguides, avgAudioguideWords } from "@/lib/itinerary-expand";
import {
  normalizeItinerary,
  TIME_OPTIONS,
  INTERESTS,
  PACE_OPTIONS,
  START_MODES,
  type Destination,
  type Pace,
  type RichItinerary,
  type StartLocation,
  type StartMode,
} from "@/lib/itinerary";
import { isLocale } from "@/i18n/config";
import type { Json, TravelMode } from "@/lib/database.types";

export const runtime = "nodejs";
export const maxDuration = 120;

function clampCoord(v: unknown, max: number): number | undefined {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && Math.abs(n) <= max ? n : undefined;
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: {
    citySlug?: string;
    destination?: {
      query?: string;
      area?: string;
      lat?: number;
      lng?: number;
      label?: string;
    };
    minutes?: number;
    travelMode?: TravelMode;
    interests?: string[];
    language?: string;
    pace?: Pace;
    startTime?: string;
    start?: { mode?: StartMode; lat?: number; lng?: number; area?: string };
    tzOffsetMinutes?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  // ---- daily quota: 1 free AI itinerary per calendar day, then paid credits ----
  const tz = Number.isFinite(body.tzOffsetMinutes)
    ? (body.tzOffsetMinutes as number)
    : 0;
  const localNow = Date.now() - tz * 60000;
  const startOfLocalDayUtc =
    Math.floor(localNow / 86400000) * 86400000 + tz * 60000;
  const { count: todayCount } = await supabase
    .from("ai_itineraries")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", new Date(startOfLocalDayUtc).toISOString());

  let consumeCredit = false;
  if ((todayCount ?? 0) >= 1) {
    const { data: cred, error: credErr } = await createAdminClient()
      .from("itinerary_credits")
      .select("balance")
      .eq("user_id", user.id)
      .maybeSingle();
    if (credErr) console.error("credit read failed", credErr);
    if (!cred || cred.balance <= 0) {
      return NextResponse.json(
        { error: "daily_limit", creditsAvailable: false },
        { status: 402 },
      );
    }
    consumeCredit = true;
  }

  const minutes = TIME_OPTIONS.includes(body.minutes as never)
    ? (body.minutes as number)
    : 120;
  const travelMode: TravelMode = body.travelMode === "car" ? "car" : "walking";
  const language = isLocale(body.language) ? body.language : "en";
  const pace: Pace = PACE_OPTIONS.includes(body.pace as never)
    ? (body.pace as Pace)
    : "normal";
  const validIds = INTERESTS.map((i) => i.id) as string[];
  const interests = (body.interests ?? []).filter((i) => validIds.includes(i));
  const startTime =
    typeof body.startTime === "string" && /^\d{1,2}:\d{2}$/.test(body.startTime)
      ? body.startTime
      : undefined;

  // ------- resolve the place: curated city OR free-form destination -------
  const destQuery =
    typeof body.destination?.query === "string"
      ? body.destination.query.trim().slice(0, 120)
      : "";

  let city: {
    id: string;
    slug: string;
    country: string | null;
    displayName: string;
  } | null = null;
  if (body.citySlug) {
    const { data } = await supabase
      .from("cities")
      .select("id, slug, name, country")
      .eq("slug", body.citySlug)
      .eq("is_active", true)
      .maybeSingle();
    if (data) {
      const nm = data.name as Record<string, string>;
      city = {
        id: data.id,
        slug: data.slug,
        country: data.country,
        displayName: nm?.en ?? nm?.pt ?? data.slug,
      };
    }
  }

  const freeform = !city;
  if (freeform && destQuery.length < 2) {
    return NextResponse.json({ error: "no_destination" }, { status: 400 });
  }

  let placeName: string;
  let country: string | null;
  let start: StartLocation;
  let destination: Destination | null = null;

  if (city) {
    placeName = city.displayName;
    country = city.country;
    const startMode: StartMode = START_MODES.includes(body.start?.mode as never)
      ? (body.start!.mode as StartMode)
      : "auto";
    start = {
      mode: startMode,
      lat:
        startMode === "current" ? clampCoord(body.start?.lat, 90) : undefined,
      lng:
        startMode === "current" ? clampCoord(body.start?.lng, 180) : undefined,
      area:
        startMode === "area" && typeof body.start?.area === "string"
          ? body.start.area.slice(0, 120)
          : undefined,
    };
  } else {
    const area =
      typeof body.destination?.area === "string"
        ? body.destination.area.trim().slice(0, 200)
        : undefined;
    const lat = clampCoord(body.destination?.lat, 90);
    const lng = clampCoord(body.destination?.lng, 180);
    const label =
      typeof body.destination?.label === "string"
        ? body.destination.label.trim().slice(0, 160)
        : undefined;
    destination = { query: destQuery, area, lat, lng, label };
    placeName = destQuery;
    country = null;
    start =
      lat != null && lng != null
        ? { mode: "current", lat, lng }
        : area
          ? { mode: "area", area }
          : { mode: "auto" };
  }

  const prompt = buildItineraryPrompt({
    cityName: placeName,
    country,
    language,
    travelMode,
    minutes,
    interests,
    pace,
    start,
    startTime,
    freeform,
  });

  let rawObject: unknown;
  try {
    const openai = createOpenAI();
    let text: string;

    if (ITINERARY_WEB_SEARCH) {
      const res = await openai.responses.create({
        model: ITINERARY_MODEL,
        tools: [{ type: "web_search" }],
        input: prompt,
        // rich audioguides for 5-7 stops need a lot of room, or the model
        // shortens the prose to fit
        max_output_tokens: 16000,
      });
      text = res.output_text ?? "";
    } else {
      const completion = await openai.chat.completions.create({
        model: ITINERARY_MODEL,
        temperature: 0.6,
        max_tokens: 16000,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are a meticulous local travel guide who only returns valid JSON.",
          },
          { role: "user", content: prompt },
        ],
      });
      text = completion.choices[0]?.message?.content ?? "{}";
    }

    rawObject = extractJsonObject(text);
  } catch (err) {
    console.error("itinerary generation failed", err);
    return NextResponse.json({ error: "generation_failed" }, { status: 502 });
  }

  // model's honest "I couldn't find enough about this place" escape hatch
  if (
    rawObject &&
    typeof rawObject === "object" &&
    (rawObject as { error?: string }).error === "insufficient_info"
  ) {
    const reason = String(
      (rawObject as { reason?: unknown }).reason ?? "",
    ).slice(0, 400);
    return NextResponse.json(
      { error: "insufficient_info", reason },
      { status: 422 },
    );
  }

  let itinerary = normalizeItinerary(rawObject);
  if (!itinerary) {
    return NextResponse.json({ error: "generation_failed" }, { status: 502 });
  }

  // second pass: expand thin audioguides into full 400-550 word narration.
  // Focused per-stop rewrites hit the length target far better than pass 1.
  if (avgAudioguideWords(itinerary) < 340) {
    try {
      const expanded = await Promise.race([
        expandAudioguides(
          itinerary,
          language,
          destination?.label || destination?.query || placeName,
        ),
        new Promise<RichItinerary>((_, rej) =>
          setTimeout(() => rej(new Error("expand timeout")), 24000),
        ),
      ]);
      itinerary = expanded;
    } catch (err) {
      console.warn("audioguide expansion skipped:", (err as Error).message);
    }
  }

  const storedName = destination?.label || destination?.query || placeName;
  const baseRow = {
    user_id: user.id,
    city_id: city?.id ?? null,
    city_name: storedName,
    language,
    travel_mode: travelMode,
    available_time_minutes: minutes,
    interests,
    pace,
    start_time: startTime ?? null,
    start_location: start as unknown as Json,
    generated_stops: itinerary.stops as unknown as Json,
    itinerary: itinerary as unknown as Json,
    is_saved: false,
  };

  let ins = await supabase
    .from("ai_itineraries")
    .insert({ ...baseRow, destination: destination as unknown as Json })
    .select("id")
    .single();

  // `destination` column is added by migration 005 — fall back if it's not there yet
  if (ins.error && /destination/i.test(ins.error.message ?? "")) {
    ins = await supabase
      .from("ai_itineraries")
      .insert(baseRow)
      .select("id")
      .single();
  }

  if (ins.error || !ins.data) {
    console.error("itinerary save failed", ins.error);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }
  const saved = ins.data;

  if (consumeCredit) {
    // service-role write — RLS only grants the user read access
    const admin = createAdminClient();
    const { data: cur } = await admin
      .from("itinerary_credits")
      .select("balance")
      .eq("user_id", user.id)
      .maybeSingle();
    if (cur && cur.balance > 0) {
      await admin
        .from("itinerary_credits")
        .update({ balance: cur.balance - 1 })
        .eq("user_id", user.id);
    }
  }

  await supabase.from("analytics_events").insert({
    event_type: "itinerary_generate",
    city_id: city?.id ?? null,
    user_id: user.id,
    metadata: {
      mode: freeform ? "free" : "curated",
      minutes,
      pace,
      travel_mode: travelMode,
      ...(freeform ? { destination: destQuery } : {}),
    },
  });

  return NextResponse.json({ id: saved.id });
}
