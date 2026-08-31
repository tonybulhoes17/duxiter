"use client";

import { useEffect, useRef } from "react";

type EventType =
  | "tour_view"
  | "tour_start"
  | "tour_complete"
  | "city_view"
  | "itinerary_generate"
  | "camera_open";

export function track(
  event_type: EventType,
  payload: {
    tour_id?: string;
    city_id?: string;
    metadata?: Record<string, unknown>;
  } = {},
) {
  try {
    const body = JSON.stringify({ event_type, ...payload });
    if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
      navigator.sendBeacon(
        "/api/analytics/event",
        new Blob([body], { type: "application/json" }),
      );
    } else {
      void fetch("/api/analytics/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      });
    }
  } catch {
    /* analytics must never break the app */
  }
}

/** Fire a page-view style event once on mount. */
export function TrackView({
  event,
  tourId,
  cityId,
}: {
  event: EventType;
  tourId?: string;
  cityId?: string;
}) {
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    track(event, { tour_id: tourId, city_id: cityId });
  }, [event, tourId, cityId]);
  return null;
}
