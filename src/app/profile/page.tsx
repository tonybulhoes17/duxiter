import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { BookmarkCheck, Download, Sparkles, Ticket } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { localeLabels, type Locale } from "@/i18n/config";
import { LanguageSwitcher } from "@/components/nav/language-switcher";
import { TourCard } from "@/components/discovery/tour-card";
import type { TourWithMeta } from "@/lib/queries";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/profile");

  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("tour");
  const ti = await getTranslations("itinerary");
  const supabase = createClient();

  const [{ data: purchases }, { data: savedItinerariesData }] = await Promise.all([
    supabase
      .from("purchases")
      .select("tour:tours(*, tour_stops(count), reviews(rating))")
      .eq("user_id", user.id)
      .eq("status", "completed"),
    supabase
      .from("ai_itineraries")
      .select("id, city_name, generated_stops, is_saved, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(60),
  ]);

  const savedItineraries = (savedItinerariesData ?? []) as {
    id: string;
    city_name: string | null;
    is_saved: boolean | null;
    created_at: string;
    generated_stops: unknown[];
  }[];

  const purchaseRows = (purchases ?? []) as unknown as { tour: unknown }[];

  const tours: TourWithMeta[] = purchaseRows
    .map((p) => p.tour)
    .filter(Boolean)
    .map((row) => {
      const r = row as Record<string, unknown> & {
        tour_stops?: { count: number }[];
        reviews?: { rating: number }[];
      };
      const reviews = r.reviews ?? [];
      const avg =
        reviews.length > 0
          ? Math.round(
              (reviews.reduce((a, x) => a + x.rating, 0) / reviews.length) * 10,
            ) / 10
          : 0;
      return {
        ...(r as unknown as TourWithMeta),
        stopCount: r.tour_stops?.[0]?.count ?? 0,
        ratingAvg: avg,
        ratingCount: reviews.length,
      };
    });

  const cardLabels = {
    free: t("free"),
    street: t("street"),
    museum: t("museum"),
    minutes: (n: number) => t("duration", { minutes: n }),
    km: (n: number) => t("distance", { km: n.toFixed(1) }),
  };

  const name = user.profile?.full_name ?? user.email ?? "Traveler";

  return (
    <div className="container py-8 md:py-12">
      <div className="flex items-center gap-4">
        <div className="flex size-14 items-center justify-center rounded-full bg-subtle text-lg font-semibold text-text-secondary">
          {name.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold">{name}</h1>
          <p className="text-sm text-text-muted">{user.email}</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <span className="text-sm text-text-secondary">
          {localeLabels[user.profile?.preferred_language ?? locale].native}
        </span>
        <LanguageSwitcher />
        <Link
          href="/profile/downloads"
          className="ml-auto flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
        >
          <Download className="size-4" />
          Downloads
        </Link>
      </div>

      <section className="mt-10">
        <h2 className="flex items-center gap-2 font-display text-xl font-bold">
          <Ticket className="size-5 text-primary" />
          My tours
        </h2>
        {tours.length === 0 ? (
          <p className="mt-3 text-sm text-text-muted">
            You haven&apos;t unlocked any paid tours yet.{" "}
            <Link href="/cities" className="underline underline-offset-4">
              Browse cities
            </Link>
          </p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tours.map((tour) => (
              <TourCard
                key={tour.id}
                tour={tour}
                locale={locale}
                labels={cardLabels}
              />
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="flex items-center gap-2 font-display text-xl font-bold">
          <Sparkles className="size-5 text-primary" />
          {ti("myItineraries")}
        </h2>
        {savedItineraries.length === 0 ? (
          <p className="mt-3 text-sm text-text-muted">
            {ti("myItinerariesEmpty")}{" "}
            <Link
              href="/itinerary/generate"
              className="underline underline-offset-4"
            >
              {ti("generate")}
            </Link>
          </p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {savedItineraries.map((it) => (
              <li key={it.id}>
                <Link
                  href={`/itinerary/${it.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-4 hover:border-white/20"
                >
                  <div className="min-w-0">
                    <p className="truncate font-heading text-sm font-semibold">
                      {it.city_name}
                    </p>
                    <p className="font-metric text-xs text-text-muted">
                      {Array.isArray(it.generated_stops)
                        ? it.generated_stops.length
                        : 0}{" "}
                      · {new Date(it.created_at).toLocaleDateString(locale)}
                    </p>
                  </div>
                  {it.is_saved ? (
                    <BookmarkCheck className="size-4 shrink-0 text-primary" />
                  ) : (
                    <Sparkles className="size-4 shrink-0 text-text-muted" />
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
