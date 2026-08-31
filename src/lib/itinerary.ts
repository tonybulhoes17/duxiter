import type { TravelMode } from "@/lib/database.types";

export const TIME_OPTIONS = [30, 60, 120, 180, 240] as const;
export type TimeOption = (typeof TIME_OPTIONS)[number];

export const PACE_OPTIONS = ["relaxed", "normal", "intense"] as const;
export type Pace = (typeof PACE_OPTIONS)[number];

export const START_MODES = ["current", "area", "auto"] as const;
export type StartMode = (typeof START_MODES)[number];

export interface StartLocation {
  mode: StartMode;
  lat?: number;
  lng?: number;
  area?: string;
}

export const INTERESTS = [
  { id: "history", emoji: "🏛️" },
  { id: "architecture", emoji: "🏗️" },
  { id: "food", emoji: "🍽️" },
  { id: "art", emoji: "🎨" },
  { id: "nature", emoji: "🌿" },
  { id: "photography", emoji: "📸" },
  { id: "nightlife", emoji: "🌙" },
  { id: "religious", emoji: "💒" },
] as const;

export type InterestId = (typeof INTERESTS)[number]["id"];
export const TRAVEL_MODES: TravelMode[] = ["walking", "car"];

/** ---- rich itinerary shape returned by the model ---- */

export interface ItineraryStop {
  title: string;
  why_chosen?: string;
  latitude: number;
  longitude: number;
  arrival_time?: string;
  recommended_minutes: number;
  distance_from_previous_m?: number;
  travel_minutes_from_previous?: number;
  category: string;
  audioguide: string;
  dont_miss: string[];
  to_next_stop?: string;
  interesting_fact?: string;
}

export interface RichItinerary {
  summary: {
    title: string;
    profile?: string;
    total_minutes: number;
    total_distance_km?: number;
    travel_mode?: TravelMode;
    stop_count: number;
    themes?: string[];
    start_time?: string;
    end_time?: string;
  };
  route_overview?: string;
  stops: ItineraryStop[];
  practical_tips?: string[];
  plan_b?: string[];
}

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v.trim() : fallback;
}
function num(v: unknown): number {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : NaN;
}
function strArr(v: unknown): string[] {
  return Array.isArray(v)
    ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    : [];
}

function coerceStop(v: unknown): ItineraryStop | null {
  if (!v || typeof v !== "object") return null;
  const s = v as Record<string, unknown>;
  const lat = num(s.latitude ?? s.lat);
  const lng = num(s.longitude ?? s.lng);
  const title = str(s.title ?? s.name);
  if (!title || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    title,
    why_chosen: str(s.why_chosen) || undefined,
    latitude: lat,
    longitude: lng,
    arrival_time: str(s.arrival_time) || undefined,
    recommended_minutes:
      Math.round(num(s.recommended_minutes ?? s.estimated_time_minutes)) || 20,
    distance_from_previous_m:
      Number.isFinite(num(s.distance_from_previous_m))
        ? Math.round(num(s.distance_from_previous_m))
        : undefined,
    travel_minutes_from_previous: Number.isFinite(
      num(s.travel_minutes_from_previous ?? s.walk_minutes_from_previous),
    )
      ? Math.round(
          num(s.travel_minutes_from_previous ?? s.walk_minutes_from_previous),
        )
      : undefined,
    category: str(s.category) || "neighborhood",
    audioguide: str(s.audioguide ?? s.description ?? s.narrative),
    dont_miss: strArr(s.dont_miss),
    to_next_stop: str(s.to_next_stop ?? s.how_to_next) || undefined,
    interesting_fact: str(s.interesting_fact) || undefined,
  };
}

/** Accepts the model's object OR a legacy array of simple stops. */
export function normalizeItinerary(raw: unknown): RichItinerary | null {
  let obj: Record<string, unknown> | null = null;

  if (Array.isArray(raw)) {
    obj = { stops: raw };
  } else if (raw && typeof raw === "object") {
    obj = raw as Record<string, unknown>;
    if (Array.isArray((obj as { itinerary?: unknown }).itinerary)) {
      obj = { stops: (obj as { itinerary: unknown[] }).itinerary };
    } else if (
      (obj as { itinerary?: unknown }).itinerary &&
      typeof (obj as { itinerary?: unknown }).itinerary === "object"
    ) {
      obj = (obj as { itinerary: Record<string, unknown> }).itinerary;
    }
  }
  if (!obj) return null;

  const rawStops = Array.isArray(obj.stops)
    ? obj.stops
    : Array.isArray(obj.generated_stops)
      ? obj.generated_stops
      : [];
  const stops = rawStops
    .map(coerceStop)
    .filter((s): s is ItineraryStop => s !== null);
  if (stops.length < 3) return null;

  const summaryRaw = (obj.summary ?? {}) as Record<string, unknown>;
  const totalFromStops = stops.reduce(
    (a, s) => a + s.recommended_minutes + (s.travel_minutes_from_previous ?? 0),
    0,
  );

  return {
    summary: {
      title: str(summaryRaw.title) || str(obj.title) || "Roteiro personalizado",
      profile: str(summaryRaw.profile) || undefined,
      total_minutes:
        Math.round(num(summaryRaw.total_minutes)) || totalFromStops || 120,
      total_distance_km: Number.isFinite(num(summaryRaw.total_distance_km))
        ? Math.round(num(summaryRaw.total_distance_km) * 10) / 10
        : undefined,
      travel_mode:
        summaryRaw.travel_mode === "car" ? "car" : "walking",
      stop_count: stops.length,
      themes: strArr(summaryRaw.themes),
      start_time: str(summaryRaw.start_time) || undefined,
      end_time: str(summaryRaw.end_time) || undefined,
    },
    route_overview: str(obj.route_overview) || undefined,
    stops,
    practical_tips: strArr(obj.practical_tips),
    plan_b: strArr(obj.plan_b),
  };
}
