import Link from "next/link";
import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import {
  ArrowRight,
  Camera,
  Compass,
  Headphones,
  MapPin,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CityCard } from "@/components/discovery/city-card";
import { getCities } from "@/lib/queries";
import type { Locale } from "@/i18n/config";

const HERO_IMAGE = "/hero.jpg";

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

  const features = [
    { icon: Headphones, title: t("f1Title"), body: t("f1Body") },
    { icon: MapPin, title: t("f2Title"), body: t("f2Body") },
    { icon: Sparkles, title: t("f3Title"), body: t("f3Body") },
  ];

  return (
    <div className="pb-16">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border bg-background">
        <Image
          src={HERO_IMAGE}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-[62%_28%]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/55 to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/25 to-black/30" />

        <div className="container relative z-10 py-20 md:py-28">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/30 px-3 py-1 text-xs text-white/80 backdrop-blur-sm">
              <Sparkles className="size-3.5 text-primary" />
              {t("citiesSubtitle")}
            </span>
            <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-white md:text-6xl">
              {t("heroTitle")}
            </h1>
            <p className="mt-4 max-w-md text-base text-white/70 md:text-lg">
              {t("heroSubtitle")}
            </p>

            <ul className="mt-8 space-y-4">
              {features.map((f) => (
                <li key={f.title} className="flex gap-3">
                  <f.icon className="mt-0.5 size-6 shrink-0 text-primary" />
                  <div>
                    <p className="font-heading text-sm font-semibold text-white">
                      {f.title}
                    </p>
                    <p className="text-sm text-white/65">{f.body}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/cities">
                  {t("heroCtaExplore")}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/25 bg-white/5 text-white hover:bg-white/10"
              >
                <Link href="/itinerary/generate">{t("heroCtaItinerary")}</Link>
              </Button>
            </div>

            <Link
              href="/identify"
              className="mt-4 inline-flex items-center gap-1.5 text-sm text-white/70 hover:text-white"
            >
              <Camera className="size-4" />
              {t("scanCta")}
            </Link>
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

      {/* Identify by photo */}
      <section className="container pb-6">
        <div className="relative overflow-hidden rounded-xl border border-border bg-background">
          <Image
            src="/identify-cta.jpg"
            alt=""
            fill
            sizes="(min-width: 1200px) 1136px, 100vw"
            className="object-cover object-[70%_center]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-black/65 to-transparent" />
          <div className="relative z-10 max-w-md p-6 md:p-8">
            <div className="flex size-12 items-center justify-center rounded-lg bg-primary/20 text-primary backdrop-blur-sm">
              <Camera className="size-6" />
            </div>
            <h2 className="mt-4 font-heading text-xl font-semibold text-white">
              {t("scanTitle")}
            </h2>
            <p className="mt-1.5 text-sm text-white/75">{t("scanBody")}</p>
            <Button asChild className="mt-5">
              <Link href="/identify">
                <Camera className="size-4" />
                {t("scanCta")}
              </Link>
            </Button>
          </div>
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
