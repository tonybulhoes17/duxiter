import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveTripAccess } from "@/lib/trips/access";
import { buildTripView } from "@/lib/trips/view";
import { cleanAmount, cleanDate, cleanName } from "@/lib/trips/validate";
import { notifyTrip } from "@/lib/trips/notify";

export const runtime = "nodejs";

/** Record a repayment ("marcar como pago"). The app does not move money. */
export async function POST(
  req: NextRequest,
  { params }: { params: { tripId: string } },
) {
  const access = await resolveTripAccess(params.tripId);
  if (!access || access.mode !== "member") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (access.trip.status !== "active") {
    return NextResponse.json({ error: "trip_closed" }, { status: 409 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    fromMember?: string;
    toMember?: string;
    amount?: number;
    settledOn?: string;
    note?: string;
  };
  const amount = cleanAmount(body.amount);
  if (!amount || !body.fromMember || !body.toMember || body.fromMember === body.toMember) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: members } = await admin
    .from("trip_members")
    .select("id, name")
    .eq("trip_id", access.trip.id);
  const ids = new Set((members ?? []).map((m) => m.id));
  if (!ids.has(body.fromMember) || !ids.has(body.toMember)) {
    return NextResponse.json({ error: "bad_member" }, { status: 400 });
  }

  await admin.from("trip_settlements").insert({
    trip_id: access.trip.id,
    from_member: body.fromMember,
    to_member: body.toMember,
    amount,
    settled_on: cleanDate(body.settledOn),
    note: cleanName(body.note, 200) || null,
    created_by: access.member?.id ?? null,
  });
  await admin
    .from("trips")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", access.trip.id);

  const nameOf = (id: string) =>
    (members ?? []).find((m) => m.id === id)?.name ?? "";
  void notifyTrip(access.trip.id, access.member?.id ?? null, {
    kind: "settlement_added",
    actorName: access.member?.name ?? "",
    fromName: nameOf(body.fromMember),
    toName: nameOf(body.toMember),
    amount,
    currency: access.trip.base_currency,
  });

  return NextResponse.json(await buildTripView(access.trip, access.member));
}
