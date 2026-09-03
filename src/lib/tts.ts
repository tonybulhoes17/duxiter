import "server-only";

import { createOpenAI } from "@/lib/openai";
import type { Locale } from "@/i18n/config";

export const TTS_MODEL = process.env.OPENAI_TTS_MODEL ?? "gpt-4o-mini-tts";

/** One curated voice per language (override any with OPENAI_TTS_VOICE). */
const VOICE_BY_LANG: Record<Locale, string> = {
  pt: process.env.OPENAI_TTS_VOICE_PT ?? "nova",
  en: process.env.OPENAI_TTS_VOICE_EN ?? "sage",
  es: process.env.OPENAI_TTS_VOICE_ES ?? "coral",
};

export function ttsVoiceFor(lang: Locale): string {
  return process.env.OPENAI_TTS_VOICE ?? VOICE_BY_LANG[lang] ?? "nova";
}

const GUIDE_INSTRUCTIONS =
  "Voice: a warm, cultured local guide walking beside the traveller. " +
  "Tone: engaging, unhurried and quietly enthusiastic — like a fine documentary narrator, never robotic. " +
  "Delivery: measured pace, natural pauses at sentence ends, gentle emphasis on names and dates. " +
  "Pronounce local place names the way a local would.";

/** Rough spoken-duration estimate (s) — the <audio> element reports the real value on load. */
export function estimateDurationSeconds(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(3, Math.round((words / 2.6) * 10) / 10);
}

export interface SynthResult {
  mp3: Buffer;
  voice: string;
  charCount: number;
  durationSeconds: number;
}

/**
 * Synthesize one narration clip. Returns MP3 bytes.
 * Caller uploads to storage + records the row.
 */
export async function synthesizeNarration(
  text: string,
  lang: Locale,
): Promise<SynthResult> {
  const clean = text.trim().replace(/\s+\n/g, "\n").slice(0, 4000);
  const voice = ttsVoiceFor(lang);
  const openai = createOpenAI();

  const res = await openai.audio.speech.create({
    model: TTS_MODEL,
    voice,
    input: clean,
    response_format: "mp3",
    ...(TTS_MODEL.includes("gpt-4o")
      ? { instructions: GUIDE_INSTRUCTIONS }
      : {}),
  });

  const mp3 = Buffer.from(await res.arrayBuffer());
  return {
    mp3,
    voice,
    charCount: clean.length,
    durationSeconds: estimateDurationSeconds(clean),
  };
}
