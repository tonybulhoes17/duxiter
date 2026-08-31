import "server-only";

import { serverEnv } from "@/lib/env";

export const isVisionConfigured = !!process.env.GOOGLE_VISION_API_KEY;

export interface VisionHint {
  guess: string | null;
  landmark: string | null;
  labels: string[];
  webPages: string[];
}

/**
 * First-pass identification with Google Cloud Vision. Returns a best-guess
 * name + supporting signals; the rich write-up is done by GPT afterwards.
 * No-ops (returns null) when GOOGLE_VISION_API_KEY isn't set.
 */
export async function visionAnnotate(
  imageBase64: string,
): Promise<VisionHint | null> {
  if (!isVisionConfigured) return null;
  try {
    const res = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${serverEnv.googleVisionApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [
            {
              image: { content: imageBase64 },
              features: [
                { type: "LANDMARK_DETECTION", maxResults: 3 },
                { type: "WEB_DETECTION", maxResults: 5 },
                { type: "LABEL_DETECTION", maxResults: 8 },
              ],
            },
          ],
        }),
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!res.ok) return null;
    const json = await res.json();
    const r = json.responses?.[0] ?? {};

    const landmark: { description?: string; score?: number } | undefined =
      r.landmarkAnnotations?.[0];
    const web = r.webDetection ?? {};
    const bestGuess: string | undefined = web.bestGuessLabels?.[0]?.label;
    const topEntity: { description?: string; score?: number } | undefined =
      (web.webEntities ?? [])
        .filter((e: { description?: string }) => e.description)
        .sort(
          (a: { score?: number }, b: { score?: number }) =>
            (b.score ?? 0) - (a.score ?? 0),
        )[0];

    return {
      guess:
        (landmark?.score ?? 0) >= 0.5
          ? (landmark?.description ?? null)
          : (bestGuess ?? topEntity?.description ?? null),
      landmark: landmark?.description ?? null,
      labels: (r.labelAnnotations ?? [])
        .map((l: { description?: string }) => l.description)
        .filter(Boolean)
        .slice(0, 6),
      webPages: (web.pagesWithMatchingImages ?? [])
        .map((p: { url?: string }) => p.url)
        .filter(Boolean)
        .slice(0, 3),
    };
  } catch {
    return null;
  }
}
