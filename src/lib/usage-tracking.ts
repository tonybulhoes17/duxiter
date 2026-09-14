import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/database.types";

/**
 * USD price per 1M tokens (text models) / per 1M characters (TTS models).
 * These are our best-known OpenAI rates — override via env if OpenAI
 * reprices, rather than editing code. Unknown models fall back to gpt-4o
 * text pricing so a forgotten entry still produces a (conservative) number
 * instead of silently logging zero cost.
 */
const TEXT_RATES: Record<string, { in: number; out: number }> = {
  "gpt-4o": {
    in: Number(process.env.COST_GPT4O_IN_PER_M ?? 2.5),
    out: Number(process.env.COST_GPT4O_OUT_PER_M ?? 10),
  },
  "gpt-4o-mini": {
    in: Number(process.env.COST_GPT4O_MINI_IN_PER_M ?? 0.15),
    out: Number(process.env.COST_GPT4O_MINI_OUT_PER_M ?? 0.6),
  },
};

const TTS_RATES: Record<string, number> = {
  "tts-1-hd": Number(process.env.COST_TTS1HD_PER_M_CHAR ?? 30),
  "tts-1": Number(process.env.COST_TTS1_PER_M_CHAR ?? 15),
  "gpt-4o-mini-tts": Number(process.env.COST_GPT4OMINI_TTS_PER_M_CHAR ?? 12),
};

/**
 * Web search (Responses API `web_search` tool) injects retrieved page
 * content as extra input context on top of the billed tool-call fee —
 * this rough multiplier accounts for that until we have real measured
 * numbers from `ai_usage_events` to replace it with.
 */
const WEB_SEARCH_MULTIPLIER = Number(process.env.COST_WEB_SEARCH_MULTIPLIER ?? 5);

function textRate(model: string) {
  return TEXT_RATES[model] ?? TEXT_RATES["gpt-4o"];
}

export function estimateTextCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number,
  webSearch = false,
): number {
  const r = textRate(model);
  let cost = (inputTokens / 1_000_000) * r.in + (outputTokens / 1_000_000) * r.out;
  if (webSearch) cost *= WEB_SEARCH_MULTIPLIER;
  return Math.round(cost * 1e6) / 1e6;
}

export function estimateTtsCostUsd(model: string, chars: number): number {
  const rate = TTS_RATES[model] ?? TTS_RATES["tts-1-hd"];
  return Math.round((chars / 1_000_000) * rate * 1e6) / 1e6;
}

export type UsageEventType =
  | "itinerary_generate"
  | "itinerary_expand"
  | "itinerary_tts"
  | "identify"
  | "identify_tts"
  | "translate";

/**
 * Fire-and-forget usage/cost log. Never throws into the caller — a tracking
 * failure must not break the actual user-facing feature.
 */
export async function trackUsage(row: {
  event_type: UsageEventType;
  user_id: string | null;
  model: string;
  input_tokens?: number | null;
  output_tokens?: number | null;
  chars?: number | null;
  cost_usd: number;
  metadata?: Record<string, unknown>;
}) {
  try {
    const admin = createAdminClient();
    await admin.from("ai_usage_events").insert({
      event_type: row.event_type,
      user_id: row.user_id,
      model: row.model,
      input_tokens: row.input_tokens ?? null,
      output_tokens: row.output_tokens ?? null,
      chars: row.chars ?? null,
      cost_usd: row.cost_usd,
      metadata: (row.metadata as unknown as Json) ?? null,
    });
  } catch (err) {
    console.error("usage tracking insert failed", err);
  }
}
