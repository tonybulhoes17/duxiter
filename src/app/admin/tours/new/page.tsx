import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { TourForm } from "@/components/admin/tour-form";
import { getAdminCities } from "@/lib/admin-queries";
import { getLocalizedText } from "@/i18n/config";

export default async function NewTourPage() {
  const cities = await getAdminCities();
  if (cities.length === 0) redirect("/admin/cities/new");

  return (
    <div className="space-y-6">
      <Link
        href="/admin/tours"
        className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
      >
        <ChevronLeft className="size-4" />
        Tours
      </Link>
      <h1 className="font-display text-2xl font-bold">New tour</h1>
      <TourForm
        cities={cities.map((c) => ({
          id: c.id,
          name: getLocalizedText(c.name, "en"),
        }))}
      />
    </div>
  );
}
