"use client";

import { useEffect, useRef, useState } from "react";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { MapPinned } from "lucide-react";
import { publicEnv } from "@/lib/env";

export interface MapStop {
  id: string;
  order_index: number;
  label: string;
  lat: number | null;
  lng: number | null;
  locked: boolean;
}

let optionsSet = false;

// Dark style tuned to --bg-base #0F0F18 (Aubergine-like).
const DARK_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#12121c" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#12121c" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8a8aa0" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#6b6b82" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#1b2a1b" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#23233a" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#1a1a2b" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#2e2e47" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#1f1f33" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0c1424" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#3d4a6b" }] },
];

function pinIcon(number: number, locked: boolean, active: boolean) {
  const fill = locked ? "#6B7280" : "#E53935";
  const scale = active ? 1.25 : 1;
  return {
    path: "M12 0C5.4 0 0 5.2 0 11.6 0 20 12 34 12 34s12-14 12-22.4C24 5.2 18.6 0 12 0z",
    fillColor: fill,
    fillOpacity: 1,
    strokeColor: "#ffffff",
    strokeWeight: 1.5,
    scale,
    labelOrigin: new google.maps.Point(12, 12),
    anchor: new google.maps.Point(12, 34),
  } as google.maps.Symbol;
}

export function MapView({
  stops,
  activeIndex,
  onSelectStop,
  followUser = true,
}: {
  stops: MapStop[];
  activeIndex: number;
  onSelectStop?: (index: number) => void;
  followUser?: boolean;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const userDotRef = useRef<google.maps.Marker | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "no-key" | "error">(
    publicEnv.googleMapsApiKey ? "loading" : "no-key",
  );

  const points = stops.filter(
    (s): s is MapStop & { lat: number; lng: number } =>
      s.lat != null && s.lng != null,
  );

  useEffect(() => {
    if (!publicEnv.googleMapsApiKey || !ref.current) return;
    let cancelled = false;

    // Google calls this on key/referrer/billing auth failure — replace its
    // built-in grey error overlay with our own fallback.
    (window as unknown as { gm_authFailure?: () => void }).gm_authFailure =
      () => {
        if (!cancelled) setStatus("error");
      };

    if (!optionsSet) {
      setOptions({ key: publicEnv.googleMapsApiKey, v: "weekly" });
      optionsSet = true;
    }

    Promise.all([importLibrary("maps"), importLibrary("marker")])
      .then(async ([{ Map }]) => {
        if (cancelled || !ref.current) return;

        const map = new Map(ref.current, {
          center: points[0] ? { lat: points[0].lat, lng: points[0].lng } : { lat: 0, lng: 0 },
          zoom: 15,
          disableDefaultUI: true,
          gestureHandling: "greedy",
          styles: DARK_STYLE,
        });
        mapRef.current = map;

        // route polyline
        if (points.length > 1) {
          new google.maps.Polyline({
            path: points.map((p) => ({ lat: p.lat, lng: p.lng })),
            geodesic: true,
            strokeColor: "#E53935",
            strokeOpacity: 0,
            icons: [
              {
                icon: {
                  path: "M 0,-1 0,1",
                  strokeOpacity: 0.7,
                  strokeColor: "#E53935",
                  scale: 3,
                },
                offset: "0",
                repeat: "14px",
              },
            ],
            map,
          });
        }

        markersRef.current = points.map((p, i) => {
          const marker = new google.maps.Marker({
            position: { lat: p.lat, lng: p.lng },
            map,
            label: {
              text: String(p.order_index + 1),
              color: "#fff",
              fontSize: "12px",
              fontWeight: "700",
            },
            icon: pinIcon(p.order_index + 1, p.locked, i === activeIndex),
          });
          marker.addListener("click", () => onSelectStop?.(i));
          return marker;
        });

        const bounds = new google.maps.LatLngBounds();
        points.forEach((p) => bounds.extend({ lat: p.lat, lng: p.lng }));
        if (!bounds.isEmpty()) map.fitBounds(bounds, 64);

        // Re-measure once the container has its final size / becomes visible.
        google.maps.event.trigger(map, "resize");
        setTimeout(() => {
          google.maps.event.trigger(map, "resize");
          if (!bounds.isEmpty()) map.fitBounds(bounds, 64);
        }, 300);

        setStatus("ready");
      })
      .catch(() => !cancelled && setStatus("error"));

    return () => {
      cancelled = true;
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // update marker emphasis + recenter on active change
  useEffect(() => {
    if (status !== "ready") return;
    markersRef.current.forEach((m, i) => {
      const p = points[i];
      if (p) m.setIcon(pinIcon(p.order_index + 1, p.locked, i === activeIndex));
    });
    const active = points[activeIndex];
    if (active && mapRef.current) {
      mapRef.current.panTo({ lat: active.lat, lng: active.lng });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, status]);

  // user location
  useEffect(() => {
    if (status !== "ready" || !followUser || !navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const ll = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        if (!userDotRef.current && mapRef.current) {
          userDotRef.current = new google.maps.Marker({
            position: ll,
            map: mapRef.current,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 6,
              fillColor: "#3B82F6",
              fillOpacity: 1,
              strokeColor: "#fff",
              strokeWeight: 2,
            },
            zIndex: 999,
          });
        } else {
          userDotRef.current?.setPosition(ll);
        }
      },
      undefined,
      { enableHighAccuracy: true, maximumAge: 5000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [status, followUser]);

  if (status === "no-key" || status === "error") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 bg-elevated p-6 text-center">
        <MapPinned className="size-8 text-text-muted" />
        <p className="text-sm text-text-secondary">
          {status === "no-key"
            ? "Map needs a Google Maps API key."
            : "Map couldn't load."}
        </p>
        <p className="max-w-xs text-xs text-text-muted">
          {status === "no-key"
            ? "Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to enable GPS navigation. The tour content and audio work without it."
            : "The Maps API key rejected this origin. In dev, add this exact host:port to the key's HTTP-referrer allowlist. The tour content and audio still work."}
        </p>
      </div>
    );
  }

  return <div ref={ref} className="h-full w-full" />;
}
