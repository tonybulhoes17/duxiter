import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

/** TEMPORARY diagnostic — delete after debugging. No secrets are returned. */
export async function GET() {
  const mask = (v: string | undefined) =>
    !v
      ? null
      : {
          len: v.length,
          head: v.slice(0, 6),
          tail: v.slice(-4),
          ascii_only: /^[\x20-\x7E]*$/.test(v),
        };

  const out: Record<string, unknown> = {
    diag_version: 3,
    env: {
      OPENAI_API_KEY: mask(process.env.OPENAI_API_KEY),
      OPENAI_TRANSLATE_MODEL: process.env.OPENAI_TRANSLATE_MODEL ?? "(default gpt-4o-mini)",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: mask(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      SUPABASE_SERVICE_ROLE_KEY: mask(process.env.SUPABASE_SERVICE_ROLE_KEY),
      RESEND_API_KEY: mask(process.env.RESEND_API_KEY),
      GOOGLE_VISION_API_KEY: mask(process.env.GOOGLE_VISION_API_KEY),
      VERCEL_ENV: process.env.VERCEL_ENV ?? null,
    },
  };

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const r = await openai.chat.completions.create({
      model: process.env.OPENAI_TRANSLATE_MODEL ?? "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You are a professional localizer. Output only valid JSON.",
        },
        {
          role: "user",
          content:
            'Translate "Bom dia" from Brazilian Portuguese into English, Spanish. Return ONLY a JSON object keyed by language code (en, es).',
        },
      ],
    });
    const content = r.choices[0]?.message?.content ?? "{}";
    out.openai = {
      ok: true,
      model: r.model,
      parsed: JSON.parse(content),
    };
  } catch (e) {
    out.openai = {
      ok: false,
      error: e instanceof Error ? e.message.slice(0, 400) : String(e),
    };
  }

  return NextResponse.json(out);
}
