"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Camera,
  ImageUp,
  Loader2,
  MapPin,
  RefreshCw,
  Sparkles,
  Volume2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { reverseGeocode } from "@/lib/geocode";
import { IDENTIFY_PACK_CREDITS, identifyPackPriceLabel } from "@/lib/identify-pack";
import { locales, localeLabels, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

type Phase =
  | "camera"
  | "details"
  | "loading"
  | "result"
  | "denied"
  | "error"
  | "limit";

type SubjectType = "artwork" | "monument" | "other" | "";

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
  billed?: boolean;
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

const PILL = "rounded-full border px-3 py-1.5 text-sm transition-colors";
const PILL_ON = "border-primary bg-primary/10 text-text-primary";
const PILL_OFF = "border-border text-text-secondary hover:border-white/20";

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
  const locale = useLocale() as Locale;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [phase, setPhase] = useState<Phase>("camera");
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [result, setResult] = useState<IdentifyResult | null>(null);
  const [buying, setBuying] = useState(false);

  // details the person fills in after capturing, to help the model —
  // what kind of subject it is, where it actually is (which may not be
  // where the phone is right now), and what language to answer in.
  const [subjectType, setSubjectType] = useState<SubjectType>("");
  const [subjectTypeOther, setSubjectTypeOther] = useState("");
  const [place, setPlace] = useState("");
  const [locating, setLocating] = useState(context === "street");
  const [inMuseum, setInMuseum] = useState(false);
  const [museumName, setMuseumName] = useState("");
  const [responseLanguage, setResponseLanguage] = useState<Locale>(locale);
  const [note, setNote] = useState("");

  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);

  const coordsRef = useRef<{ lat: number; lng: number } | null>(null);

  // Plain browser APIs (not next/navigation's useSearchParams) so this
  // component doesn't force a Suspense boundary on every page that embeds it
  // (it's also mounted inline inside the museum tour player).
  useEffect(() => {
    const url = new URL(window.location.href);
    const c = url.searchParams.get("credits");
    if (c === "success") toast.success(t("creditsAdded"));
    else if (c === "cancelled") toast.info(t("creditsCancelled"));
    if (c) {
      url.searchParams.delete("credits");
      url.searchParams.delete("session_id");
      window.history.replaceState({}, "", url.pathname + url.search);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function buyPack() {
    setBuying(true);
    try {
      const res = await fetch("/api/identify/credits/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const { url } = (await res.json()) as { url?: string };
      if (url) window.location.assign(url);
      else throw new Error();
    } catch {
      setBuying(false);
      toast.error(t("failed"));
    }
  }

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
          if (addr) setPlace(addr.label);
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

  function onCaptured(image: string) {
    setPendingImage(image);
    stopCamera();
    setPhase("details");
  }

  function captureFromCamera() {
    const video = videoRef.current;
    if (!video) return;
    const vw = video.videoWidth || 1080;
    const vh = video.videoHeight || 1440;
    onCaptured(downscale(video, vw, vh));
  }

  function onFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const img = new Image();
    img.onload = () => onCaptured(downscale(img, img.naturalWidth, img.naturalHeight));
    img.onerror = () => setPhase("error");
    img.src = URL.createObjectURL(file);
  }

  async function submit() {
    if (!pendingImage) return;
    setPhase("loading");
    setAudioSrc(null);
    try {
      const now = new Date();
      const res = await fetch("/api/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: pendingImage,
          tourId,
          language: responseLanguage,
          context,
          coords: coordsRef.current ?? undefined,
          place: place.trim() || undefined,
          note: note.trim() || undefined,
          subjectType: subjectType || undefined,
          subjectTypeOther:
            subjectType === "other" ? subjectTypeOther.trim() || undefined : undefined,
          inMuseum: context === "street" ? inMuseum : undefined,
          museumName:
            context === "street" && inMuseum ? museumName.trim() || undefined : undefined,
          tzOffsetMinutes: now.getTimezoneOffset(),
        }),
      });
      if (res.status === 402) {
        setPhase("limit");
        return;
      }
      if (!res.ok) throw new Error();
      setResult((await res.json()) as IdentifyResult);
      setPhase("result");
    } catch {
      setPhase("error");
    }
  }

  function retake() {
    setResult(null);
    setPendingImage(null);
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

  function adjustDetails() {
    // same photo, let them refine subject type / location / museum / clue
    setPhase("details");
  }

  async function listen() {
    if (!result || audioLoading) return;
    if (audioSrc) {
      audioRef.current?.play();
      return;
    }
    setAudioLoading(true);
    try {
      const text = [result.name, result.description, result.interesting_fact]
        .filter(Boolean)
        .join(". ");
      const res = await fetch("/api/identify/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language: responseLanguage }),
      });
      if (!res.ok) throw new Error();
      const { audio } = (await res.json()) as { audio: string };
      setAudioSrc(audio);
      setTimeout(() => audioRef.current?.play(), 0);
    } catch {
      toast.error(t("failed"));
    } finally {
      setAudioLoading(false);
    }
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
      <audio ref={audioRef} src={audioSrc ?? undefined} className="hidden" />

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

      {phase === "camera" && (
        <>
          <video
            ref={videoRef}
            playsInline
            muted
            className="h-full w-full bg-neutral-900 object-cover"
          />
          <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 bg-gradient-to-t from-black/70 to-transparent p-8 safe-bottom">
            {context === "street" && (
              <span className="flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1 text-xs text-white/80">
                <MapPin className="size-3.5" />
                {locating ? t("gettingLocation") : place ? place : t("noLocation")}
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
          </div>
        </>
      )}

      {phase === "loading" && (
        <div className="flex h-full flex-col items-center justify-center gap-2">
          {pendingImage && (
            <img
              src={pendingImage}
              alt=""
              className="mb-4 max-h-[40vh] rounded-lg object-cover opacity-60"
            />
          )}
          <span className="flex items-center gap-2 text-sm text-white">
            <Loader2 className="size-4 animate-spin" />
            {t("identifying")}
          </span>
        </div>
      )}

      {phase === "details" && (
        <div className="mt-auto max-h-[92vh] overflow-y-auto rounded-t-2xl bg-card p-5 safe-bottom">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-subtle" />
          {pendingImage && (
            <img
              src={pendingImage}
              alt=""
              className="mb-4 h-32 w-full rounded-lg object-cover"
            />
          )}
          <h2 className="font-display text-lg font-bold">{t("detailsTitle")}</h2>
          <p className="mt-1 text-xs text-text-muted">{t("detailsHint")}</p>

          <div className="mt-4">
            <p className="text-xs font-medium text-text-secondary">
              {t("subjectTypeTitle")}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(["artwork", "monument", "other"] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setSubjectType(subjectType === opt ? "" : opt)}
                  className={cn(PILL, subjectType === opt ? PILL_ON : PILL_OFF)}
                >
                  {t(`subjectType_${opt}`)}
                </button>
              ))}
            </div>
            {subjectType === "other" && (
              <input
                value={subjectTypeOther}
                onChange={(e) => setSubjectTypeOther(e.target.value)}
                placeholder={t("subjectTypeOtherPlaceholder")}
                className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            )}
          </div>

          {context === "street" && (
            <div className="mt-4 space-y-2">
              <label className="block text-xs font-medium text-text-secondary">
                {t("whereIsIt")}
              </label>
              <input
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                placeholder={locating ? t("gettingLocation") : t("wherePlaceholder")}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
          )}

          {context === "street" && (
            <div className="mt-4">
              <p className="text-xs font-medium text-text-secondary">
                {t("inMuseumQuestion")}
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setInMuseum(true)}
                  className={cn(PILL, inMuseum ? PILL_ON : PILL_OFF)}
                >
                  {t("yes")}
                </button>
                <button
                  type="button"
                  onClick={() => setInMuseum(false)}
                  className={cn(PILL, !inMuseum ? PILL_ON : PILL_OFF)}
                >
                  {t("no")}
                </button>
              </div>
              {inMuseum && (
                <input
                  value={museumName}
                  onChange={(e) => setMuseumName(e.target.value)}
                  placeholder={t("museumNamePlaceholder")}
                  className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              )}
            </div>
          )}

          <div className="mt-4">
            <p className="text-xs font-medium text-text-secondary">
              {t("responseLanguageLabel")}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {locales.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setResponseLanguage(l)}
                  className={cn(PILL, responseLanguage === l ? PILL_ON : PILL_OFF)}
                >
                  {localeLabels[l].flag} {localeLabels[l].native}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <label className="block text-xs font-medium text-text-secondary">
              {t("clueLabel")}
            </label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("cluePlaceholder")}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="mt-5 flex gap-2">
            <Button variant="outline" className="flex-1" onClick={retake}>
              <Camera className="size-4" />
              {t("retake")}
            </Button>
            <Button className="flex-1" onClick={submit}>
              <Sparkles className="size-4" />
              {t("identifyCta")}
            </Button>
          </div>
        </div>
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

      {phase === "limit" && (
        <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
          <p className="font-display text-lg font-bold text-white">
            {t("dailyLimit")}
          </p>
          <p className="max-w-xs text-sm text-white/70">
            {t("packPitch", { count: IDENTIFY_PACK_CREDITS })}
          </p>
          <Button onClick={buyPack} disabled={buying} className="mt-2 w-full max-w-xs">
            {buying ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {t("buyPack", {
              count: IDENTIFY_PACK_CREDITS,
              price: identifyPackPriceLabel(),
            })}
          </Button>
          <Button variant="ghost" onClick={onClose} className="text-white">
            {t("close")}
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
              {result.billed === false && (
                <p className="mt-1 text-xs text-text-muted">{t("notCharged")}</p>
              )}

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

              <div className="mt-5 flex gap-2">
                <Button variant="outline" className="flex-1" onClick={retake}>
                  <Camera className="size-4" />
                  {t("retake")}
                </Button>
                <Button className="flex-1" onClick={adjustDetails}>
                  <RefreshCw className="size-4" />
                  {t("moreDetails")}
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
              <Button
                variant="outline"
                className="mt-4 w-full"
                onClick={listen}
                disabled={audioLoading}
              >
                {audioLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Volume2 className="size-4" />
                )}
                {t("listen")}
              </Button>
              <div className="mt-2 flex gap-2">
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
