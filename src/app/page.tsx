import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRight, Compass, Headphones, MapPin, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CityCard } from "@/components/discovery/city-card";
import { getCities } from "@/lib/queries";
import type { Locale } from "@/i18n/config";

export default async function LandingPage() {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("landing");
  const tc = await getTranslations("cities");
  const cities = (await getCities()).slice(0, 8);

  const steps = [
    { icon: Compass, title: t("step1Title"), body: t("step1Body") },
    { icon: MapPin, title: t("step2Title"), body: t("step2Body") },
    { icon: Headphones, title: t("step3Title"), body: t("step3Body") },
  ];

  return (
    <div className="pb-16">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(229,57,53,0.22),transparent)]" />
        <div className="container flex flex-col items-center gap-6 py-20 text-center md:py-28">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-text-secondary">
            <Sparkles className="size-3.5 text-primary" />
            {t("citiesSubtitle")}
          </span>
          <h1 className="max-w-3xl font-display text-4xl font-extrabold leading-[1.1] tracking-tight md:text-6xl">
            {t("heroTitle")}
          </h1>
          <p className="max-w-xl text-base text-text-secondary md:text-lg">
            {t("heroSubtitle")}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/cities">
                {t("heroCtaExplore")}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/itinerary/generate">{t("heroCtaItinerary")}</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="container py-16">
        <h2 className="text-center font-display text-2xl font-bold md:text-3xl">
          {t("howItWorks")}
        </h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {steps.map((s, i) => (
            <div
              key={i}
              className="rounded-lg border border-border bg-card p-6"
            >
              <div className="flex size-11 items-center justify-center rounded-md bg-primary/15 text-primary">
                <s.icon className="size-5" />
              </div>
              <p className="mt-4 font-metric text-xs text-text-muted">
                0{i + 1}
              </p>
              <h3 className="mt-1 font-heading text-lg font-semibold">
                {s.title}
              </h3>
              <p className="mt-2 text-sm text-text-secondary">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured cities */}
      {cities.length > 0 && (
        <section className="container">
          <div className="flex items-end justify-between">
            <h2 className="font-display text-2xl font-bold md:text-3xl">
              {t("citiesTitle")}
            </h2>
            <Link
              href="/cities"
              className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
            >
              {t("viewAllCities")}
              <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            {cities.map((city) => (
              <CityCard
                key={city.id}
                city={city}
                locale={locale}
                toursLabel={tc("toursCount", { count: city.tourCount })}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
