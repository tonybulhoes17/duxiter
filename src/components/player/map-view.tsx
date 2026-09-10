"use client";

import { useEffect, useRef, useState } from "react";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { Crosshair, MapPinned, Minus, Plus } from "lucide-react";
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

type LatLng = { lat: number; lng: number };

function haversine(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
function bearing(a: LatLng, b: LatLng): number {
  const φ1 = (a.lat * Math.PI) / 180;
  const φ2 = (b.lat * Math.PI) / 180;
  const λ = ((b.lng - a.lng) * Math.PI) / 180;
  const y = Math.sin(λ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(λ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}
function fmtDist(m: number): string {
  return m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`;
}

/** Advanced-marker pin as a DOM node (vector maps). */
function makePin(n: number, locked: boolean, active: boolean): HTMLElement {
  const el = document.createElement("div");
  el.style.cssText = `
    transform: translateY(-50%);
    display:flex;align-items:center;justify-content:center;
    width:${active ? 34 : 26}px;height:${active ? 34 : 26}px;border-radius:50%;
    background:${locked ? "#6B7280" : active ? "#E53935" : "#c1352f"};
    color:#fff;font:700 ${active ? 14 : 12}px/1 ui-sans-serif,system-ui;
    border:2.5px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.45);
    transition:all .2s;`;
  el.textContent = String(n);
  return el;
}
/** Raster fallback symbol. */
function pinSymbol(locked: boolean, active: boolean): google.maps.Symbol {
  return {
    path: "M12 0C5.4 0 0 5.2 0 11.6 0 20 12 34 12 34s12-14 12-22.4C24 5.2 18.6 0 12 0z",
    fillColor: locked ? "#6B7280" : "#E53935",
    fillOpacity: 1,
    strokeColor: "#fff",
    strokeWeight: 2,
    scale: active ? 1.5 : 1.1,
    labelOrigin: new google.maps.Point(12, 12),
    anchor: new google.maps.Point(12, 34),
  };
}

async function walkingPath(points: LatLng[]): Promise<LatLng[] | null> {
  if (points.length < 2) return null;
  const key =
    "duxmap:" +
    points.map((p) => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`).join("|");
  try {
    const cached = sessionStorage.getItem(key);
    if (cached) return JSON.parse(cached) as LatLng[];
  } catch {
    /* ignore */
  }
  try {
    const { DirectionsService } = (await importLibrary(
      "routes",
    )) as google.maps.RoutesLibrary;
    const svc = new DirectionsService();
    const res = await svc.route({
      origin: points[0],
      destination: points[points.length - 1],
      waypoints: points.slice(1, -1).map((location) => ({ location })),
      travelMode: google.maps.TravelMode.WALKING,
    });
    const path = res.routes[0]?.overview_path.map((p) => ({
      lat: p.lat(),
      lng: p.lng(),
    }));
    if (path?.length) {
      try {
        sessionStorage.setItem(key, JSON.stringify(path));
      } catch {
        /* ignore */
      }
      return path;
    }
  } catch {
    /* fall back to straight lines */
  }
  return null;
}

export function MapView({
  stops,
  activeIndex,
  onSelectStop,
  followUser = true,
  mode = "navigate",
}: {
  stops: MapStop[];
  activeIndex: number;
  onSelectStop?: (index: number) => void;
  followUser?: boolean;
  mode?: "overview" | "navigate";
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<
    (google.maps.Marker | google.maps.marker.AdvancedMarkerElement)[]
  >([]);
  const userRef = useRef<google.maps.Marker | null>(null);
  const userPos = useRef<LatLng | null>(null);
  const advancedRef = useRef(false);
  const [status, setStatus] = useState<"loading" | "ready" | "no-key" | "error">(
    publicEnv.googleMapsApiKey ? "loading" : "no-key",
  );
  const [distToStop, setDistToStop] = useState<number | null>(null);

  const points = stops.filter(
    (s): s is MapStop & { lat: number; lng: number } =>
      s.lat != null && s.lng != null,
  );
  const mapId = publicEnv.googleMapsMapId || undefined;

  // ---- init ----
  useEffect(() => {
    if (!publicEnv.googleMapsApiKey || !ref.current) return;
    let cancelled = false;
    (window as unknown as { gm_authFailure?: () => void }).gm_authFailure =
      () => !cancelled && setStatus("error");

    if (!optionsSet) {
      setOptions({ key: publicEnv.googleMapsApiKey, v: "weekly" });
      optionsSet = true;
    }

    (async () => {
      try {
        const [{ Map }, markerLib] = await Promise.all([
          importLibrary("maps") as Promise<google.maps.MapsLibrary>,
          importLibrary("marker") as Promise<google.maps.MarkerLibrary>,
        ]);
        if (cancelled || !ref.current) return;

        const first = points[activeIndex] ?? points[0];
        const map = new Map(ref.current, {
          center: first ?? { lat: 0, lng: 0 },
          zoom: mode === "navigate" ? 16.5 : 15,
          mapId,
          disableDefaultUI: true,
          clickableIcons: false,
          gestureHandling: "greedy",
          keyboardShortcuts: false,
        });
        mapRef.current = map;
        advancedRef.current = !!mapId && !!markerLib.AdvancedMarkerElement;

        // real walking route (falls back to straight lines)
        const straight: LatLng[] = points.map((p) => ({ lat: p.lat, lng: p.lng }));
        const path = (await walkingPath(straight)) ?? straight;
        if (!cancelled) {
          new google.maps.Polyline({
            path,
            geodesic: true,
            strokeColor: "#E53935",
            strokeOpacity: 0.9,
            strokeWeight: 5,
            map,
          });
        }

        // markers
        markersRef.current = points.map((p, i) => {
          const active = i === activeIndex;
          if (advancedRef.current) {
            const m = new markerLib.AdvancedMarkerElement({
              position: p,
              map,
              content: makePin(p.order_index + 1, p.locked, active),
              zIndex: active ? 999 : 1,
            });
            m.addListener("click", () => onSelectStop?.(i));
            return m;
          }
          const m = new google.maps.Marker({
            position: p,
            map,
            label: {
              text: String(p.order_index + 1),
              color: "#fff",
              fontSize: "12px",
              fontWeight: "700",
            },
            icon: pinSymbol(p.locked, active),
            zIndex: active ? 999 : 1,
          });
          m.addListener("click", () => onSelectStop?.(i));
          return m;
        });

        if (mode === "overview") {
          const b = new google.maps.LatLngBounds();
          points.forEach((p) => b.extend(p));
          if (!b.isEmpty()) map.fitBounds(b, 56);
        }
        google.maps.event.trigger(map, "resize");
        setTimeout(() => {
          google.maps.event.trigger(map, "resize");
          if (mode === "navigate") {
            const a = points[activeIndex];
            if (a) map.panTo(a);
          } else {
            const b = new google.maps.LatLngBounds();
            points.forEach((p) => b.extend(p));
            if (!b.isEmpty()) map.fitBounds(b, 56);
          }
        }, 250);

        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      markersRef.current.forEach((m) => {
        if ("setMap" in m) m.setMap(null);
        else m.map = null;
      });
      markersRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- active stop change ----
  useEffect(() => {
    if (status !== "ready") return;
    markersRef.current.forEach((m, i) => {
      const p = points[i];
      if (!p) return;
      const active = i === activeIndex;
      if (advancedRef.current) {
        const am = m as google.maps.marker.AdvancedMarkerElement;
        am.content = makePin(p.order_index + 1, p.locked, active);
        am.zIndex = active ? 999 : 1;
      } else {
        (m as google.maps.Marker).setIcon(pinSymbol(p.locked, active));
        (m as google.maps.Marker).setZIndex(active ? 999 : 1);
      }
    });

    const a = points[activeIndex];
    const map = mapRef.current;
    if (a && map) {
      map.panTo(a);
      if (mode === "navigate") {
        map.setZoom(16.8);
        const nxt = points[activeIndex + 1];
        try {
          map.setTilt(mapId ? 45 : 0);
          if (nxt) map.setHeading(bearing(a, nxt));
        } catch {
          /* raster maps ignore tilt/heading */
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, status]);

  // ---- user location ----
  useEffect(() => {
    if (status !== "ready" || !followUser || !navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const ll = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        userPos.current = ll;
        const a = points[activeIndex];
        if (a) setDistToStop(haversine(ll, a));
        if (!userRef.current && mapRef.current) {
          userRef.current = new google.maps.Marker({
            position: ll,
            map: mapRef.current,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 7,
              fillColor: "#2563EB",
              fillOpacity: 1,
              strokeColor: "#fff",
              strokeWeight: 3,
            },
            zIndex: 1000,
          });
        } else {
          userRef.current?.setPosition(ll);
        }
      },
      undefined,
      { enableHighAccuracy: true, maximumAge: 4000 },
    );
    return () => navigator.geolocation.clearWatch(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, followUser, activeIndex]);

  if (status === "no-key" || status === "error") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 bg-elevated p-6 text-center">
        <MapPinned className="size-8 text-text-muted" />
        <p className="text-sm text-text-secondary">
          {status === "no-key"
            ? "Map needs a Google Maps API key."
            : "Map couldn’t load."}
        </p>
        <p className="max-w-xs text-xs text-text-muted">
          The tour content and audio work without it.
        </p>
      </div>
    );
  }

  const zoomBy = (d: number) => {
    const m = mapRef.current;
    if (m) m.setZoom((m.getZoom() ?? 15) + d);
  };
  const recenter = () => {
    const m = mapRef.current;
    if (!m) return;
    if (userPos.current) {
      m.panTo(userPos.current);
      m.setZoom(17);
    } else if (points[activeIndex]) {
      m.panTo(points[activeIndex]);
      m.setZoom(16.8);
    }
  };

  return (
    <div className="relative h-full w-full">
      <div ref={ref} className="h-full w-full" />

      {status === "ready" && (
        <>
          {distToStop != null && distToStop > 25 && (
            <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white backdrop-blur">
              {fmtDist(distToStop)} → parada {activeIndex + 1}
            </div>
          )}
          <div className="absolute bottom-4 right-3 flex flex-col gap-2">
            <button
              onClick={recenter}
              aria-label="Recenter"
              className="flex size-10 items-center justify-center rounded-full bg-white text-neutral-800 shadow-lg active:scale-95"
            >
              <Crosshair className="size-5" />
            </button>
            <div className="overflow-hidden rounded-full bg-white shadow-lg">
              <button
                onClick={() => zoomBy(1)}
                aria-label="Zoom in"
                className="flex size-10 items-center justify-center text-neutral-800 active:bg-neutral-100"
              >
                <Plus className="size-5" />
              </button>
              <div className="mx-2 h-px bg-neutral-200" />
              <button
                onClick={() => zoomBy(-1)}
                aria-label="Zoom out"
                className="flex size-10 items-center justify-center text-neutral-800 active:bg-neutral-100"
              >
                <Minus className="size-5" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
