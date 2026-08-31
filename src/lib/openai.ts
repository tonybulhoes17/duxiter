import "server-only";

import OpenAI from "openai";
import { serverEnv } from "@/lib/env";

export function createOpenAI() {
  return new OpenAI({ apiKey: serverEnv.openaiApiKey });
}

export const ITINERARY_MODEL =
  process.env.OPENAI_ITINERARY_MODEL ?? "gpt-4o";

/** Use live web search when generating itineraries (slower, ~5x cost, current info). */
export const ITINERARY_WEB_SEARCH =
  (process.env.OPENAI_ITINERARY_WEB_SEARCH ?? "true") !== "false";

/** Pull the first balanced {...} JSON object out of a string. */
export function extractJsonObject(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  try {
    return JSON.parse(trimmed);
  } catch {
    /* fall through */
  }
  const start = trimmed.indexOf("{");
  if (start === -1) throw new Error("no json object");
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < trimmed.length; i++) {
    const c = trimmed[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
    } else if (c === '"') inStr = true;
    else if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return JSON.parse(trimmed.slice(start, i + 1));
    }
  }
  throw new Error("unbalanced json");
}

export const VISION_MODEL = process.env.OPENAI_VISION_MODEL ?? "gpt-4o";

export const TRANSLATE_MODEL =
  process.env.OPENAI_TRANSLATE_MODEL ?? "gpt-4o-mini";
