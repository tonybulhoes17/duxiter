"use client";

import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { publicEnv } from "@/lib/env";

export interface ResolvedPlace {
  /** "City, Country" — good enough to feed the itinerary AI */
  query: string;
  /** finer detail if available: neighbourhood / street */
  area?: string;
  /** full human-readable address */
  label: string;
}

/**
 * Reverse geocoding through the Maps **JavaScript** API (google.maps.Geocoder).
 * The web-service endpoint (maps.googleapis.com/maps/api/geocode/json) rejects
 * referrer-restricted keys; the JS Geocoder accepts them, so we use that.
 */
let geocoderPromise: Promise<google.maps.Geocoder> | null = null;

function getGeocoder(): Promise<google.maps.Geocoder> | null {
  if (!publicEnv.googleMapsApiKey) return null;
  if (!geocoderPromise) {
    geocoderPromise = (async () => {
      setOptions({ key: publicEnv.googleMapsApiKey, v: "weekly" });
      const lib = (await importLibrary(
        "geocoding",
      )) as google.maps.GeocodingLibrary;
      return new lib.Geocoder();
    })();
  }
  return geocoderPromise;
}

function comp(
  comps: google.maps.GeocoderAddressComponent[],
  type: string,
): string | undefined {
  return comps.find((c) => c.types.includes(type))?.long_name;
}

export async function reverseGeocode(
  lat: number,
  lng: number,
  language: string,
): Promise<ResolvedPlace | null> {
  const pending = getGeocoder();
  if (!pending) return null;
  const fallback = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  try {
    const geocoder = await pending;
    const { results } = await geocoder.geocode({
      location: { lat, lng },
      language,
    });
    if (!results.length) return null;
    const best =
      results.find((r) => r.types.includes("street_address")) ??
      results.find((r) => r.types.includes("route")) ??
      results[0];
    const c = best.address_components;
    const locality =
      comp(c, "locality") ??
      comp(c, "postal_town") ??
      comp(c, "administrative_area_level_2") ??
      comp(c, "administrative_area_level_1");
    const country = comp(c, "country");
    const area =
      comp(c, "sublocality") ?? comp(c, "neighborhood") ?? comp(c, "route");
    const cityCountry = [locality, country].filter(Boolean).join(", ");
    return {
      query: cityCountry || best.formatted_address || fallback,
      area: area || undefined,
      label: best.formatted_address || cityCountry || fallback,
    };
  } catch {
    return null;
  }
}
