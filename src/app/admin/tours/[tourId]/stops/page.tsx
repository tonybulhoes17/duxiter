import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { StopsManager } from "@/components/admin/stops-manager";
import { getAdminTour } from "@/lib/admin-queries";
import { getLocalizedText } from "@/i18n/config";
import { isUuid } from "@/lib/validate";

export default async function TourStopsPage({
  params,
}: {
  params: { tourId: string };
}) {
  if (!isUuid(params.tourId)) notFound();
  const tour = await getAdminTour(params.tourId);
  if (!tour) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <Link
        href={`/admin/tours/${tour.id}/edit`}
        className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
      >
        <ChevronLeft className="size-4" />
        {getLocalizedText(tour.title, "en")}
      </Link>
      <div>
        <h1 className="font-display text-2xl font-bold">Stops</h1>
        <p className="mt-1 text-sm text-text-muted">
          {tour.type === "museum"
            ? "Museum stops — no coordinates needed."
            : "Street stops — add coordinates for GPS navigation."}
        </p>
      </div>

      <StopsManager
        tourId={tour.id}
        tourType={tour.type}
        initialStops={tour.stops}
      />
    </div>
  );
}
