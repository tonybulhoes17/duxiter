import "server-only";

import { createOpenAI, ITINERARY_MODEL } from "@/lib/openai";
import type { ItineraryStop, RichItinerary } from "@/lib/itinerary";
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

/** Target spoken length per stop depth. */
function targetWords(stop: ItineraryStop): { min: number; max: number } {
  return stop.depth === "along_the_way"
    ? { min: 210, max: 320 }
    : { min: 390, max: 520 };
}

/**
 * A stop needs a second pass only if it's clearly under target. Cornerstones
 * get expanded readily; "along-the-way" stops only if genuinely broken —
 * a tight 180-word clip for a fountain you pass is exactly right.
 */
function needsExpansion(stop: ItineraryStop): boolean {
  const w = wordCount(stop.audioguide);
  return stop.depth === "along_the_way" ? w < 150 : w < 330;
}

export function avgAudioguideWords(itin: RichItinerary): number {
  if (!itin.stops.length) return 0;
  return (
    itin.stops.reduce((a, s) => a + wordCount(s.audioguide), 0) /
    itin.stops.length
  );
}

/** True when at least one stop is thin enough to be worth a rewrite. */
export function shouldExpand(itin: RichItinerary): boolean {
  return itin.stops.some(needsExpansion);
}

interface ExpandResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

async function expandOne(
  stop: ItineraryStop,
  place: string,
  lang: Locale,
): Promise<ExpandResult> {
  const openai = createOpenAI();
  const langName = LANG_NAME[lang] ?? "English";
  const { min, max } = targetWords(stop);
  const prompt = `You are an outstanding audio tour guide speaking aloud to one traveller standing in front of this place.

Rewrite the narration below into a richer spoken guide of ${min} to ${max} words in ${langName}.
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
  const inputTokens = res.usage?.prompt_tokens ?? 0;
  const outputTokens = res.usage?.completion_tokens ?? 0;
  const text = wordCount(out) > wordCount(stop.audioguide) + 30 ? out : stop.audioguide;
  return { text, inputTokens, outputTokens };
}

export interface ExpandUsage {
  model: string;
  calls: number;
  inputTokens: number;
  outputTokens: number;
}

/**
 * Second pass: rewrite thin audioguides up to their target length. Focused
 * single-task calls hit the length target far more reliably than asking pass 1
 * to write long. Only the stops that need it are rewritten (keeps cost sane on
 * routes with many small "along-the-way" stops). Failures keep the original.
 */
export async function expandAudioguides(
  itin: RichItinerary,
  lang: Locale,
  place: string,
): Promise<{ itinerary: RichItinerary; usage: ExpandUsage }> {
  const emptyUsage: ExpandUsage = { model: EXPAND_MODEL, calls: 0, inputTokens: 0, outputTokens: 0 };
  const todo = new Set(
    itin.stops.flatMap((s, i) => (needsExpansion(s) ? [i] : [])),
  );
  if (todo.size === 0) return { itinerary: itin, usage: emptyUsage };

  const indices = [...todo];
  const results = await Promise.allSettled(
    indices.map((i) => expandOne(itin.stops[i], place, lang)),
  );
  const usage = { ...emptyUsage };
  const byIndex = new Map<number, ExpandResult>();
  results.forEach((r, k) => {
    if (r.status === "fulfilled") {
      usage.calls++;
      usage.inputTokens += r.value.inputTokens;
      usage.outputTokens += r.value.outputTokens;
      byIndex.set(indices[k], r.value);
    }
  });
  const stops = itin.stops.map((s, i) => {
    const r = byIndex.get(i);
    return r?.text ? { ...s, audioguide: r.text } : s;
  });
  return { itinerary: { ...itin, stops }, usage };
}
