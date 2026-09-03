import "server-only";

import { createOpenAI, ITINERARY_MODEL } from "@/lib/openai";
import type { RichItinerary } from "@/lib/itinerary";
import type { Locale } from "@/i18n/config";

const LANG_NAME: Record<string, string> = {
  pt: "Brazilian Portuguese",
  en: "English",
  es: "Spanish",
};

const EXPAND_MODEL = process.env.OPENAI_ITINERARY_EXPAND_MODEL ?? ITINERARY_MODEL;

export function wordCount(s: string | undefined): number {
  return (s ?? "").trim().split(/\s+/).filter(Boolean).length;
}

/** Average audioguide length — used to decide whether a second pass is worth it. */
export function avgAudioguideWords(itin: RichItinerary): number {
  if (!itin.stops.length) return 0;
  const total = itin.stops.reduce((a, s) => a + wordCount(s.audioguide), 0);
  return total / itin.stops.length;
}

async function expandOne(
  stop: RichItinerary["stops"][number],
  place: string,
  lang: Locale,
): Promise<string> {
  const openai = createOpenAI();
  const langName = LANG_NAME[lang] ?? "English";
  const prompt = `You are an outstanding audio tour guide speaking aloud to one traveller standing in front of this place.

Rewrite the narration below into a richer, longer spoken guide of 400 to 550 words in ${langName}.
Rules:
- Do NOT invent new facts, dates, names or events. Keep every fact that is already there and stay faithful to it.
- Make it richer by expanding AROUND the existing facts: more historical context and what was happening then, the human story and the people involved, what to physically look at right now (materials, carvings, colours, proportions, the view), the atmosphere, and smooth spoken transitions.
- One flowing spoken piece. No lists, no headings, no bullet points, no citations, no URLs.
- Natural spoken phrasing ("Look up at…", "Take a few steps closer…", "Picture this square two centuries ago…").

Place: ${stop.title}${place ? `, ${place}` : ""}
Details to weave in naturally: ${[...stop.dont_miss, stop.interesting_fact].filter(Boolean).join("; ") || "(none)"}

Current narration:
"""
${stop.audioguide}
"""

Return ONLY the expanded narration text — no preamble, no quotes, nothing else.`;

  const res = await openai.chat.completions.create({
    model: EXPAND_MODEL,
    temperature: 0.75,
    max_tokens: 1400,
    messages: [
      {
        role: "system",
        content:
          "You expand tour-guide narration into longer, vivid spoken prose without adding new facts. Output only the narration.",
      },
      { role: "user", content: prompt },
    ],
  });
  const out = res.choices[0]?.message?.content?.trim() ?? "";
  // keep the longer of the two, and never return something suspiciously short
  return wordCount(out) > wordCount(stop.audioguide) + 40 ? out : stop.audioguide;
}

/**
 * Second pass: rewrite each stop's audioguide into a fuller 400-550 word
 * narrative. Focused single-task calls hit the length target far more
 * reliably than asking pass 1 to write long. Runs all stops in parallel;
 * any failure keeps that stop's original text.
 */
export async function expandAudioguides(
  itin: RichItinerary,
  lang: Locale,
  place: string,
): Promise<RichItinerary> {
  const results = await Promise.allSettled(
    itin.stops.map((s) => expandOne(s, place, lang)),
  );
  const stops = itin.stops.map((s, i) => {
    const r = results[i];
    return r.status === "fulfilled" && r.value
      ? { ...s, audioguide: r.value }
      : s;
  });
  return { ...itin, stops };
}
