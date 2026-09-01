import type { StartLocation, Pace } from "@/lib/itinerary";
import type { TravelMode } from "@/lib/database.types";

const LANG_NAME: Record<string, string> = {
  pt: "Brazilian Portuguese",
  en: "English",
  es: "Spanish",
};

const PACE_NOTE: Record<Pace, string> = {
  relaxed: "relaxed — fewer stops, more time at each, room to linger",
  normal: "normal — a balanced rhythm",
  intense: "intense — the traveller wants to see as much as realistically fits",
};

function timeLabel(min: number): string {
  if (min < 60) return `${min} minutes`;
  const h = min / 60;
  return `${h} hour${h > 1 ? "s" : ""}${min >= 240 ? " or more" : ""}`;
}

function startText(start: StartLocation, cityName: string): string {
  if (start.mode === "current" && start.lat != null && start.lng != null) {
    return `The traveller is RIGHT NOW at coordinates ${start.lat.toFixed(
      5,
    )}, ${start.lng.toFixed(
      5,
    )} (somewhere in ${cityName}). The itinerary MUST start from a real point of interest within a short walk of there.`;
  }
  if (start.mode === "area" && start.area?.trim()) {
    return `Start the itinerary in / near this area of ${cityName}: "${start.area.trim()}".`;
  }
  return `Choose the best starting point in ${cityName} yourself (a well-connected, walkable spot that makes for a logical route).`;
}

