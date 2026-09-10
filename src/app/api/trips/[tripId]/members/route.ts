import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveTripAccess } from "@/lib/trips/access";
import { buildTripView } from "@/lib/trips/view";
import { newMemberSecret } from "@/lib/trips/tokens";
import { cleanName } from "@/lib/trips/validate";

export const runtime = "nodejs";

/** Add a new person to the trip (any member can, so a newcomer can add themselves). */
export async function POST(
  req: NextRequest,
  { params }: { params: { tripId: string } },
) {
  const inviteToken = req.nextUrl.searchParams.get("invite") ?? undefined;
  const access = await resolveTripAccess(params.tripId, { inviteToken });
  if (!access || access.mode === "none") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (access.trip.status !== "active") {
    return NextResponse.json({ error: "trip_closed" }, { status: 409 });
  }

  const body = (await req.json().catch(() => ({}))) as { name?: string };
  const name = cleanName(body.name, 40);
  if (!name) return NextResponse.json({ error: "name_required" }, { status: 400 });

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("trip_members")
    .select("id, name")
    .eq("trip_id", access.trip.id);
  if ((existing ?? []).length >= 40) {
    return NextResponse.json({ error: "too_many" }, { status: 409 });
  }
  if (
    (existing ?? []).some((m) => m.name.toLowerCase() === name.toLowerCase())
  ) {
    return NextResponse.json({ error: "duplicate" }, { status: 409 });
  }

  const { data: member } = await admin
    .from("trip_members")
    .insert({
      trip_id: access.trip.id,
      name,
      role: "member",
      secret: newMemberSecret(),
    })
    .select("id, secret")
    .single();

  const view = await buildTripView(access.trip, access.member);
  // if the caller was only previewing, hand back the new member's secret so
  // they can claim it client-side
  return NextResponse.json({
    ...view,
    newMemberId: member?.id ?? null,
    newMemberSecret: access.mode === "preview" ? (member?.secret ?? null) : null,
  });
}
