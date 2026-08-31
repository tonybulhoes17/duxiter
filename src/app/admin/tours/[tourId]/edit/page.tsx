import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ListOrdered } from "lucide-react";
import { TourForm } from "@/components/admin/tour-form";
import { Button } from "@/components/ui/button";
import { getAdminTour, getAdminCities } from "@/lib/admin-queries";
import { getLocalizedText } from "@/i18n/config";
import { isUuid } from "@/lib/validate";

export default async function EditTourPage({
  params,
}: {
  params: { tourId: string };
}) {
  if (!isUuid(params.tourId)) notFound();
  const [tour, cities] = await Promise.all([
    getAdminTour(params.tourId),
    getAdminCities(),
  ]);
  if (!tour) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/admin/tours"
          className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
        >
          <ChevronLeft className="size-4" />
          Tours
        </Link>
        <Button asChild variant="outline" size="sm">
          <Link href={`/admin/tours/${tour.id}/stops`}>
            <ListOrdered className="size-4" />
            Stops ({tour.stops.length})
          </Link>
        </Button>
      </div>
      <h1 className="font-display text-2xl font-bold">
        {getLocalizedText(tour.title, "en")}
      </h1>
      <TourForm
        tour={tour}
        cities={cities.map((c) => ({
          id: c.id,
          name: getLocalizedText(c.name, "en"),
        }))}
      />
    </div>
  );
}
