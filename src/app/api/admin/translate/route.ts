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

// language names the model might use as JSON keys instead of the 2-letter code
const NAME_TO_CODE: Record<string, Locale> = {
  english: "en",
  ingles: "en",
  "inglês": "en",
  spanish: "es",
  "spanish (spain)": "es",
  espanol: "es",
  "español": "es",
  castellano: "es",
  portuguese: "pt",
  "português": "pt",
  "portugues (brasil)": "pt",
};

/** Pull the translated string for one locale out of whatever shape the model returned. */
function pickTranslation(
  root: Record<string, unknown>,
  code: Locale,
): string | undefined {
  const name = LANG_NAME[code].toLowerCase();
  for (const key of Object.keys(root)) {
    const k = key.toLowerCase().trim();
    const matches =
      k === code || k === name || NAME_TO_CODE[k] === code;
    if (!matches) continue;
    const v = root[key];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (v && typeof v === "object") {
      const inner =
        (v as Record<string, unknown>).text ??
        (v as Record<string, unknown>).translation ??
        (v as Record<string, unknown>).value;
      if (typeof inner === "string" && inner.trim()) return inner.trim();
    }
  }
  return undefined;
}

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

  const shape = `{ ${targets.map((t) => `"${t}": "<translation>"`).join(", ")} }`;
  const prompt = `Translate the text below from ${LANG_NAME[from]} into: ${targets
    .map((t) => `${LANG_NAME[t]} (key "${t}")`)
    .join(", ")}.

Rules:
- This is content for a travel-guide app (city names, tour titles, stop descriptions).
- Keep the same tone, register and paragraph structure. Do not add or remove information.
- Keep proper nouns / place names in their locally-correct form.
- Respond with ONLY a JSON object of exactly this shape, where each key is the 2-letter code and each value is the full translated text as a plain string:
${shape}

Text to translate:
"""
${source}
"""`;

  let parsed: Record<string, unknown>;
  try {
    const openai = createOpenAI();
    const completion = await openai.chat.completions.create({
      model: TRANSLATE_MODEL,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a professional localizer. Reply with ONLY a valid JSON object whose keys are 2-letter language codes.",
        },
        { role: "user", content: prompt },
      ],
    });
    parsed = JSON.parse(completion.choices[0]?.message?.content ?? "{}") as Record<
      string,
      unknown
    >;
  } catch (err) {
    const detail =
      err instanceof Error ? err.message.slice(0, 200) : "unknown error";
    console.error("translate failed", detail);
    return NextResponse.json({ error: "translate_failed", detail }, { status: 502 });
  }

  // the model sometimes nests under "translations"
  const root =
    parsed.translations && typeof parsed.translations === "object"
      ? (parsed.translations as Record<string, unknown>)
      : parsed;

  const out: Partial<Record<Locale, string>> = {};
  for (const t of targets) {
    const v = pickTranslation(root, t);
    if (v) out[t] = v;
  }

  if (Object.keys(out).length === 0) {
    console.error(
      "translate: unrecognised shape",
      JSON.stringify(parsed).slice(0, 300),
    );
    return NextResponse.json(
      { error: "translate_failed", detail: "unexpected response shape — try again" },
      { status: 502 },
    );
  }

  return NextResponse.json({ translations: out });
}
