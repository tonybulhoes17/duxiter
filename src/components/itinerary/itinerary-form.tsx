"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Car,
  Check,
  Footprints,
  Loader2,
  LocateFixed,
  MapPin,
  Shuffle,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GeneratingAnimation } from "@/components/itinerary/generating-animation";
import {
  INTERESTS,
  PACE_OPTIONS,
  TIME_OPTIONS,
  type InterestId,
  type Pace,
  type StartMode,
  type TimeOption,
} from "@/lib/itinerary";
import { locales, localeLabels, type Locale } from "@/i18n/config";
import type { TravelMode } from "@/lib/database.types";
import { cn } from "@/lib/utils";

export function ItineraryForm({
  cities,
}: {
  cities: { slug: string; name: string }[];
}) {
  const t = useTranslations("itinerary");
  const activeLocale = useLocale() as Locale;
  const router = useRouter();
  const params = useSearchParams();

  const [citySlug, setCitySlug] = useState(
    params.get("city") ?? cities[0]?.slug ?? "",
  );
  const [minutes, setMinutes] = useState<TimeOption>(120);
  const [mode, setMode] = useState<TravelMode>("walking");
  const [pace, setPace] = useState<Pace>("normal");
  const [interests, setInterests] = useState<InterestId[]>([]);
  const [language, setLanguage] = useState<Locale>(activeLocale);
  const [loading, setLoading] = useState(false);

  const [startMode, setStartMode] = useState<StartMode>("auto");
  const [startArea, setStartArea] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);

  function toggleInterest(id: InterestId) {
    setInterests((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function requestLocation() {
    if (!navigator.geolocation) {
      toast.error(t("geoUnavailable"));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setStartMode("current");
        setLocating(false);
      },
      () => {
        setLocating(false);
        toast.error(t("geoDenied"));
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function submit() {
    if (!citySlug) return toast.error(t("pickCity"));
    if (startMode === "current" && !coords) {
      toast.error(t("geoNeeded"));
      return;
    }
    if (startMode === "area" && !startArea.trim()) {
      toast.error(t("areaNeeded"));
      return;
    }
    setLoading(true);
    try {
      const now = new Date();
      const startTime = `${String(now.getHours()).padStart(2, "0")}:${String(
        now.getMinutes(),
      ).padStart(2, "0")}`;
      const res = await fetch("/api/itinerary/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          citySlug,
          minutes,
          travelMode: mode,
          pace,
          interests,
          language,
          startTime,
          start: {
            mode: startMode,
            lat: coords?.lat,
            lng: coords?.lng,
            area: startArea.trim() || undefined,
          },
        }),
      });
      if (!res.ok) throw new Error();
      const { id } = await res.json();
      router.push(`/itinerary/${id}`);
    } catch {
      setLoading(false);
      toast.error(t("failed"));
    }
  }

  if (loading) return <GeneratingAnimation />;

  const timeLabels: Record<TimeOption, string> = {
    30: t("time30"),
    60: t("time60"),
    120: t("time120"),
    180: t("time180"),
    240: t("time240"),
  };

  return (
    <div className="mx-auto max-w-lg space-y-7">
      {/* City */}
      <div className="space-y-2">
        <Label htmlFor="city">{t("city")}</Label>
        <select
          id="city"
          value={citySlug}
          onChange={(e) => setCitySlug(e.target.value)}
          className="h-11 w-full rounded-md border border-border bg-elevated px-3 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="" disabled>
            {t("cityPlaceholder")}
          </option>
          {cities.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Start point */}
      <div className="space-y-2">
        <Label>{t("startPoint")}</Label>
        <div className="grid gap-2 sm:grid-cols-3">
          {(
            [
              ["auto", Shuffle, t("startAuto")],
              ["current", LocateFixed, t("startCurrent")],
              ["area", MapPin, t("startArea")],
            ] as const
          ).map(([value, Icon, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setStartMode(value);
                if (value === "current" && !coords) requestLocation();
              }}
              className={cn(
                "flex items-center justify-center gap-2 rounded-md border py-2.5 text-sm font-medium transition-colors",
                startMode === value
                  ? "border-primary bg-primary/10 text-text-primary"
                  : "border-border text-text-secondary hover:border-white/20",
              )}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </div>

        {startMode === "current" && (
          <p className="flex items-center gap-1.5 text-xs text-text-muted">
            {locating ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                {t("locating")}
              </>
            ) : coords ? (
              <>
                <Check className="size-3.5 text-success" />
                {t("locationCaptured")}
              </>
            ) : (
              <button
                type="button"
                onClick={requestLocation}
                className="underline underline-offset-2"
              >
                {t("shareLocation")}
              </button>
            )}
          </p>
        )}

        {startMode === "area" && (
          <Input
            value={startArea}
            onChange={(e) => setStartArea(e.target.value)}
            placeholder={t("areaPlaceholder")}
          />
        )}
      </div>

      {/* Time */}
      <div className="space-y-2">
        <Label>{t("time")}</Label>
        <div className="flex flex-wrap gap-2">
          {TIME_OPTIONS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMinutes(m)}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                minutes === m
                  ? "border-primary bg-primary/10 text-text-primary"
                  : "border-border text-text-secondary hover:border-white/20",
              )}
            >
              {timeLabels[m]}
            </button>
          ))}
        </div>
      </div>

      {/* Mode + pace */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{t("mode")}</Label>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["walking", Footprints, t("walking")],
                ["car", Car, t("car")],
              ] as const
            ).map(([value, Icon, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-md border py-2.5 text-sm font-medium transition-colors",
                  mode === value
                    ? "border-primary bg-primary/10 text-text-primary"
                    : "border-border text-text-secondary hover:border-white/20",
                )}
              >
                <Icon className="size-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label>{t("pace")}</Label>
          <div className="grid grid-cols-3 gap-2">
            {PACE_OPTIONS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPace(p)}
                className={cn(
                  "rounded-md border py-2.5 text-xs font-medium transition-colors",
                  pace === p
                    ? "border-primary bg-primary/10 text-text-primary"
                    : "border-border text-text-secondary hover:border-white/20",
                )}
              >
                {t(`pace_${p}`)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Interests */}
      <div className="space-y-2">
        <Label>{t("interests")}</Label>
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map(({ id, emoji }) => (
            <button
              key={id}
              type="button"
              onClick={() => toggleInterest(id)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm transition-colors",
                interests.includes(id)
                  ? "border-primary bg-primary/10 text-text-primary"
                  : "border-border text-text-secondary hover:border-white/20",
              )}
            >
              {emoji} {t(`interest.${id}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Language */}
      <div className="space-y-2">
        <Label htmlFor="lang">{t("language")}</Label>
        <select
          id="lang"
          value={language}
          onChange={(e) => setLanguage(e.target.value as Locale)}
          className="h-11 w-full rounded-md border border-border bg-elevated px-3 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {locales.map((l) => (
            <option key={l} value={l}>
              {localeLabels[l].flag} {localeLabels[l].native}
            </option>
          ))}
        </select>
      </div>

      <Button onClick={submit} size="lg" className="w-full">
        <Sparkles className="size-4" />
        {t("generate")}
      </Button>
      <p className="text-center text-xs text-text-muted">{t("generateHint")}</p>
    </div>
  );
}
