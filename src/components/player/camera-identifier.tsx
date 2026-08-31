"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Camera, Loader2, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type Phase = "camera" | "loading" | "result" | "denied" | "error";

interface IdentifyResult {
  name: string;
  creator?: string | null;
  period?: string | null;
  medium?: string | null;
  location?: string | null;
  description?: string | null;
  interesting_fact?: string | null;
  confidence?: number | null;
  sources?: string[];
}

export function CameraIdentifier({
  onClose,
  tourId,
}: {
  onClose: () => void;
  tourId?: string;
}) {
  const t = useTranslations("camera");
  const locale = useLocale();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [phase, setPhase] = useState<Phase>("camera");
  const [result, setResult] = useState<IdentifyResult | null>(null);

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

  async function capture() {
    const video = videoRef.current;
    if (!video) return;
    const vw = video.videoWidth || 1080;
    const vh = video.videoHeight || 1440;
    const scale = Math.min(1, 1024 / Math.max(vw, vh));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(vw * scale);
    canvas.height = Math.round(vh * scale);
    canvas
      .getContext("2d")
      ?.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.82);

    stopCamera();
    setPhase("loading");

    try {
      const res = await fetch("/api/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl, tourId, language: locale }),
      });
      if (!res.ok) throw new Error();
      setResult(await res.json());
      setPhase("result");
    } catch {
      setPhase("error");
    }
  }

  function retake() {
    setResult(null);
    setPhase("camera");
    // re-run the effect by remounting the video element via key change
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

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <button
        type="button"
        onClick={() => {
          stopCamera();
          onClose();
        }}
        aria-label="Close"
        className="absolute right-4 top-4 z-10 flex size-10 items-center justify-center rounded-full bg-black/50 text-white safe-top"
      >
        <X className="size-5" />
      </button>

      {(phase === "camera" || phase === "loading") && (
        <>
          <video
            ref={videoRef}
            playsInline
            muted
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 bg-gradient-to-t from-black/70 to-transparent p-8 safe-bottom">
            {phase === "loading" ? (
              <span className="flex items-center gap-2 text-sm text-white">
                <Loader2 className="size-4 animate-spin" />
                {t("identifying")}
              </span>
            ) : (
              <>
                <p className="text-sm text-white/80">{t("point")}</p>
                <button
                  type="button"
                  onClick={capture}
                  aria-label={t("capture")}
                  className="flex size-16 items-center justify-center rounded-full border-4 border-white bg-white/20"
                >
                  <Camera className="size-7 text-white" />
                </button>
              </>
            )}
          </div>
        </>
      )}

      {phase === "denied" && (
        <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
          <p className="text-white">{t("blocked")}</p>
          <p className="max-w-xs text-sm text-white/60">{t("blockedHint")}</p>
          <Button variant="outline" onClick={onClose}>
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
        <div className="mt-auto max-h-[82vh] overflow-y-auto rounded-t-2xl bg-card p-5 safe-bottom">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-subtle" />
          {result.confidence != null && result.confidence < 0.45 && (
            <p className="mb-2 rounded-md bg-warning/15 px-2.5 py-1.5 text-xs text-warning">
              {t("lowConfidence")}
            </p>
          )}
          <h2 className="font-display text-xl font-bold">{result.name}</h2>
          {[result.creator, result.period, result.medium, result.location]
            .filter(Boolean).length > 0 && (
            <p className="mt-1 text-sm text-text-secondary">
              {[result.creator, result.period, result.medium, result.location]
                .filter(Boolean)
                .join(" · ")}
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
              {result.sources.map((s, i) => (
                <a
                  key={i}
                  href={s}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate rounded bg-subtle px-2 py-1 text-[11px] text-text-secondary hover:text-text-primary"
                >
                  {new URL(s).hostname}
                </a>
              ))}
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
        </div>
      )}
    </div>
  );
}
