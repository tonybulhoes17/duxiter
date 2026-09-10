import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveTripAccess } from "@/lib/trips/access";
import { buildTripView } from "@/lib/trips/view";
import { notifyTrip } from "@/lib/trips/notify";

export const runtime = "nodejs";

/** Owner-only: close or reopen the trip's books. Body: { reopen?: boolean } */
export async function POST(
  req: NextRequest,
  { params }: { params: { tripId: string } },
) {
  const access = await resolveTripAccess(params.tripId);
  if (!access || access.mode !== "member") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const isOwner =
    access.member!.role === "owner" ||
    (!!access.trip.created_by &&
      access.member!.user_id === access.trip.created_by);
  if (!isOwner) {
    return NextResponse.json({ error: "not_owner" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { reopen?: boolean };
  const admin = createAdminClient();
  await admin
    .from("trips")
    .update(
      body.reopen
        ? { status: "active", closed_at: null }
        : { status: "closed", closed_at: new Date().toISOString() },
    )
    .eq("id", access.trip.id);

  if (!body.reopen) {
    void notifyTrip(access.trip.id, access.member?.id ?? null, {
      kind: "trip_closed",
      actorName: access.member?.name ?? "",
    });
  }

  const { data: fresh } = await admin
    .from("trips")
    .select("*")
    .eq("id", access.trip.id)
    .single();
  return NextResponse.json(await buildTripView(fresh!, access.member));
}
