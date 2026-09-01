"use client";

import { useEffect, useRef, useState } from "react";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { useTranslations } from "next-intl";
import { Crosshair, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { publicEnv } from "@/lib/env";

export interface PickedLocation {
  query: string;
  area?: string;
  label: string;
  lat: number;
  lng: number;
}

let optionsSet = false;

function compByType(
  comps: google.maps.GeocoderAddressComponent[] | undefined,
  type: string,
): string | undefined {
  return comps?.find((c) => c.types.includes(type))?.long_name;
}

/** Full-screen map: tap to drop a pin, we reverse-geocode it. */
export function LocationPicker({
  locale,
  onPick,
  onClose,
}: {
  locale: string;
  onPick: (loc: PickedLocation) => void;
  onClose: () => void;
}) {
  const t = useTranslations("itinerary");
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    publicEnv.googleMapsApiKey ? "loading" : "error",
  );
  const [picked, setPicked] = useState<PickedLocation | null>(null);
  const [resolving, setResolving] = useState(false);

  async function resolve(lat: number, lng: number) {
    setResolving(true);
    let out: PickedLocation = {
      query: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      label: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      lat,
      lng,
    };
    try {
      const g = geocoderRef.current;
      if (g) {
        const { results } = await g.geocode({
          location: { lat, lng },
          language: locale,
        });
        const best =
          results.find((r) => r.types.includes("street_address")) ??
          results.find((r) => r.types.includes("route")) ??
          results[0];
        if (best) {
          const c = best.address_components;
          const locality =
            compByType(c, "locality") ??
            compByType(c, "postal_town") ??
            compByType(c, "administrative_area_level_2") ??
            compByType(c, "administrative_area_level_1");
          const country = compByType(c, "country");
          const area =
            compByType(c, "sublocality") ??
            compByType(c, "neighborhood") ??
            compByType(c, "route");
          out = {
            query: [locality, country].filter(Boolean).join(", ") || out.query,
            area: area || undefined,
            label: best.formatted_address || out.label,
            lat,
            lng,
          };
        }
      }
    } catch {
      /* keep coord fallback */
    }
    setPicked(out);
    setResolving(false);
  }

  function drop(lat: number, lng: number) {
    if (!mapRef.current) return;
    if (!markerRef.current) {
      markerRef.current = new google.maps.Marker({
        map: mapRef.current,
        position: { lat, lng },
        icon: {
          path: "M12 0C5.4 0 0 5.2 0 11.6 0 20 12 34 12 34s12-14 12-22.4C24 5.2 18.6 0 12 0z",
          fillColor: "#E53935",
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 1.5,
          anchor: new google.maps.Point(12, 34),
        },
      });
    } else {
      markerRef.current.setPosition({ lat, lng });
    }
    void resolve(lat, lng);
  }

  function locateMe() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const ll = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        mapRef.current?.setCenter(ll);
        mapRef.current?.setZoom(15);
        drop(ll.lat, ll.lng);
      },
      undefined,
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  useEffect(() => {
    if (!publicEnv.googleMapsApiKey || !ref.current) return;
    let cancelled = false;
    (window as unknown as { gm_authFailure?: () => void }).gm_authFailure =
      () => !cancelled && setStatus("error");

    if (!optionsSet) {
      setOptions({ key: publicEnv.googleMapsApiKey, v: "weekly" });
      optionsSet = true;
    }

    Promise.all([importLibrary("maps"), importLibrary("geocoding")])
      .then(([{ Map }, { Geocoder }]) => {
        if (cancelled || !ref.current) return;
        const map = new Map(ref.current, {
          center: { lat: 20, lng: 0 },
          zoom: 2,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: "greedy",
        });
        mapRef.current = map;
        geocoderRef.current = new Geocoder();
        map.addListener("click", (e: google.maps.MapMouseEvent) => {
          if (e.latLng) drop(e.latLng.lat(), e.latLng.lng());
        });
        setStatus("ready");
        // best-effort recenter on the user
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              map.setCenter({
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
              });
              map.setZoom(13);
            },
            undefined,
            { timeout: 6000 },
          );
        }
      })
      .catch(() => !cancelled && setStatus("error"));

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <p className="text-sm font-medium">{t("mapPickerTitle")}</p>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("mapCancel")}
          className="flex size-9 items-center justify-center rounded-md text-text-secondary hover:bg-subtle"
        >
          <X className="size-5" />
        </button>
      </div>

      <div className="relative flex-1">
        {status === "error" ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
            <p className="text-sm text-text-secondary">{t("mapUnavailable")}</p>
          </div>
        ) : (
          <>
            <div ref={ref} className="h-full w-full" />
            {status === "loading" && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="size-6 animate-spin text-text-muted" />
              </div>
            )}
            <button
              type="button"
              onClick={locateMe}
              aria-label={t("useLocation")}
              className="absolute bottom-4 right-4 flex size-11 items-center justify-center rounded-full bg-card shadow-lg"
            >
              <Crosshair className="size-5 text-text-primary" />
            </button>
          </>
        )}
      </div>

      <div className="border-t border-border p-4 safe-bottom">
        <p className="min-h-[2.5rem] text-sm text-text-secondary">
          {resolving ? (
            <span className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" />
              {t("resolvingLocation")}
            </span>
          ) : picked ? (
            picked.label
          ) : (
            <span className="text-text-muted">{t("mapPickerHint")}</span>
          )}
        </p>
        <Button
          className="mt-2 w-full"
          disabled={!picked || resolving}
          onClick={() => picked && onPick(picked)}
        >
          {t("mapConfirm")}
        </Button>
      </div>
    </div>
  );
}
