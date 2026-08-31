import { notFound, redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { StreetTourPlayer } from "@/components/player/street-tour-player";
import { MuseumTourPlayer } from "@/components/player/museum-tour-player";
import { TrackView } from "@/components/analytics/track";
import { getTourDetail } from "@/lib/queries";
import { getTourAccess } from "@/lib/access";
import { getSessionUser } from "@/lib/auth";
import { formatPrice } from "@/lib/format";
import { getLocalizedText, type Locale } from "@/i18n/config";
import { isUuid } from "@/lib/validate";

export const metadata = { robots: { index: false } };

export default async function TourPlayerPage({
  params,
}: {
  params: { tourId: string };
}) {
  if (!isUuid(params.tourId)) notFound();

  const tour = await getTourDetail(params.tourId);
  if (!tour) notFound();

  const locale = (await getLocale()) as Locale;
  const user = await getSessionUser();
  const access = await getTourAccess(tour, user?.id ?? null);

  // Expired paid access with no preview possible -> bounce to detail page.
  const isFree = Number(tour.price_usd) === 0;
  if (!isFree && access === "expired" && tour.stops.length === 0) {
    redirect(`/tours/${tour.id}`);
  }

  const priceLabel = formatPrice(Number(tour.price_usd), locale);
  const basePriceUsd = Number(tour.price_usd);
  const title = getLocalizedText(tour.title, locale);

  if (tour.type === "museum") {
    return (
      <>
        <TrackView event="tour_start" tourId={tour.id} />
        <MuseumTourPlayer
          tourId={tour.id}
          tourTitle={title}
          locale={locale}
          priceLabel={priceLabel}
          basePriceUsd={basePriceUsd}
          isAuthed={!!user}
        />
      </>
    );
  }

  return (
    <>
      <TrackView event="tour_start" tourId={tour.id} />
      <StreetTourPlayer
        tourId={tour.id}
        tourTitle={title}
        locale={locale}
        priceLabel={priceLabel}
        basePriceUsd={basePriceUsd}
        isAuthed={!!user}
      />
    </>
  );
}
