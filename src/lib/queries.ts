import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/env";
import type {
  CityRow,
  ReviewRow,
  StopImageRow,
  TourRow,
  TourStopRow,
} from "@/lib/database.types";

export interface CityWithCount extends CityRow {
  tourCount: number;
}

export interface TourWithMeta extends TourRow {
  stopCount: number;
  ratingAvg: number;
  ratingCount: number;
}

export interface TourStopWithImages extends TourStopRow {
  images: StopImageRow[];
}

export interface TourDetail extends TourRow {
  city: Pick<CityRow, "id" | "slug" | "name" | "country"> | null;
  stops: TourStopWithImages[];
  reviews: (ReviewRow & { author: string | null })[];
  ratingAvg: number;
  ratingCount: number;
}

function agg(reviews: { rating: number }[]) {
  if (!reviews.length) return { avg: 0, count: 0 };
  const sum = reviews.reduce((a, r) => a + r.rating, 0);
  return { avg: Math.round((sum / reviews.length) * 10) / 10, count: reviews.length };
}

export const getCities = cache(async (): Promise<CityWithCount[]> => {
  if (!isSupabaseConfigured) return [];
  const supabase = createClient();
  const { data, error } = await supabase
    .from("cities")
    .select("*, tours(count)")
    .eq("is_active", true)
    .order("slug", { ascending: true });

  if (error || !data) return [];
  return data.map((c) => {
    const { tours, ...city } = c as unknown as CityRow & {
      tours: { count: number }[];
    };
    return { ...city, tourCount: tours?.[0]?.count ?? 0 };
  });
});

export const getCityBySlug = cache(
  async (
    slug: string,
  ): Promise<{ city: CityRow; tours: TourWithMeta[] } | null> => {
    if (!isSupabaseConfigured) return null;
    const supabase = createClient();

    const { data: city } = await supabase
      .from("cities")
      .select("*")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();
    if (!city) return null;

    const { data: tours } = await supabase
      .from("tours")
      .select("*, tour_stops(count), reviews(rating)")
      .eq("city_id", city.id)
      .eq("status", "approved")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    const mapped: TourWithMeta[] = (tours ?? []).map((row) => {
      const {
        tour_stops,
        reviews,
        ...tour
      } = row as unknown as TourRow & {
        tour_stops: { count: number }[];
        reviews: { rating: number }[];
      };
      const { avg, count } = agg(reviews ?? []);
      return {
        ...tour,
        stopCount: tour_stops?.[0]?.count ?? 0,
        ratingAvg: avg,
        ratingCount: count,
      };
    });

    return { city: city as CityRow, tours: mapped };
  },
);

export const getTourDetail = cache(
  async (tourId: string): Promise<TourDetail | null> => {
    if (!isSupabaseConfigured) return null;
    const supabase = createClient();

    const { data: tour } = await supabase
      .from("tours")
      .select(
        `*,
         city:cities(id, slug, name, country),
         tour_stops(*, stop_images(*)),
         reviews(*)`,
      )
      .eq("id", tourId)
      .eq("status", "approved")
      .eq("is_active", true)
      .maybeSingle();

    if (!tour) return null;

    const raw = tour as unknown as TourRow & {
      city: TourDetail["city"];
      tour_stops: (TourStopRow & { stop_images: StopImageRow[] })[];
      reviews: ReviewRow[];
    };

    const stops = [...(raw.tour_stops ?? [])]
      .sort((a, b) => a.order_index - b.order_index)
      .map((s) => ({
        ...s,
        images: [...(s.stop_images ?? [])].sort(
          (a, b) => a.order_index - b.order_index,
        ),
      }));

    const liveReviews = (raw.reviews ?? [])
      .filter((r) => !r.is_deleted)
      .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));

    const names = new Map<string, string | null>();
    if (liveReviews.length > 0) {
      const admin = createAdminClient();
      const { data: profiles } = await admin
        .from("user_profiles")
        .select("id, full_name")
        .in("id", Array.from(new Set(liveReviews.map((r) => r.user_id))));
      for (const p of profiles ?? []) names.set(p.id, p.full_name);
    }

    const reviews = liveReviews.map((r) => ({
      ...r,
      author: names.get(r.user_id) ?? null,
    }));

    const { avg, count } = agg(reviews);

    const { tour_stops, reviews: _reviews, ...tourFields } = raw;
    void tour_stops;
    void _reviews;

    return {
      ...(tourFields as TourRow),
      city: raw.city,
      stops,
      reviews,
      ratingAvg: avg,
      ratingCount: count,
    };
  },
);