export function buildItineraryPrompt(opts: {
  cityName: string;
  country: string | null;
  language: string;
  travelMode: TravelMode;
  minutes: number;
  interests: string[];
  pace: Pace;
  start: StartLocation;
  startTime?: string;
  /** true when the place was typed by the user, not a curated Duxiter city */
  freeform?: boolean;
}): string {
  const {
    cityName,
    country,
    language,
    travelMode,
    minutes,
    interests,
    pace,
    start,
    startTime,
    freeform = false,
  } = opts;

  const interestText =
    interests.length > 0 ? interests.join(", ") : "a well-rounded highlights tour";

  const freeformBlock = freeform
    ? `

=== IMPORTANT: THIS PLACE WAS TYPED BY THE TRAVELLER ===
"${cityName}${country ? `, ${country}" ` : '" '}is exactly what the traveller entered. First, using web search, work out precisely which real place this is (city, town, district or region, and country). If the name is ambiguous, pick the most likely match for a traveller and state which one you chose in "summary.profile".
It may be a small town, a residential neighbourhood or a place with little tourist documentation. If information is thin:
- Still build the best honest route from what genuinely exists: the main square, old town, parish church, historic or notable buildings, local museum, cemetery of note, riverfront, viewpoints, parks, markets, monuments to local figures, characteristic streets.
- Say plainly in "summary.profile" and "practical_tips" that this is an off-the-beaten-path place with limited tourist infrastructure.
- NEVER invent places, names, dates, events or coordinates. Every stop must be a real place you are confident exists at the coordinates you give. When unsure, leave it out.
- If, after researching, you cannot assemble a route of at least 3 real, verifiable stops, DO NOT fabricate one. Instead return exactly: {"error":"insufficient_info","reason":"<one sentence, in ${LANG_NAME[language] ?? "English"}, explaining what little was found and suggesting the traveller try a larger nearby town or add a landmark>"}`
    : "";

  return `You are a professional local tour guide, local researcher, route planner and audio-guide writer.
Create a complete, personalised, realistically executable and genuinely interesting tour of ${cityName}${
    country ? `, ${country}` : ""
  }. It must work as a real personal guide that leads the traveller from start to finish — not just a list of attractions.${freeformBlock}

=== TRAVELLER ===
- ${startText(start, cityName)}
- Destination: ${cityName}
- Mode: ${travelMode === "car" ? "by car" : "walking tour"}
- Total time available: ${timeLabel(minutes)}${
    startTime ? `\n- Start time: ${startTime}` : ""
  }
- Main interests: ${interestText}
- Pace: ${PACE_NOTE[pace]}
- Language of the whole itinerary and audio-guide: ${LANG_NAME[language] ?? "English"}

=== RESEARCH (use web search) ===
Before building the route, research current information: main and lesser-known attractions that match the interests, historical/cultural sites, museums, monuments, churches, architecture, squares, parks, viewpoints, markets, notable streets and neighbourhoods, local food; and CURRENT practicalities — opening hours, closing days, whether tickets/reservations are needed, average visit duration, access conditions, temporary events or works that could affect the visit. Prefer places that truly match the traveller's interests over generic "top 10" picks. Find stories, curiosities, historical figures and details a guideless tourist would miss.

=== ROUTE ===
Build a geographically logical route from the starting point. Minimise backtracking. Make it REALISTIC for ${timeLabel(
    minutes,
  )} — choose fewer places and a rich experience over an impossible list. Aim for ${
    minutes <= 60 ? "3–4" : minutes <= 120 ? "4–5" : "5–7"
  } stops. For a ${
    travelMode === "car" ? "car tour use driving logic (parking, panoramic roads, quick stops)" : "walking tour keep consecutive stops close; the walk between stops is part of the experience"
  }.

=== AUDIO-GUIDE ===
Each stop's "audioguide" MUST be 250–450 words (about 2–4 minutes spoken) — this is the core of the product, do not write short. It must read like an experienced guide speaking directly to the traveller: a STORY, not an encyclopedia entry. Cover, when relevant: what it is, why it matters, when it was built, historical context, key events and figures, architecture and art, culture, curiosities, legends (say clearly when something is legend), what to look at, and how it connects to other stops. Use natural spoken phrasing ("Observe the building on your left…", "Before moving on, look up at…", "Imagine this square in the 1800s…").
Do NOT put any URLs, brackets, footnote markers or source citations inside "audioguide", "dont_miss" or "to_next_stop" — those texts are read aloud. You may cite sources only inside "practical_tips".

=== OUTPUT ===
Return ONLY a valid JSON object (no markdown fences, no prose before or after) with EXACTLY this shape:
{
  "summary": {
    "title": "short evocative title",
    "profile": "1-2 sentences describing the overall walk",
    "total_minutes": <int>,
    "total_distance_km": <number>,
    "travel_mode": "${travelMode}",
    "stop_count": <int>,
    "themes": ["..."],
    "start_time": "${startTime ?? "09:00"}",
    "end_time": "HH:MM"
  },
  "route_overview": "Start → Stop 1 → Stop 2 → … → end (with rough distance/time)",
  "stops": [
    {
      "title": "Stop name",
      "why_chosen": "why this place is in THIS traveller's route",
      "latitude": <real number>,
      "longitude": <real number>,
      "arrival_time": "HH:MM",
      "recommended_minutes": <int>,
      "distance_from_previous_m": <int>,
      "travel_minutes_from_previous": <int>,
      "category": "monument|museum|viewpoint|market|restaurant|park|church|square|neighbourhood|street",
      "audioguide": "250-450 word spoken narrative in ${LANG_NAME[language] ?? "English"}",
      "dont_miss": ["specific physical details to look for on site"],
      "to_next_stop": "how to walk/drive to the next stop, which streets, what to notice on the way, one curiosity",
      "interesting_fact": "one surprising fact most tourists don't know"
    }
  ],
  "practical_tips": ["only tips that actually matter for THIS route — tickets, hours, reservations, weather, cash, restrooms, safety…"],
  "plan_b": ["what to drop or swap if it rains / a place is closed / time runs short — name the specific stop"]
}

All coordinates must be real and accurate. The first stop's coordinates must be consistent with the starting point described above. Write every human-readable string in ${
    LANG_NAME[language] ?? "English"
  }.`;
}
