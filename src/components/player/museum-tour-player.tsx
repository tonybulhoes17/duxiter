"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft, Camera, ChevronDown, Loader2 } from "lucide-react";
import { AudioPlayer } from "@/components/player/audio-player";
import { useAudio } from "@/components/audio/audio-provider";
import { buildTourAudioQueue } from "@/lib/audio-queue";
import { StopImageCarousel } from "@/components/player/stop-image-carousel";
import { PaywallOverlay } from "@/components/player/paywall-overlay";
import { CameraIdentifier } from "@/components/player/camera-identifier";
import { track } from "@/components/analytics/track";
import { Button } from "@/components/ui/button";
import { getLocalizedText, type Locale } from "@/i18n/config";
import type { StopImageRow } from "@/lib/database.types";
import type { AccessState } from "@/lib/access";
import type { LocalizedText } from "@/i18n/config";

interface ApiAudio {
  id: string;
  url: string;
  duration: number | null;
  label: LocalizedText | null;
}

interface ApiStop {
  id: string;
  order_index: number;
  title: LocalizedText;
  locked: boolean;
  description?: LocalizedText | null;
  audios?: ApiAudio[];
  images?: StopImageRow[];
}

interface ApiResponse {
  access: AccessState;
  freeCount: number;
  total: number;
  stops: ApiStop[];
}

export function MuseumTourPlayer({
  tourId,
  tourTitle,
  locale,
  priceLabel,
  basePriceUsd,
  isAuthed,
}: {
  tourId: string;
  tourTitle: string;
  locale: Locale;
  priceLabel: string;
  basePriceUsd: number;
  isAuthed: boolean;
}) {
  const t = useTranslations("tour");
  const audio = useAudio();
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const stopRefs = useRef<(HTMLElement | null)[]>([]);
  const jumpedRef = useRef(false);

  useEffect(() => {
    let alive = true;
    fetch(`/api/tours/${tourId}/stops`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((json: ApiResponse) => alive && setData(json))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [tourId]);

  const { queue: audioQueue, segments } = useMemo(
    () =>
      buildTourAudioQueue(data?.stops ?? [], {
        tourId,
        tourTitle,
        locale,
        partLabel: (n, total) => t("audioPart", { n, total }),
      }),
    [data, locale, tourId, tourTitle, t],
  );

  // Opened from the mini-player -> scroll to the stop that is playing.
  const activeQueueIndex =
    audio.queueKey === tourId ? audio.index : -1;
  useEffect(() => {
    if (!data || jumpedRef.current) return;
    jumpedRef.current = true;
    if (activeQueueIndex < 0) return;
    for (const s of data.stops) {
      const span = segments.get(s.id);
      if (
        span &&
        activeQueueIndex >= span.startIndex &&
        activeQueueIndex < span.startIndex + span.partCount
      ) {
        const i = data.stops.findIndex((x) => x.id === s.id);
        requestAnimationFrame(() =>
          stopRefs.current[i]?.scrollIntoView({ block: "start" }),
        );
        break;
      }
    }
  }, [data, activeQueueIndex, segments]);

  function goToStop(idx: number) {
    stopRefs.current[idx]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function partsFor(stop: ApiStop) {
    return (stop.audios ?? []).map((a, i) => ({
      id: a.id,
      label: a.label
        ? getLocalizedText(a.label, locale)
        : t("audioPartN", { n: i + 1 }),
      durationHint: a.duration,
      artwork: stop.images?.[0]?.image_url ?? null,
    }));
  }

  if (error) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-text-secondary">{t("locked")}</p>
        <Button asChild variant="outline">
          <Link href={`/tours/${tourId}`}>{t("start")}</Link>
        </Button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2 className="size-6 animate-spin text-text-muted" />
      </div>
    );
  }

  const expired = data.access === "expired";

  return (
    <div className="mx-auto max-w-2xl pb-28">
      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-overlay px-4 py-3 backdrop-blur-lg safe-top">
        <Link
          href={`/tours/${tourId}`}
          className="flex size-9 items-center justify-center rounded-md text-text-secondary hover:bg-subtle"
          aria-label="Back"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div className="min-w-0">
          <p className="truncate font-heading text-sm font-semibold">{tourTitle}</p>
          <p className="font-metric text-xs text-text-muted">
            {t("stops", { count: data.total })}
          </p>
        </div>
      </header>

      {/* Stop list */}
      <div className="space-y-4 p-4">
        {data.stops.map((stop, i) => {
          const title = getLocalizedText(stop.title, locale);
          return (
            <section
              key={stop.id}
              ref={(el) => {
                stopRefs.current[i] = el;
              }}
              className="scroll-mt-20 overflow-hidden rounded-lg border border-border bg-card"
            >
              <div className="flex items-center gap-2 px-4 pt-4">
                <span className="flex size-6 items-center justify-center rounded-full bg-subtle font-metric text-xs text-text-secondary">
                  {i + 1}
                </span>
                <h2 className="font-heading text-base font-semibold">{title}</h2>
              </div>

              {stop.locked ? (
                <div className="p-4">
                  <PaywallOverlay
                    tourId={tourId}
                    priceLabel={priceLabel}
                    basePriceUsd={basePriceUsd}
                    isAuthed={isAuthed}
                    expired={expired}
                  />
                </div>
              ) : (
                <div className="space-y-3 p-4">
                  {stop.images && stop.images.length > 0 && (
                    <StopImageCarousel
                      images={stop.images}
                      locale={locale}
                      alt={title}
                    />
                  )}
                  {stop.description && (
                    <p className="whitespace-pre-line text-sm leading-relaxed text-text-secondary">
                      {getLocalizedText(stop.description, locale)}
                    </p>
                  )}
                  {segments.get(stop.id) ? (
                    <AudioPlayer
                      queue={audioQueue}
                      startIndex={segments.get(stop.id)!.startIndex}
                      parts={partsFor(stop)}
                    />
                  ) : (
                    <p className="rounded-md border border-border bg-elevated px-3 py-2 text-xs text-text-muted">
                      🎵 {t("audioSoon")}
                    </p>
                  )}
                  {i < data.stops.length - 1 && (
                    <button
                      type="button"
                      onClick={() => goToStop(i + 1)}
                      className="flex w-full items-center justify-center gap-1 rounded-md bg-subtle py-2.5 text-sm font-medium text-text-primary hover:bg-elevated"
                    >
                      {t("nextStop")}
                      <ChevronDown className="size-4" />
                    </button>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {/* Floating camera button */}
      <button
        type="button"
        onClick={() => {
          setCameraOpen(true);
          track("camera_open", { tour_id: tourId });
        }}
        aria-label="Identify with camera"
        className="fixed bottom-6 right-5 z-30 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 safe-bottom"
      >
        <Camera className="size-6" />
      </button>

      {cameraOpen && (
        <CameraIdentifier
          tourId={tourId}
          onClose={() => setCameraOpen(false)}
        />
      )}
    </div>
  );
}
