import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/validate";
import { resolveTripAccess } from "@/lib/trips/access";
import { buildTripView } from "@/lib/trips/view";

export const runtime = "nodejs";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { tripId: string; settlementId: string } },
) {
  if (!isUuid(params.settlementId)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const access = await resolveTripAccess(params.tripId);
  if (!access || access.mode !== "member") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (access.trip.status !== "active") {
    return NextResponse.json({ error: "trip_closed" }, { status: 409 });
  }
  const admin = createAdminClient();
  await admin
    .from("trip_settlements")
    .delete()
    .eq("id", params.settlementId)
    .eq("trip_id", access.trip.id);
  await admin
    .from("trips")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", access.trip.id);
  return NextResponse.json(await buildTripView(access.trip, access.member));
}
