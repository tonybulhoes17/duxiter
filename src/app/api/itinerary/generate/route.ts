import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createOpenAI,
  ITINERARY_MODEL,
  ITINERARY_WEB_SEARCH,
  extractJsonObject,
} from "@/lib/openai";
import { buildItineraryPrompt } from "@/lib/itinerary-prompt";
import {
  normalizeItinerary,
  TIME_OPTIONS,
  INTERESTS,
  PACE_OPTIONS,
  START_MODES,
  type Pace,
  type StartLocation,
  type StartMode,
} from "@/lib/itinerary";
import { isLocale } from "@/i18n/config";
import type { Json, TravelMode } from "@/lib/database.types";

export const runtime = "nodejs";
export const maxDuration = 120;

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
    minutes?: number;
    travelMode?: TravelMode;
    interests?: string[];
    language?: string;
    pace?: Pace;
    startTime?: string;
    start?: { mode?: StartMode; lat?: number; lng?: number; area?: string };
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
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

  const startMode: StartMode = START_MODES.includes(body.start?.mode as never)
    ? (body.start!.mode as StartMode)
    : "auto";
  const start: StartLocation = {
    mode: startMode,
    lat:
      startMode === "current" && typeof body.start?.lat === "number"
        ? body.start.lat
        : undefined,
    lng:
      startMode === "current" && typeof body.start?.lng === "number"
        ? body.start.lng
        : undefined,
    area:
      startMode === "area" && typeof body.start?.area === "string"
        ? body.start.area.slice(0, 120)
        : undefined,
  };

  const { data: city } = await supabase
    .from("cities")
    .select("id, slug, name, country")
    .eq("slug", body.citySlug ?? "")
    .eq("is_active", true)
    .maybeSingle();
  if (!city) {
    return NextResponse.json({ error: "unknown_city" }, { status: 400 });
  }

  const cityName =
    (city.name as Record<string, string>)?.en ??
    (city.name as Record<string, string>)?.pt ??
    city.slug;

  const prompt = buildItineraryPrompt({
    cityName,
    country: city.country,
    language,
    travelMode,
    minutes,
    interests,
    pace,
    start,
    startTime,
  });

  let itinerary;
  try {
    const openai = createOpenAI();
    let text: string;

    if (ITINERARY_WEB_SEARCH) {
      const res = await openai.responses.create({
        model: ITINERARY_MODEL,
        tools: [{ type: "web_search" }],
        input: prompt,
      });
      text = res.output_text ?? "";
    } else {
      const completion = await openai.chat.completions.create({
        model: ITINERARY_MODEL,
        temperature: 0.6,
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

    itinerary = normalizeItinerary(extractJsonObject(text));
  } catch (err) {
    console.error("itinerary generation failed", err);
    return NextResponse.json({ error: "generation_failed" }, { status: 502 });
  }

  if (!itinerary) {
    return NextResponse.json({ error: "generation_failed" }, { status: 502 });
  }

  const { data: saved, error } = await supabase
    .from("ai_itineraries")
    .insert({
      user_id: user.id,
      city_id: city.id,
      city_name: cityName,
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
    })
    .select("id")
    .single();

  if (error || !saved) {
    console.error("itinerary save failed", error);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  await supabase.from("analytics_events").insert({
    event_type: "itinerary_generate",
    city_id: city.id,
    user_id: user.id,
    metadata: { travel_mode: travelMode, minutes, pace },
  });

  return NextResponse.json({ id: saved.id });
}
