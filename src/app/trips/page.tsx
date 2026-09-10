import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getSessionUser } from "@/lib/auth";
import { TripsList } from "@/components/trips/trips-list";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("trip");
  return { title: t("title"), description: t("subtitle") };
}

export default async function TripsPage() {
  const t = await getTranslations("trip");
  const user = await getSessionUser();

  return (
    <div className="container max-w-lg py-8 md:py-12">
      <h1 className="font-display text-3xl font-bold">{t("title")}</h1>
      <p className="mt-1 text-text-secondary">{t("subtitle")}</p>
      <TripsList canCreate={!!user} />
    </div>
  );
}
