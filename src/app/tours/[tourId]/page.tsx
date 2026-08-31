import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import {
  ChevronLeft,
  Clock,
  Footprints,
  Landmark,
  Lock,
  MapPin,
  Route,
  SignalHigh,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "@/components/discovery/star-rating";
import { ReviewsSection } from "@/components/discovery/reviews-section";
import { TourCta } from "@/components/discovery/tour-cta";
import { CheckoutResult } from "@/components/checkout/checkout-result";
import { TrackView } from "@/components/analytics/track";
import { getTourDetail } from "@/lib/queries";
import { getTourAccess } from "@/lib/access";
import { getSessionUser } from "@/lib/auth";
import { freeStopsCount, formatPrice } from "@/lib/format";
import { getLocalizedText, type Locale } from "@/i18n/config";
import { isUuid } from "@/lib/validate";

interface Props {
  params: { tourId: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (!isUuid(params.tourId)) return {};
  const tour = await getTourDetail(params.tourId);
  if (!tour) return {};
  const locale = (await getLocale()) as Locale;
  return {
    title: getLocalizedText(tour.title, locale),
    description: getLocalizedText(tour.short_description, locale),
  };
}

export default async function TourPage({ params }: Props) {
  if (!isUuid(params.tourId)) notFound();

  const locale = (await getLocale()) as Locale;
  const tour = await getTourDetail(params.tourId);
  if (!tour) notFound();

  const t = await getTranslations("tour");
  const user = await getSessionUser();
  const access = await getTourAccess(tour, user?.id ?? null);

  const title = getLocalizedText(tour.title, locale);
  const description = getLocalizedText(tour.description, locale);
  const isMuseum = tour.type === "museum";
  const isFree = Number(tour.price_usd) === 0;
  const priceLabel = formatPrice(Number(tour.price_usd), locale);
  const freeCount = freeStopsCount(tour.stops.length);
  const locking = !isFree && (access === "locked" || access === "expired");

  const difficultyLabel = t(tour.difficulty);

  return (
    <div className="pb-16">
      <TrackView event="tour_view" tourId={tour.id} />
      <Suspense>
        <CheckoutResult tourId={tour.id} />
      </Suspense>
      {/* Hero */}
      <section className="relative h-[42vh] min-h-[260px] w-full overflow-hidden border-b border-border">
        {tour.cover_image_url ? (
          <Image
            src={tour.cover_image_url}
            alt={title}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-elevated" />
        )}
        <div className="absolute inset-0 scrim-bottom" />

        {tour.city && (
          <Link
            href={`/cities/${tour.city.slug}`}
            aria-label={getLocalizedText(tour.city.name, locale)}
            className="absolute left-4 top-4 z-10 inline-flex items-center gap-1 rounded-full bg-overlay px-3 py-2 text-sm text-white backdrop-blur safe-top hover:bg-black/60"
          >
            <ChevronLeft className="size-4" />
            {getLocalizedText(tour.city.name, locale)}
          </Link>
        )}

        <div className="container relative flex h-full flex-col justify-end pb-6">
          {tour.city && (
            <span className="flex items-center gap-1.5 text-sm text-white/75">
              <MapPin className="size-3.5" />
              {getLocalizedText(tour.city.name, locale)}, {tour.city.country}
            </span>
          )}
          <h1 className="mt-1 max-w-3xl font-display text-3xl font-extrabold text-white md:text-5xl">
            {title}
          </h1>
        </div>
      </section>

      <div className="container grid gap-10 py-8 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {isMuseum ? <Landmark className="size-3" /> : <Footprints className="size-3" />}
              {isMuseum ? t("museum") : t("street")}
            </Badge>
            <Badge variant={isFree ? "success" : "primary"} className="font-metric">
              {isFree ? t("free") : priceLabel}
            </Badge>
            <Badge variant="outline">
              <SignalHigh className="size-3" />
              {t("difficulty")}: {difficultyLabel}
            </Badge>
            {tour.estimated_duration_minutes ? (
              <Badge variant="outline" className="font-metric">
                <Clock className="size-3" />
                {t("duration", { minutes: tour.estimated_duration_minutes })}
              </Badge>
            ) : null}
            {tour.distance_km ? (
              <Badge variant="outline" className="font-metric">
                <Route className="size-3" />
                {t("distance", { km: Number(tour.distance_km).toFixed(1) })}
              </Badge>
            ) : null}
            <StarRating
              value={tour.ratingAvg}
              count={tour.ratingCount}
              size="md"
            />
          </div>

          {/* About */}
          <h2 className="mt-8 font-display text-xl font-bold">{t("about")}</h2>
          <p className="mt-3 whitespace-pre-line leading-relaxed text-text-secondary">
            {description}
          </p>

          {/* Stops */}
          <h2 className="mt-10 font-display text-xl font-bold">
            {t("stopsPreview")}{" "}
            <span className="font-metric text-base font-normal text-text-muted">
              · {t("stops", { count: tour.stops.length })}
            </span>
          </h2>
          {locking && (
            <p className="mt-2 text-sm text-text-muted">
              {t("previewNote", { count: freeCount, price: priceLabel })}
            </p>
          )}
          <ol className="mt-4 space-y-2">
            {tour.stops.map((stop, i) => {
              const stopLocked = locking && i >= freeCount;
              return (
                <li
                  key={stop.id}
                  className="flex items-center gap-3 rounded-md border border-border bg-card px-4 py-3"
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-subtle font-metric text-xs text-text-secondary">
                    {i + 1}
                  </span>
                  <span
                    className={
                      stopLocked
                        ? "text-sm text-text-muted blur-[3px] select-none"
                        : "text-sm text-text-primary"
                    }
                  >
                    {getLocalizedText(stop.title, locale)}
                  </span>
                  {stopLocked && (
                    <Lock className="ml-auto size-4 shrink-0 text-locked" />
                  )}
                </li>
              );
            })}
          </ol>

          {/* Reviews */}
          <ReviewsSection
            tourId={tour.id}
            reviews={tour.reviews.map((r) => ({
              id: r.id,
              user_id: r.user_id,
              author: r.author,
              rating: r.rating,
              comment: r.comment,
              created_at: r.created_at,
            }))}
            ratingAvg={tour.ratingAvg}
            ratingCount={tour.ratingCount}
            locale={locale}
            currentUserId={user?.id ?? null}
            isAdmin={!!user?.isAdmin}
            canReview={
              !!user &&
              (isFree || access === "purchased" || access === "expired")
            }
          />
        </div>

        {/* Sticky purchase panel */}
        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-baseline justify-between">
              <span className="font-display text-2xl font-extrabold font-metric">
                {isFree ? t("free") : priceLabel}
              </span>
              {!isFree && (
                <span className="text-xs text-text-muted">≈ 6 months access</span>
              )}
            </div>
            <div className="mt-4">
              <TourCta
                tourId={tour.id}
                access={access}
                priceLabel={priceLabel}
                basePriceUsd={Number(tour.price_usd)}
                isAuthed={!!user}
              />
            </div>
            {locking && (
              <p className="mt-3 text-xs text-text-muted">
                {t("previewNote", { count: freeCount, price: priceLabel })}
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
