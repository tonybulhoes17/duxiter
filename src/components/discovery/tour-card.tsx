import Link from "next/link";
import Image from "next/image";
import { Clock, Footprints, Landmark, Route } from "lucide-react";
import { getLocalizedText, type Locale } from "@/i18n/config";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "@/components/discovery/star-rating";
import { formatPrice } from "@/lib/format";
import type { TourWithMeta } from "@/lib/queries";

export function TourCard({
  tour,
  locale,
  labels,
}: {
  tour: TourWithMeta;
  locale: Locale;
  labels: {
    free: string;
    street: string;
    museum: string;
    minutes: (n: number) => string;
    km: (n: number) => string;
  };
}) {
  const title = getLocalizedText(tour.title, locale);
  const short = getLocalizedText(tour.short_description, locale);
  const isMuseum = tour.type === "museum";
  const isFree = Number(tour.price_usd) === 0;

  return (
    <Link
      href={`/tours/${tour.id}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-white/20"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        {tour.cover_image_url ? (
          <Image
            src={tour.cover_image_url}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 bg-elevated" />
        )}
        <div className="absolute left-3 top-3 flex gap-2">
          <Badge variant="secondary" className="backdrop-blur">
            {isMuseum ? <Landmark className="size-3" /> : <Footprints className="size-3" />}
            {isMuseum ? labels.museum : labels.street}
          </Badge>
        </div>
        <div className="absolute right-3 top-3">
          <Badge variant={isFree ? "success" : "primary"} className="font-metric">
            {isFree ? labels.free : formatPrice(Number(tour.price_usd), locale)}
          </Badge>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-heading text-base font-semibold leading-snug text-text-primary">
          {title}
        </h3>
        {short && (
          <p className="line-clamp-2 text-sm text-text-secondary">{short}</p>
        )}
        <div className="mt-auto flex items-center gap-3 pt-1 text-xs text-text-muted">
          {tour.estimated_duration_minutes ? (
            <span className="flex items-center gap-1">
              <Clock className="size-3.5" />
              <span className="font-metric">
                {labels.minutes(tour.estimated_duration_minutes)}
              </span>
            </span>
          ) : null}
          {tour.distance_km ? (
            <span className="flex items-center gap-1">
              <Route className="size-3.5" />
              <span className="font-metric">{labels.km(Number(tour.distance_km))}</span>
            </span>
          ) : null}
          <StarRating
            value={tour.ratingAvg}
            count={tour.ratingCount}
            className="ml-auto"
          />
        </div>
      </div>
    </Link>
  );
}
