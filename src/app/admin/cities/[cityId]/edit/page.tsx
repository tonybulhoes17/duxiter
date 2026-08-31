import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { CityForm } from "@/components/admin/city-form";
import { getAdminCity } from "@/lib/admin-queries";
import { getLocalizedText } from "@/i18n/config";
import { isUuid } from "@/lib/validate";

export default async function EditCityPage({
  params,
}: {
  params: { cityId: string };
}) {
  if (!isUuid(params.cityId)) notFound();
  const city = await getAdminCity(params.cityId);
  if (!city) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/admin/cities"
        className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
      >
        <ChevronLeft className="size-4" />
        Cities
      </Link>
      <h1 className="font-display text-2xl font-bold">
        {getLocalizedText(city.name, "en")}
      </h1>
      <CityForm city={city} />
    </div>
  );
}
