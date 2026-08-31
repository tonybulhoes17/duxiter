"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft, ChevronDown, ChevronUp, Loader2, MapPin } from "lucide-react";
import { AudioPlayer } from "@/components/player/audio-player";
import { StopImageCarousel } from "@/components/player/stop-image-carousel";
import { PaywallOverlay } from "@/components/player/paywall-overlay";
import { MapView, type MapStop } from "@/components/player/map-view";
import { useAudio } from "@/components/audio/audio-provider";
import { buildTourAudioQueue } from "@/lib/audio-queue";
import { track } from "@/components/analytics/track";
import { Button } from "@/components/ui/button";
import { getLocalizedText, type Locale, type LocalizedText } from "@/i18n/config";
import type { StopImageRow } from "@/lib/database.types";
import type { AccessState } from "@/lib/access";

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
  latitude?: number | null;
  longitude?: number | null;
  audios?: ApiAudio[];
  images?: StopImageRow[];
}

interface ApiResponse {
  access: AccessState;
  freeCount: number;
  total: number;
  stops: ApiStop[];
}

export function StreetTourPlayer({
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
  const tc = useTranslations("common");
  const audio = useAudio();
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState(false);
  const [idx, setIdx] = useState(0);
  const [expanded, setExpanded] = useState(true);
  const jumpedRef = useRef(false);
  const completedRef = useRef(false);

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

  // Opened from the mini-player -> start on the stop that is playing.
  const activeQueueIndex = audio.queueKey === tourId ? audio.index : -1;
  useEffect(() => {
    if (!data || jumpedRef.current) return;
    jumpedRef.current = true;
    if (activeQueueIndex < 0) return;
    const i = data.stops.findIndex((s) => {
      const span = segments.get(s.id);
      return (
        span &&
        activeQueueIndex >= span.startIndex &&
        activeQueueIndex < span.startIndex + span.partCount
      );
    });
    if (i >= 0) setIdx(i);
  }, [data, activeQueueIndex, segments]);

  function partsFor(s: ApiStop) {
    return (s.audios ?? []).map((a, i) => ({
      id: a.id,
      label: a.label
        ? getLocalizedText(a.label, locale)
        : t("audioPartN", { n: i + 1 }),
      durationHint: a.duration,
      artwork: s.images?.[0]?.image_url ?? null,
    }));
  }

  const mapStops: MapStop[] = useMemo(
    () =>
      (data?.stops ?? []).map((s) => ({
        id: s.id,
        order_index: s.order_index,
        label: getLocalizedText(s.title, locale),
        lat: s.latitude ?? null,
        lng: s.longitude ?? null,
        locked: s.locked,
      })),
    [data, locale],
  );

  function goTo(next: number) {
    if (!data) return;
    const clamped = Math.min(Math.max(0, next), data.stops.length - 1);
    setIdx(clamped);
    setExpanded(true);
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate?.(25);
    }
    if (clamped === data.stops.length - 1 && !completedRef.current) {
      completedRef.current = true;
      track("tour_complete", { tour_id: tourId });
    }
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

  const stop = data.stops[idx];
  const title = getLocalizedText(stop.title, locale);
  const expired = data.access === "expired";

  return (
    <div className="relative h-dvh overflow-hidden">
      <div className="absolute inset-0">
        <MapView stops={mapStops} activeIndex={idx} onSelectStop={goTo} />
      </div>

      {/* Top bar */}
      <div className="absolute inset-x-0 top-0 flex items-center gap-2 p-4 safe-top">
        <Link
          href={`/tours/${tourId}`}
          aria-label="Back"
          className="flex size-10 items-center justify-center rounded-full bg-overlay text-text-primary backdrop-blur"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <span className="rounded-full bg-overlay px-3 py-2 font-metric text-xs text-text-primary backdrop-blur">
          {t("stopN", { n: idx + 1, total: data.total })}
        </span>
      </div>

      {/* Bottom sheet */}
      <div className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-border bg-card shadow-2xl safe-bottom">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center gap-3 px-4 pt-3"
        >
          <span className="mx-auto h-1 w-10 rounded-full bg-subtle" />
        </button>

        <div className="flex items-start gap-3 px-4 pb-2">
          <div className="min-w-0 flex-1">
            <p className="font-metric text-xs text-text-muted">
              {t("stopN", { n: idx + 1, total: data.total })}
            </p>
            <h2 className="font-display text-lg font-bold leading-tight">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? "Collapse" : "Expand"}
            className="flex size-8 items-center justify-center rounded-md text-text-secondary hover:bg-subtle"
          >
            {expanded ? (
              <ChevronDown className="size-5" />
            ) : (
              <ChevronUp className="size-5" />
            )}
          </button>
        </div>

        {expanded && (
          <div className="max-h-[52vh] space-y-3 overflow-y-auto px-4 pb-4">
            {stop.locked ? (
              <PaywallOverlay
                tourId={tourId}
                priceLabel={priceLabel}
                basePriceUsd={basePriceUsd}
                isAuthed={isAuthed}
                expired={expired}
              />
            ) : (
              <>
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
                {stop.latitude != null && (
                  <p className="flex items-center gap-1.5 font-metric text-xs text-text-muted">
                    <MapPin className="size-3.5" />
                    {stop.latitude.toFixed(5)}, {stop.longitude?.toFixed(5)}
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
              </>
            )}
          </div>
        )}

        <div className="flex gap-2 border-t border-border p-4">
          <Button
            variant="outline"
            onClick={() => goTo(idx - 1)}
            disabled={idx === 0}
            className="flex-1"
          >
            {tc("back")}
          </Button>
          <Button
            onClick={() => goTo(idx + 1)}
            disabled={idx >= data.stops.length - 1}
            className="flex-1"
          >
            {tc("next")} →
          </Button>
        </div>
      </div>
    </div>
  );
}
