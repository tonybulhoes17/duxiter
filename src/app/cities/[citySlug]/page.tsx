import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Sparkles } from "lucide-react";
import { CityHero } from "@/components/discovery/city-hero";
import { TrackView } from "@/components/analytics/track";
import { TourCard } from "@/components/discovery/tour-card";
import { Button } from "@/components/ui/button";
import { getCityBySlug } from "@/lib/queries";
import { getLocalizedText, type Locale } from "@/i18n/config";

interface Props {
  params: { citySlug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getCityBySlug(params.citySlug);
  if (!data) return {};
  const locale = (await getLocale()) as Locale;
  return { title: getLocalizedText(data.city.name, locale) };
}

export default async function CityPage({ params }: Props) {
  const locale = (await getLocale()) as Locale;
  const data = await getCityBySlug(params.citySlug);
  if (!data) notFound();

  const { city, tours } = data;
  const t = await getTranslations("cities");
  const tt = await getTranslations("tour");

  const name = getLocalizedText(city.name, locale);
  const cardLabels = {
    free: tt("free"),
    street: tt("street"),
    museum: tt("museum"),
    minutes: (n: number) => tt("duration", { minutes: n }),
    km: (n: number) => tt("distance", { km: n.toFixed(1) }),
  };

  return (
    <div className="pb-16">
      <TrackView event="city_view" cityId={city.id} />
      <CityHero
        name={name}
        country={city.country}
        description={getLocalizedText(city.description, locale)}
        imageUrl={city.cover_image_url}
        toursLabel={t("toursCount", { count: tours.length })}
        backHref="/cities"
        backLabel={t("title")}
      />

      <div className="container py-10">
        {/* AI itinerary CTA */}
        <div className="mb-10 flex flex-col gap-4 rounded-lg border border-border bg-[radial-gradient(120%_120%_at_0%_0%,rgba(229,57,53,0.15),transparent)] p-6 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-4">
            <div className="hidden size-11 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary sm:flex">
              <Sparkles className="size-5" />
            </div>
            <div>
              <h2 className="font-heading text-lg font-semibold">
                {t("aiCtaTitle")}
              </h2>
              <p className="mt-1 max-w-lg text-sm text-text-secondary">
                {t("aiCtaBody", { city: name })}
              </p>
            </div>
          </div>
          <Button asChild className="shrink-0">
            <Link href={`/itinerary/generate?city=${city.slug}`}>
              {t("aiCtaButton")}
            </Link>
          </Button>
        </div>

        <h2 className="font-display text-2xl font-bold">{t("curatedTours")}</h2>
        {tours.length === 0 ? (
          <p className="mt-4 text-sm text-text-muted">{t("noTours")}</p>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
      </div>
    </div>
  );
}
