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

=== AUDIO-GUIDE (this IS the product) ===
The "audioguide" of each stop is the whole reason the traveller is using this app. Everything else is scaffolding. A thin audioguide makes the product worthless.

LENGTH — non-negotiable: every "audioguide" must be between 380 and 550 words. Not 200. Not 250. Count your words as you write and keep going until you are past 380. If you find yourself wrapping up before 380 words, you have left out material the traveller wants — add more: another layer of history, another figure, another anecdote, more about what to look at right now, more about how it connects to the rest of the walk. Do NOT be concise. Do NOT summarise. No bullet points, no lists — flowing spoken paragraphs only.

VOICE: an experienced local guide speaking out loud to one traveller who is standing in front of the place right now. A STORY, not an encyclopedia entry. Natural spoken phrasing: "Look up at the left tower…", "Take a few steps closer and notice…", "Picture this square two hundred years ago…", "Before we move on…".

CONTENT to weave together (never as a checklist): what you are looking at and why it matters; when and by whom it was built, and what was happening in the city and country then; the specific people involved and a concrete human story, anecdote or legend (say clearly when something is legend); exactly what to look at physically — materials, carvings, colours, proportions, the view; sounds, light, atmosphere; and how this place connects to the previous stop, the next stop and the wider city. Use real names, real dates and real events from your research — three vivid details told richly beat ten facts listed.

"intro_narration": 70–110 words, spoken — greet the traveller, name the city/area, say the walk length and roughly how many stops, set the mood, and tell them to walk to the first stop and press play when they arrive.

"to_next_stop": 55–95 words, spoken — guide them turn by turn as they walk ("Leave the square by the street to your right, keep the church behind you…"), and give them one specific thing to notice or think about on the way.

Do NOT put any URLs, brackets, footnote markers or source citations inside "intro_narration", "audioguide", "dont_miss" or "to_next_stop" — those texts are read aloud. Cite sources only inside "practical_tips".

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
  "intro_narration": "70-110 word spoken welcome in ${LANG_NAME[language] ?? "English"}",
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
      "audioguide": "380-550 words, flowing spoken narrative in ${LANG_NAME[language] ?? "English"} — obey the AUDIO-GUIDE LENGTH rule above, this is mandatory",
      "dont_miss": ["specific physical details to look for on site"],
      "to_next_stop": "55-95 word spoken, turn-by-turn walking directions to the next stop plus one thing to notice",
      "interesting_fact": "one surprising fact most tourists don't know"
    }
  ],
  "practical_tips": ["only tips that actually matter for THIS route — tickets, hours, reservations, weather, cash, restrooms, safety…"],
  "plan_b": ["what to drop or swap if it rains / a place is closed / time runs short — name the specific stop"]
}

BEFORE YOU RETURN — mandatory check: count the words in every "audioguide". If ANY is under 380 words, you are not done: expand each short one with more history, more people, more story, more of what to look at, until it is clearly past 380 words. Also confirm each reads as a spoken story, not a list of facts. Only when every audioguide passes both checks, return the JSON.
All coordinates must be real and accurate. The first stop's coordinates must be consistent with the starting point described above. Write every human-readable string in ${
    LANG_NAME[language] ?? "English"
  }.`;
}
