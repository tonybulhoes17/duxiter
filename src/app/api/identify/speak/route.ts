import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { synthesizeNarration, TTS_MODEL } from "@/lib/tts";
import { estimateTtsCostUsd, trackUsage } from "@/lib/usage-tracking";
import { isLocale } from "@/i18n/config";

export const runtime = "nodejs";
export const maxDuration = 30;

// Light per-user throttle — this reads back an identification result the
// person already has, not a general-purpose TTS engine.
const lastCallByUser = new Map<string, number>();

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const last = lastCallByUser.get(user.id);
  if (last && Date.now() - last < 4000) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  lastCallByUser.set(user.id, Date.now());

  const body = (await req.json().catch(() => ({}))) as {
    text?: string;
    language?: string;
  };
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (text.length < 5 || text.length > 4000) {
    return NextResponse.json({ error: "invalid_text" }, { status: 400 });
  }
  const lang = isLocale(body.language) ? body.language : "en";

  try {
    const { mp3, charCount } = await synthesizeNarration(text, lang);
    void trackUsage({
      event_type: "identify_tts",
      user_id: user.id,
      model: TTS_MODEL,
      chars: charCount,
      cost_usd: estimateTtsCostUsd(TTS_MODEL, charCount),
    });
    return NextResponse.json({
      audio: `data:audio/mpeg;base64,${mp3.toString("base64")}`,
    });
  } catch (err) {
    console.error("identify speak failed", err);
    return NextResponse.json({ error: "speak_failed" }, { status: 502 });
  }
}
