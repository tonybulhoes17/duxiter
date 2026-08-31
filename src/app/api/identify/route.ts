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

interface Body {
  image?: string;
  tourId?: string;
  language?: string;
  context?: "street" | "museum";
  coords?: { lat?: number; lng?: number };
  place?: string;
  note?: string;
}

/**
 * Photo identification. Works two ways:
 *  - museum mode (tourId set): artworks and exhibits inside a venue
 *  - street mode: buildings, monuments, churches, statues, squares… outdoors
 * Google Vision (if configured) gives a first-pass name; GPT-4o Vision then
 * verifies it and writes the guide text. When nothing matches it says so and
 * asks for a location / clue instead of guessing.
 */
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as Body;
  if (!body.image?.startsWith("data:image/")) {
    return NextResponse.json({ error: "invalid_image" }, { status: 400 });
  }
  const base64 = body.image.split(",")[1] ?? "";
  if (base64.length < 100 || base64.length > 8_000_000) {
    return NextResponse.json({ error: "invalid_image" }, { status: 400 });
  }

  const context = body.context === "street" ? "street" : "museum";

  // context: which city / venue are we in?
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

  // where the photo was taken — helps disambiguate look-alike buildings
  const lat = Number(body.coords?.lat);
  const lng = Number(body.coords?.lng);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
  const placeText =
    (typeof body.place === "string" && body.place.trim().slice(0, 200)) ||
    (hasCoords ? `latitude ${lat.toFixed(5)}, longitude ${lng.toFixed(5)}` : "") ||
    cityName;
  const note =
    typeof body.note === "string" ? body.note.trim().slice(0, 300) : "";

  const lang = isLocale(body.language) ? body.language : "en";
  const hint = await visionAnnotate(base64);

  const subject =
    context === "street"
      ? "building, monument, church, statue, bridge, square, fountain, historic house, street landmark, mural or point of interest"
      : "artwork, sculpture, monument or exhibit";

  const prompt = `You are a local guide. Identify the specific ${subject} shown in this photo.
${
  context === "street"
    ? "The photo was taken outdoors, on the street — not necessarily inside a museum."
    : cityName
      ? `The photo was taken in a museum or site in ${cityName}.`
      : ""
}
${placeText ? `The photo was taken at or near: ${placeText}. Use this to tell apart similar-looking places.` : ""}
${
  hint?.guess
    ? `An image search suggests it may be: "${hint.guess}"${
        hint.labels.length ? ` (visual labels: ${hint.labels.join(", ")})` : ""
      }. Treat this as a lead, not a fact — verify it against what you see.`
    : hint?.labels.length
      ? `Visual labels detected: ${hint.labels.join(", ")}.`
      : ""
}
${note ? `The person adds this clue: "${note}". Take it into account.` : ""}
Reply in ${LANG_NAME[lang] ?? "English"}.

Return ONLY a JSON object:
{
  "identified": true only if you can name the specific place/work with reasonable confidence; false if you can only describe its type or style,
  "name": the specific name if identified, otherwise a short honest description (e.g. "Neoclassical apartment building, early 1900s"),
  "creator": "architect / artist, or null",
  "period": "date or era, or null",
  "medium": "materials, technique or architectural style, or null",
  "location": "address or area, or null",
  "description": "if identified: two informative paragraphs (at least 5 sentences) — what it is, its story, what to look at. If NOT identified: one paragraph on the architectural style, likely period and what kind of building/object it is.",
  "interesting_fact": "one surprising detail if identified, otherwise null",
  "confidence": a NUMBER between 0 and 1 (not a word),
  "needs": when "identified" is false, an array with any of "wider_photo", "location", "clue" that would most help a second attempt; otherwise []
}`;

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

    const confidence = (() => {
      const c = Number(parsed.confidence);
      return Number.isFinite(c) && c >= 0 && c <= 1 ? c : null;
    })();
    const identified =
      parsed.identified === true ||
      (parsed.identified == null && (confidence ?? 0) >= 0.55);

    const NEED = new Set(["wider_photo", "location", "clue"]);
    const needs = Array.isArray(parsed.needs)
      ? (parsed.needs as unknown[])
          .map(String)
          .filter((n) => NEED.has(n))
      : [];

    return NextResponse.json({
      identified,
      name: String(parsed.name ?? "Unidentified"),
      creator: parsed.creator ? String(parsed.creator) : null,
      period: parsed.period ? String(parsed.period) : null,
      medium: parsed.medium ? String(parsed.medium) : null,
      location: parsed.location ? String(parsed.location) : null,
      description: parsed.description ? String(parsed.description) : null,
      interesting_fact: parsed.interesting_fact
        ? String(parsed.interesting_fact)
        : null,
      confidence,
      needs: identified ? [] : needs,
      sources: hint?.webPages ?? [],
    });
  } catch (err) {
    console.error("identify failed", err);
    return NextResponse.json({ error: "identify_failed" }, { status: 502 });
  }
}
