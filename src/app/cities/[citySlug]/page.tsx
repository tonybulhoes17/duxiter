import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { CityHero } from "@/components/discovery/city-hero";
import { TrackView } from "@/components/analytics/track";
import { TourCard } from "@/components/discovery/tour-card";
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
