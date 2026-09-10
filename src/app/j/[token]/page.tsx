import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveTripAccess } from "@/lib/trips/access";
import { buildTripView } from "@/lib/trips/view";
import { JoinFlow } from "@/components/trips/join-flow";

interface Props {
  params: { token: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const admin = createAdminClient();
  const { data: trip } = await admin
    .from("trips")
    .select("name, emoji")
    .eq("invite_token", params.token)
    .maybeSingle();
  return {
    title: trip ? `${trip.emoji} ${trip.name}` : "Duxiter",
    robots: { index: false },
  };
}

export default async function JoinPage({ params }: Props) {
  const admin = createAdminClient();
  const { data: trip } = await admin
    .from("trips")
    .select("*")
    .eq("invite_token", params.token)
    .maybeSingle();
  if (!trip) notFound();

  const access = await resolveTripAccess(trip.id, {
    inviteToken: trip.invite_token,
  });
  if (access?.mode === "member") redirect(`/trips/${trip.id}`);

  const { data: owner } = await admin
    .from("trip_members")
    .select("name")
    .eq("trip_id", trip.id)
    .eq("role", "owner")
    .maybeSingle();

  const view = await buildTripView(trip, null);
  const t = await getTranslations("trip");

  return (
    <div className="container max-w-md py-8">
      <p className="text-center text-sm text-text-secondary">
        {t("inviteTitle", { name: owner?.name ?? "" })}
      </p>
      <JoinFlow view={view} inviteToken={trip.invite_token} />
    </div>
  );
}
