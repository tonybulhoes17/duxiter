"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Camera, ImageUp, Loader2, MapPin, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { publicEnv } from "@/lib/env";

type Phase = "camera" | "loading" | "result" | "denied" | "error";

interface IdentifyResult {
  identified: boolean;
  name: string;
  creator?: string | null;
  period?: string | null;
  medium?: string | null;
  location?: string | null;
  description?: string | null;
  interesting_fact?: string | null;
  confidence?: number | null;
  needs?: string[];
  sources?: string[];
}

async function reverseGeocode(
  lat: number,
  lng: number,
  lang: string,
): Promise<string | null> {
  const key = publicEnv.googleMapsApiKey;
  if (!key) return null;
  try {
    const r = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=${lang}&key=${key}`,
    );
    const j = (await r.json()) as {
      status?: string;
      results?: { formatted_address?: string; types?: string[] }[];
    };
    if (j.status !== "OK" || !j.results?.length) return null;
    const pick =
      j.results.find((x) => x.types?.includes("street_address")) ??
      j.results.find((x) => x.types?.includes("route")) ??
      j.results[0];
    return pick.formatted_address ?? null;
  } catch {
    return null;
  }
}

function downscale(
  source: HTMLVideoElement | HTMLImageElement,
  w: number,
  h: number,
): string {
  const scale = Math.min(1, 1024 / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  canvas.getContext("2d")?.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.82);
}

export function CameraIdentifier({
  onClose,
  tourId,
  context = "museum",
}: {
  onClose: () => void;
  tourId?: string;
  context?: "street" | "museum";
}) {
  const t = useTranslations("camera");
  const locale = useLocale();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const lastImageRef = useRef<string | null>(null);
  const [phase, setPhase] = useState<Phase>("camera");
  const [result, setResult] = useState<IdentifyResult | null>(null);

  // location, captured best-effort for street mode
  const coordsRef = useRef<{ lat: number; lng: number } | null>(null);
  const [place, setPlace] = useState("");
  const [locating, setLocating] = useState(context === "street");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (context !== "street" || !("geolocation" in navigator)) {
      setLocating(false);
      return;
    }
    let alive = true;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        if (!alive) return;
        coordsRef.current = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        const addr = await reverseGeocode(
          pos.coords.latitude,
          pos.coords.longitude,
          locale,
        );
        if (alive) {
          if (addr) setPlace(addr);
          setLocating(false);
        }
      },
      () => alive && setLocating(false),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    );
    return () => {
      alive = false;
    };
  }, [context, locale]);

  useEffect(() => {
    let cancelled = false;
    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((tr) => tr.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch {
        // no camera / permission denied — fall back to photo upload
        if (!cancelled) setPhase("denied");
      }
    }
    start();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((tr) => tr.stop());
    };
  }, []);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
  }

  async function submit(image: string, extraNote?: string) {
    lastImageRef.current = image;
    stopCamera();
    setPhase("loading");
    try {
      const res = await fetch("/api/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image,
          tourId,
          language: locale,
          context,
          coords: coordsRef.current ?? undefined,
          place: place.trim() || undefined,
          note: (extraNote ?? "").trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      setResult((await res.json()) as IdentifyResult);
      setPhase("result");
    } catch {
      setPhase("error");
    }
  }

  function captureFromCamera() {
    const video = videoRef.current;
    if (!video) return;
    const vw = video.videoWidth || 1080;
    const vh = video.videoHeight || 1440;
    void submit(downscale(video, vw, vh));
  }

  function onFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const img = new Image();
    img.onload = () =>
      void submit(downscale(img, img.naturalWidth, img.naturalHeight));
    img.onerror = () => setPhase("error");
    img.src = URL.createObjectURL(file);
  }

  function retake() {
    setResult(null);
    setNote("");
    setPhase("camera");
    setTimeout(() => {
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: "environment" }, audio: false })
        .then((stream) => {
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {});
          }
        })
        .catch(() => setPhase("denied"));
    }, 0);
  }

  const meta = result
    ? [result.creator, result.period, result.medium, result.location].filter(
        Boolean,
      )
    : [];
  const notSure =
    !!result &&
    (result.identified === false ||
      (result.confidence != null && result.confidence < 0.45));

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <button
        type="button"
        onClick={() => {
          stopCamera();
          onClose();
        }}
        aria-label={t("close")}
        className="absolute right-4 top-4 z-10 flex size-10 items-center justify-center rounded-full bg-black/50 text-white safe-top"
      >
        <X className="size-5" />
      </button>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFilePicked}
      />

      {(phase === "camera" || phase === "loading") && (
        <>
          <video
            ref={videoRef}
            playsInline
            muted
            className="h-full w-full bg-neutral-900 object-cover"
          />
          <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 bg-gradient-to-t from-black/70 to-transparent p-8 safe-bottom">
            {phase === "loading" ? (
              <span className="flex items-center gap-2 text-sm text-white">
                <Loader2 className="size-4 animate-spin" />
                {t("identifying")}
              </span>
            ) : (
              <>
                {context === "street" && (
                  <span className="flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1 text-xs text-white/80">
                    <MapPin className="size-3.5" />
                    {locating
                      ? t("gettingLocation")
                      : place
                        ? place
                        : t("noLocation")}
                  </span>
                )}
                <p className="text-sm text-white/80">
                  {context === "street" ? t("pointStreet") : t("point")}
                </p>
                <div className="flex items-center gap-6">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    aria-label={t("upload")}
                    className="flex size-11 items-center justify-center rounded-full bg-white/15 text-white"
                  >
                    <ImageUp className="size-5" />
                  </button>
                  <button
                    type="button"
                    onClick={captureFromCamera}
                    aria-label={t("capture")}
                    className="flex size-16 items-center justify-center rounded-full border-4 border-white bg-white/20"
                  >
                    <Camera className="size-7 text-white" />
                  </button>
                  <span className="size-11" />
                </div>
              </>
            )}
          </div>
        </>
      )}

      {phase === "denied" && (
        <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
          <p className="text-white">{t("blocked")}</p>
          <p className="max-w-xs text-sm text-white/60">{t("blockedHint")}</p>
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <ImageUp className="size-4" />
            {t("upload")}
          </Button>
          <Button variant="ghost" onClick={onClose} className="text-white">
            {t("close")}
          </Button>
        </div>
      )}

      {phase === "error" && (
        <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
          <p className="text-white">{t("failed")}</p>
          <Button variant="outline" onClick={retake}>
            <RefreshCw className="size-4" />
            {t("tryAgain")}
          </Button>
        </div>
      )}

      {phase === "result" && result && (
        <div className="mt-auto max-h-[86vh] overflow-y-auto rounded-t-2xl bg-card p-5 safe-bottom">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-subtle" />

          {notSure ? (
            <>
              <h2 className="font-display text-lg font-bold">
                {t("notIdentified")}
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                {t("notIdentifiedHint")}
              </p>

              {(result.description || meta.length > 0) && (
                <div className="mt-3 rounded-md bg-subtle p-3">
                  <p className="text-xs font-medium text-text-muted">
                    {t("partialInfo")}
                  </p>
                  {meta.length > 0 && (
                    <p className="mt-1 text-sm text-text-secondary">
                      {meta.join(" · ")}
                    </p>
                  )}
                  {result.description && (
                    <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-text-secondary">
                      {result.description}
                    </p>
                  )}
                </div>
              )}

              <div className="mt-4 space-y-2">
                <label className="block text-xs font-medium text-text-secondary">
                  {t("whereAreYou")}
                </label>
                <input
                  value={place}
                  onChange={(e) => setPlace(e.target.value)}
                  placeholder={t("wherePlaceholder")}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
                <label className="block pt-1 text-xs font-medium text-text-secondary">
                  {t("clueLabel")}
                </label>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={t("cluePlaceholder")}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="mt-4 flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={retake}
                >
                  <Camera className="size-4" />
                  {t("retake")}
                </Button>
                <Button
                  className="flex-1"
                  disabled={!place.trim() && !note.trim()}
                  onClick={() => {
                    if (lastImageRef.current)
                      void submit(lastImageRef.current, note);
                  }}
                >
                  <RefreshCw className="size-4" />
                  {t("tryAgainHints")}
                </Button>
              </div>
            </>
          ) : (
            <>
              {result.confidence != null && result.confidence < 0.6 && (
                <p className="mb-2 rounded-md bg-warning/15 px-2.5 py-1.5 text-xs text-warning">
                  {t("lowConfidence")}
                </p>
              )}
              <h2 className="font-display text-xl font-bold">{result.name}</h2>
              {meta.length > 0 && (
                <p className="mt-1 text-sm text-text-secondary">
                  {meta.join(" · ")}
                </p>
              )}
              {result.description && (
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-text-secondary">
                  {result.description}
                </p>
              )}
              {result.interesting_fact && (
                <p className="mt-3 rounded-md bg-primary/10 p-3 text-sm text-text-primary">
                  💡 {result.interesting_fact}
                </p>
              )}
              {result.sources && result.sources.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {result.sources.map((s, i) => {
                    let host = s;
                    try {
                      host = new URL(s).hostname;
                    } catch {
                      /* keep raw */
                    }
                    return (
                      <a
                        key={i}
                        href={s}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate rounded bg-subtle px-2 py-1 text-[11px] text-text-secondary hover:text-text-primary"
                      >
                        {host}
                      </a>
                    );
                  })}
                </div>
              )}
              <div className="mt-5 flex gap-2">
                <Button variant="outline" className="flex-1" onClick={retake}>
                  <RefreshCw className="size-4" />
                  {t("retake")}
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => {
                    stopCamera();
                    onClose();
                  }}
                >
                  {t("done")}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
