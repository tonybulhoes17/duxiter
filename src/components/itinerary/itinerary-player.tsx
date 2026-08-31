"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  ChevronUp,
  Clock,
  Eye,
  Footprints,
  Lightbulb,
  Navigation,
  Route as RouteIcon,
  Share2,
  Umbrella,
} from "lucide-react";
import { MapView, type MapStop } from "@/components/player/map-view";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { RichItinerary, ItineraryStop } from "@/lib/itinerary";
import { publicEnv } from "@/lib/env";

export function ItineraryPlayer({
  itineraryId,
  cityName,
  itinerary,
  initialSaved,
}: {
  itineraryId: string;
  cityName: string;
  itinerary: RichItinerary;
  initialSaved: boolean;
}) {
  const t = useTranslations("itinerary");
  const [saved, setSaved] = useState(initialSaved);
  const [savingBusy, setSavingBusy] = useState(false);
  const [navMode, setNavMode] = useState(false);
  const [idx, setIdx] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(true);

  const { summary, stops, route_overview, practical_tips, plan_b } = itinerary;

  const mapStops: MapStop[] = useMemo(
    () =>
      stops.map((s, i) => ({
        id: String(i),
        order_index: i,
        label: s.title,
        lat: s.latitude,
        lng: s.longitude,
        locked: false,
      })),
    [stops],
  );

  async function toggleSave() {
    setSavingBusy(true);
    const next = !saved;
    try {
      const res = await fetch(`/api/itinerary/${itineraryId}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saved: next }),
      });
      if (!res.ok) throw new Error();
      setSaved(next);
    } catch {
      toast.error(t("failed"));
    } finally {
      setSavingBusy(false);
    }
  }

  async function share() {
    const url = `${publicEnv.appUrl}/itinerary/${itineraryId}`;
    try {
      if (navigator.share) await navigator.share({ title: cityName, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success(t("linkCopied"));
      }
    } catch {
      /* cancelled */
    }
  }

  function goTo(next: number) {
    setIdx(Math.min(Math.max(0, next), stops.length - 1));
    setSheetOpen(true);
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate?.(25);
    }
  }

  // ---- Immersive navigation ----
  if (navMode) {
    const stop = stops[idx];
    return (
      <div className="fixed inset-0 z-50 h-dvh bg-card">
        <div className="absolute inset-0">
          <MapView stops={mapStops} activeIndex={idx} onSelectStop={goTo} />
        </div>
        <div className="absolute inset-x-0 top-0 p-4 safe-top">
          <button
            type="button"
            onClick={() => setNavMode(false)}
            className="flex size-10 items-center justify-center rounded-full bg-overlay text-text-primary backdrop-blur"
            aria-label="Back"
          >
            <ArrowLeft className="size-5" />
          </button>
        </div>

        <div className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-border bg-card shadow-2xl safe-bottom">
          <div className="flex items-start gap-3 px-4 pt-4">
            <div className="min-w-0 flex-1">
              <p className="font-metric text-xs text-text-muted">
                {idx + 1} / {stops.length}
                {stop.arrival_time ? ` · ${stop.arrival_time}` : ""}
              </p>
              <h2 className="font-display text-lg font-bold leading-tight">
                {stop.title}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setSheetOpen((v) => !v)}
              className="flex size-8 items-center justify-center rounded-md text-text-secondary hover:bg-subtle"
              aria-label={sheetOpen ? "Collapse" : "Expand"}
            >
              {sheetOpen ? (
                <ChevronDown className="size-5" />
              ) : (
                <ChevronUp className="size-5" />
              )}
            </button>
          </div>

          {sheetOpen && (
            <div className="max-h-[48vh] space-y-3 overflow-y-auto px-4 py-3">
              <StopBody t={t} stop={stop} />
            </div>
          )}

          <div className="flex gap-2 border-t border-border p-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => goTo(idx - 1)}
              disabled={idx === 0}
            >
              ←
            </Button>
            <Button
              className="flex-1"
              onClick={() => goTo(idx + 1)}
              disabled={idx >= stops.length - 1}
            >
              →
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ---- Overview ----
  return (
    <div className="pb-16">
      <div className="relative h-[36vh] min-h-[220px] w-full border-b border-border">
        <MapView
          stops={mapStops}
          activeIndex={idx}
          onSelectStop={setIdx}
          followUser={false}
        />
        <Link
          href="/itinerary/generate"
          className="absolute left-4 top-4 z-10 inline-flex items-center gap-1 rounded-full bg-overlay px-3 py-2 text-sm text-text-primary backdrop-blur safe-top hover:bg-black/40"
        >
          <ArrowLeft className="size-4" />
          {t("regenerate")}
        </Link>
      </div>

      <div className="container max-w-2xl py-6">
        <h1 className="font-display text-2xl font-bold">{summary.title}</h1>
        {summary.profile && (
          <p className="mt-1.5 text-sm text-text-secondary">{summary.profile}</p>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant="outline" className="font-metric">
            {t("stopsCount", { count: stops.length })}
          </Badge>
          <Badge variant="outline" className="font-metric">
            <Clock className="size-3" />
            {t("totalTime", { minutes: summary.total_minutes })}
          </Badge>
          {summary.total_distance_km ? (
            <Badge variant="outline" className="font-metric">
              <Footprints className="size-3" />
              {summary.total_distance_km} km
            </Badge>
          ) : null}
          {summary.start_time && summary.end_time ? (
            <Badge variant="outline" className="font-metric">
              {summary.start_time}–{summary.end_time}
            </Badge>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={() => setNavMode(true)}>
            <Navigation className="size-4" />
            {t("startNav")}
          </Button>
          <Button variant="outline" onClick={toggleSave} disabled={savingBusy}>
            {saved ? (
              <BookmarkCheck className="size-4 text-primary" />
            ) : (
              <Bookmark className="size-4" />
            )}
            {saved ? t("saved") : t("save")}
          </Button>
          <Button variant="outline" onClick={share}>
            <Share2 className="size-4" />
            {t("share")}
          </Button>
        </div>

        {route_overview && (
          <div className="mt-6 rounded-lg border border-border bg-card p-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-text-muted">
              <RouteIcon className="size-3.5" />
              {t("routeOverview")}
            </p>
            <p className="mt-1.5 text-sm text-text-secondary">{route_overview}</p>
          </div>
        )}

        <ol className="mt-6 space-y-4">
          {stops.map((stop, i) => (
            <li
              key={i}
              className="rounded-lg border border-border bg-card p-4"
            >
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-full bg-subtle font-metric text-xs text-text-secondary">
                  {i + 1}
                </span>
                <h2 className="font-heading text-base font-semibold">
                  {stop.title}
                </h2>
                <Badge variant="default" className="ml-auto shrink-0">
                  {stop.category}
                </Badge>
              </div>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-metric text-xs text-text-muted">
                {stop.arrival_time && <span>🕘 {stop.arrival_time}</span>}
                <span className="flex items-center gap-1">
                  <Clock className="size-3" />
                  {t("totalTime", { minutes: stop.recommended_minutes })}
                </span>
                {stop.travel_minutes_from_previous ? (
                  <span className="flex items-center gap-1">
                    <Footprints className="size-3" />+
                    {stop.travel_minutes_from_previous} min
                  </span>
                ) : null}
              </p>

              <div className="mt-3">
                <StopBody t={t} stop={stop} />
              </div>
            </li>
          ))}
        </ol>

        {practical_tips && practical_tips.length > 0 && (
          <section className="mt-8">
            <h3 className="flex items-center gap-2 font-heading text-base font-semibold">
              <Lightbulb className="size-4 text-primary" />
              {t("tips")}
            </h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-text-secondary">
              {practical_tips.map((tip, i) => (
                <li key={i}>{tip}</li>
              ))}
            </ul>
          </section>
        )}

        {plan_b && plan_b.length > 0 && (
          <section className="mt-6">
            <h3 className="flex items-center gap-2 font-heading text-base font-semibold">
              <Umbrella className="size-4 text-primary" />
              {t("planB")}
            </h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-text-secondary">
              {plan_b.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

function StopBody({
  stop,
  t,
}: {
  stop: ItineraryStop;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <div className="space-y-3">
      {stop.why_chosen && (
        <p className="text-xs italic text-text-muted">
          {t("whyChosen")}: {stop.why_chosen}
        </p>
      )}

      <p className="whitespace-pre-line text-sm leading-relaxed text-text-secondary">
        {stop.audioguide}
      </p>

      <p className="rounded-md border border-border bg-elevated px-3 py-2 text-xs text-text-muted">
        🎵 {t("audioSoon")}
      </p>

      {stop.dont_miss.length > 0 && (
        <div className="rounded-md bg-subtle/50 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-text-primary">
            <Eye className="size-3.5" />
            {t("dontMiss")}
          </p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-text-secondary">
            {stop.dont_miss.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        </div>
      )}

      {stop.interesting_fact && (
        <p className="rounded-md bg-primary/10 p-3 text-sm text-text-primary">
          💡 {stop.interesting_fact}
        </p>
      )}

      {stop.to_next_stop && (
        <div className="rounded-md border border-dashed border-border p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-text-primary">
            <Navigation className="size-3.5" />
            {t("toNext")}
          </p>
          <p className="mt-1 text-sm text-text-secondary">{stop.to_next_stop}</p>
        </div>
      )}
    </div>
  );
}
