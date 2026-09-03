import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ItineraryForm } from "@/components/itinerary/itinerary-form";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCities } from "@/lib/queries";
import { getLocalizedText, type Locale } from "@/i18n/config";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("itinerary");
  return { title: t("title"), description: t("subtitle") };
}

export default async function ItineraryGeneratePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/itinerary/generate");

  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("itinerary");
  const [cities, { data: credit }] = await Promise.all([
    getCities(),
    createClient()
      .from("itinerary_credits")
      .select("balance")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const cityOptions = cities.map((c) => ({
    slug: c.slug,
    name: getLocalizedText(c.name, locale),
  }));

  return (
    <div className="container py-8 md:py-12">
      <div className="mx-auto max-w-lg">
        <h1 className="font-display text-3xl font-bold">{t("title")}</h1>
        <p className="mt-1 text-text-secondary">{t("subtitle")}</p>
      </div>
      <div className="mt-8">
        <Suspense>
          <ItineraryForm
            cities={cityOptions}
            credits={credit?.balance ?? 0}
          />
        </Suspense>
      </div>
    </div>
  );
}
