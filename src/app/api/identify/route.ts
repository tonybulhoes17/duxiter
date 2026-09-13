import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createOpenAI, VISION_MODEL } from "@/lib/openai";
import { visionAnnotate } from "@/lib/vision";
import { getLocalizedText, isLocale } from "@/i18n/config";
import { isUuid } from "@/lib/validate";
import { IDENTIFY_FREE_DAILY } from "@/lib/identify-pack";

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
  tzOffsetMinutes?: number;
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

  // ---- daily quota: a few free identifications per calendar day, then paid credits ----
  const tz = Number.isFinite(body.tzOffsetMinutes)
    ? (body.tzOffsetMinutes as number)
    : 0;
  const localNow = Date.now() - tz * 60000;
  const startOfLocalDayUtc =
    Math.floor(localNow / 86400000) * 86400000 + tz * 60000;
  const admin = createAdminClient();
  const { count: todayCount } = await admin
    .from("identify_usage")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", new Date(startOfLocalDayUtc).toISOString());

  let consumeCredit = false;
  if ((todayCount ?? 0) >= IDENTIFY_FREE_DAILY) {
    const { data: cred, error: credErr } = await admin
      .from("identify_credits")
      .select("balance")
      .eq("user_id", user.id)
      .maybeSingle();
    if (credErr) console.error("identify credit read failed", credErr);
    if (!cred || cred.balance <= 0) {
      return NextResponse.json(
        { error: "daily_limit", creditsAvailable: false },
        { status: 402 },
      );
    }
    consumeCredit = true;
  }

  const context = body.context === "street" ? "street" : "museum";

  // context: which city / venue are we in?
  let cityName = "";
  if (isUuid(body.tourId)) {
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

    // Bill only on a successful model response — a request that errors out
    // below never reaches this point, so it never costs the user a use.
    await admin.from("identify_usage").insert({ user_id: user.id, identified });
    if (consumeCredit) {
      const { data: cur } = await admin
        .from("identify_credits")
        .select("balance")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cur && cur.balance > 0) {
        await admin
          .from("identify_credits")
          .update({ balance: cur.balance - 1 })
          .eq("user_id", user.id);
      }
    }

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
