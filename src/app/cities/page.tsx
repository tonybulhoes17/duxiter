import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { CitiesExplorer } from "@/components/discovery/cities-explorer";
import { getCities } from "@/lib/queries";
import { getLocalizedText, type Locale } from "@/i18n/config";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("cities");
  return { title: t("title"), description: t("subtitle") };
}

export default async function CitiesPage() {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("cities");
  const cities = await getCities();

  const items = cities.map((c) => ({
    city: c,
    name: getLocalizedText(c.name, locale),
    toursLabel: t("toursCount", { count: c.tourCount }),
  }));

  return (
    <div className="container py-8 md:py-12">
      <h1 className="font-display text-3xl font-bold md:text-4xl">{t("title")}</h1>
      <p className="mt-1 text-text-secondary">{t("subtitle")}</p>

      <CitiesExplorer
        items={items}
        locale={locale}
        searchPlaceholder={t("search")}
        emptyLabel={t("empty")}
      />
    </div>
  );
}
