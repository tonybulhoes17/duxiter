import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { resolveTripAccess } from "@/lib/trips/access";
import { buildTripView } from "@/lib/trips/view";
import { TripDetail } from "@/components/trips/trip-detail";
import { Button } from "@/components/ui/button";

interface Props {
  params: { tripId: string };
  searchParams: { invite?: string; invited?: string };
}

export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const access = await resolveTripAccess(params.tripId, {
    inviteToken: searchParams.invite,
  });
  return {
    title: access?.trip ? `${access.trip.emoji} ${access.trip.name}` : "Trip",
    robots: { index: false },
  };
}

export default async function TripPage({ params, searchParams }: Props) {
  const access = await resolveTripAccess(params.tripId, {
    inviteToken: searchParams.invite,
  });
  if (!access) notFound();
  if (access.mode === "preview") redirect(`/j/${access.trip.invite_token}`);

  if (access.mode === "none") {
    const t = await getTranslations("trip");
    return (
      <div className="container flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 text-center">
        <span className="text-4xl">{access.trip.emoji}</span>
        <h1 className="font-display text-xl font-bold">{access.trip.name}</h1>
        <p className="text-sm text-text-secondary">{t("emptyGuest")}</p>
        <Button asChild variant="outline">
          <Link href="/trips">{t("title")}</Link>
        </Button>
      </div>
    );
  }

  const view = await buildTripView(access.trip, access.member);
  return <TripDetail initial={view} justCreated={searchParams.invited === "1"} />;
}
