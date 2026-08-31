import { NextResponse, type NextRequest } from "next/server";
import { assertAdmin } from "@/lib/admin";
import { createOpenAI, TRANSLATE_MODEL } from "@/lib/openai";
import { isLocale, locales, type Locale } from "@/i18n/config";

export const runtime = "nodejs";
export const maxDuration = 30;

const LANG_NAME: Record<Locale, string> = {
  pt: "Brazilian Portuguese",
  en: "English",
  es: "Spanish (Spain)",
};

export async function POST(req: NextRequest) {
  const denied = await assertAdmin();
  if (denied) return denied;

  const b = (await req.json().catch(() => null)) as {
    text?: string;
    from?: string;
    to?: string[];
  } | null;

  const source = b?.text?.trim();
  const from = isLocale(b?.from) ? b.from : "pt";
  const targets = (b?.to ?? locales.filter((l) => l !== from)).filter(
    (l): l is Locale => isLocale(l) && l !== from,
  );

  if (!source || targets.length === 0) {
    return NextResponse.json({ error: "nothing_to_translate" }, { status: 400 });
  }
  if (source.length > 4000) {
    return NextResponse.json({ error: "too_long" }, { status: 400 });
  }

  const prompt = `Translate the text below from ${LANG_NAME[from]} into: ${targets
    .map((t) => LANG_NAME[t])
    .join(", ")}.

Rules:
- This is content for a travel-guide app (city names, tour titles, stop descriptions).
- Keep the same tone, register and paragraph structure. Do not add or remove information.
- Keep proper nouns / place names in their locally-correct form.
- Return ONLY a JSON object keyed by language code (${targets.join(", ")}).

Text:
"""
${source}
"""`;

  try {
    const openai = createOpenAI();
    const completion = await openai.chat.completions.create({
      model: TRANSLATE_MODEL,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You are a professional localizer. Output only valid JSON." },
        { role: "user", content: prompt },
      ],
    });
    const parsed = JSON.parse(
      completion.choices[0]?.message?.content ?? "{}",
    ) as Record<string, unknown>;

    const out: Partial<Record<Locale, string>> = {};
    for (const t of targets) {
      const v = parsed[t];
      if (typeof v === "string" && v.trim()) out[t] = v.trim();
    }
    if (Object.keys(out).length === 0) throw new Error("empty");

    return NextResponse.json({ translations: out });
  } catch (err) {
    console.error("translate failed", err);
    return NextResponse.json({ error: "translate_failed" }, { status: 502 });
  }
}
