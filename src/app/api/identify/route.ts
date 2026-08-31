import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createOpenAI, VISION_MODEL } from "@/lib/openai";
import { visionAnnotate } from "@/lib/vision";
import { getLocalizedText, isLocale } from "@/i18n/config";
import { isUuid } from "@/lib/validate";

export const runtime = "nodejs";
export const maxDuration = 45;

const LANG_NAME: Record<string, string> = {
  pt: "Brazilian Portuguese",
  en: "English",
  es: "Spanish",
};

/**
 * Camera identification for museum mode.
 * Google Vision (if configured) gives a first-pass name; GPT-4o Vision then
 * confirms it and writes the guide text. Works with GPT alone if no Vision key.
 */
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    image?: string;
    tourId?: string;
    language?: string;
  };
  if (!body.image?.startsWith("data:image/")) {
    return NextResponse.json({ error: "invalid_image" }, { status: 400 });
  }
  const base64 = body.image.split(",")[1] ?? "";
  if (base64.length < 100 || base64.length > 8_000_000) {
    return NextResponse.json({ error: "invalid_image" }, { status: 400 });
  }

  // context: which city are we in?
  let cityName = "";
  if (isUuid(body.tourId)) {
    const admin = createAdminClient();
    const { data } = await admin
      .from("tours")
      .select("cities(name)")
      .eq("id", body.tourId)
      .maybeSingle();
    cityName = getLocalizedText(
      (data?.cities as { name?: Record<string, string> } | null)?.name ?? {},
      "en",
    );
  }

  const lang = isLocale(body.language) ? body.language : "en";
  const hint = await visionAnnotate(base64);

  const prompt = `Identify the artwork, monument, sculpture or point of interest in this photo${
    cityName ? `, taken in a museum or site in ${cityName}` : ""
  }.
${
  hint?.guess
    ? `Image search suggests it may be: "${hint.guess}"${
        hint.labels.length ? ` (labels: ${hint.labels.join(", ")})` : ""
      }. Verify before trusting it.`
    : ""
}
Reply in ${LANG_NAME[lang] ?? "English"}.
Return ONLY a JSON object:
{
  "name": "the work's title / the monument's name",
  "creator": "artist / architect, or null",
  "period": "date or era, or null",
  "medium": "material or technique, or null",
  "location": "where it is, or null",
  "description": "two informative paragraphs (at least 5 sentences total) — what it is, its story, what to look at",
  "interesting_fact": "one surprising detail",
  "confidence": a NUMBER between 0 and 1 (not a word) — how sure you are of the identification
}
If you truly cannot identify it, set "name" to a short honest description and "confidence" below 0.4.`;

  try {
    const openai = createOpenAI();
    const completion = await openai.chat.completions.create({
      model: VISION_MODEL,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: body.image, detail: "low" } },
          ],
        },
      ],
    });
    const parsed = JSON.parse(
      completion.choices[0]?.message?.content ?? "{}",
    ) as Record<string, unknown>;

    return NextResponse.json({
      name: String(parsed.name ?? "Unidentified"),
      creator: parsed.creator ? String(parsed.creator) : null,
      period: parsed.period ? String(parsed.period) : null,
      medium: parsed.medium ? String(parsed.medium) : null,
      location: parsed.location ? String(parsed.location) : null,
      description: parsed.description ? String(parsed.description) : null,
      interesting_fact: parsed.interesting_fact
        ? String(parsed.interesting_fact)
        : null,
      confidence: (() => {
        const c = Number(parsed.confidence);
        return Number.isFinite(c) && c >= 0 && c <= 1 ? c : null;
      })(),
      sources: hint?.webPages ?? [],
    });
  } catch (err) {
    console.error("identify failed", err);
    return NextResponse.json({ error: "identify_failed" }, { status: 502 });
  }
}
