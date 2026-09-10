"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  Pause,
  Play,
} from "lucide-react";
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
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const stripRef = useRef<HTMLDivElement | null>(null);

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
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate?.(20);
    }
    stripRef.current
      ?.querySelector<HTMLElement>(`[data-chip="${clamped}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    if (clamped === data.stops.length - 1 && !completedRef.current) {
      completedRef.current = true;
      track("tour_complete", { tour_id: tourId });
    }
  }

  function onTouchStart(e: React.TouchEvent) {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
  function onTouchEnd(e: React.TouchEvent) {
    const s = touchStart.current;
    touchStart.current = null;
    if (!s) return;
    const dx = e.changedTouches[0].clientX - s.x;
    const dy = e.changedTouches[0].clientY - s.y;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.8) {
      goTo(idx + (dx < 0 ? 1 : -1));
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
        <span className="truncate rounded-full bg-overlay px-3 py-2 font-metric text-xs text-text-primary backdrop-blur">
          {tourTitle}
        </span>
      </div>

      {/* Bottom sheet */}
      <div
        className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-border bg-card shadow-2xl safe-bottom"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full justify-center pt-2.5"
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          <span className="h-1 w-10 rounded-full bg-subtle" />
        </button>

        {/* Stop strip — tap a number to jump, swipe the sheet to move */}
        <div
          ref={stripRef}
          className="flex gap-2 overflow-x-auto px-3 pt-2.5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {data.stops.map((s, i) => {
            const done = i < idx;
            const active = i === idx;
            return (
              <button
                key={s.id}
                data-chip={i}
                onClick={() => goTo(i)}
                className={
                  active
                    ? "flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground"
                    : done
                      ? "flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/25 text-xs font-semibold text-text-primary"
                      : "flex size-8 shrink-0 items-center justify-center rounded-full bg-subtle text-xs font-semibold text-text-secondary"
                }
                aria-label={t("stopN", { n: i + 1, total: data.total })}
              >
                {done && !active ? <Check className="size-3.5" /> : i + 1}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 px-3 py-2">
          <button
            type="button"
            onClick={() => goTo(idx - 1)}
            disabled={idx === 0}
            aria-label={tc("back")}
            className="flex size-10 shrink-0 items-center justify-center rounded-full text-text-secondary hover:bg-subtle disabled:opacity-30"
          >
            <ChevronDown className="size-5 rotate-90" />
          </button>

          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="min-w-0 flex-1 text-left"
          >
            <p className="font-metric text-[11px] text-text-muted">
              {t("stopN", { n: idx + 1, total: data.total })}
            </p>
            <h2 className="truncate font-display text-base font-bold leading-tight">
              {title}
            </h2>
          </button>

          {!expanded && !stop.locked && segments.get(stop.id) && (
            <button
              type="button"
              onClick={() => {
                const start = segments.get(stop.id)!.startIndex;
                if (audio.queueKey === tourId && audio.index === start)
                  audio.toggle();
                else audio.playQueue(audioQueue, start);
              }}
              aria-label="Play"
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
            >
              {audio.queueKey === tourId &&
              audio.index === segments.get(stop.id)!.startIndex &&
              audio.playing ? (
                <Pause className="size-5" />
              ) : (
                <Play className="size-5 translate-x-px" />
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() => goTo(idx + 1)}
            disabled={idx >= data.stops.length - 1}
            aria-label={tc("next")}
            className="flex size-10 shrink-0 items-center justify-center rounded-full text-text-secondary hover:bg-subtle disabled:opacity-30"
          >
            <ChevronDown className="size-5 -rotate-90" />
          </button>

          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? "Collapse" : "Expand"}
            className="flex size-8 shrink-0 items-center justify-center rounded-md text-text-secondary hover:bg-subtle"
          >
            {expanded ? (
              <ChevronDown className="size-5" />
            ) : (
              <ChevronUp className="size-5" />
            )}
          </button>
        </div>

        {expanded && (
          <div className="max-h-[46vh] space-y-3 overflow-y-auto border-t border-border px-4 py-3">
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
                {idx < data.stops.length - 1 && (
                  <Button className="w-full" onClick={() => goTo(idx + 1)}>
                    {tc("next")}:{" "}
                    {getLocalizedText(data.stops[idx + 1].title, locale)} →
                  </Button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
