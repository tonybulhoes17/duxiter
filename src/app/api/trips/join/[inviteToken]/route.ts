import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { buildTripView } from "@/lib/trips/view";
import { TRIP_COOKIE } from "@/lib/trips/tokens";

export const runtime = "nodejs";

async function tripByToken(token: string) {
  if (!token || token.length < 8) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("trips")
    .select("*")
    .eq("invite_token", token)
    .maybeSingle();
  return data ?? null;
}

/** Read-only preview of the trip behind an invite link. */
export async function GET(
  _req: NextRequest,
  { params }: { params: { inviteToken: string } },
) {
  const trip = await tripByToken(params.inviteToken);
  if (!trip) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // if the caller already belongs (account or existing cookie), give them the member view
  const admin = createAdminClient();
  const { data: roster } = await admin
    .from("trip_members")
    .select("*")
    .eq("trip_id", trip.id);
  const {
    data: { user },
  } = await createClient().auth.getUser();
  let mine = user ? (roster ?? []).find((m) => m.user_id === user.id) : undefined;
  if (!mine) {
    try {
      const raw = cookies().get(TRIP_COOKIE)?.value;
      const secret = raw
        ? (JSON.parse(raw) as Record<string, string>)[trip.id]
        : null;
      if (secret) mine = (roster ?? []).find((m) => m.secret === secret);
    } catch {
      /* ignore */
    }
  }

  return NextResponse.json(await buildTripView(trip, mine ?? null));
}

/** Claim an unclaimed member slot → become that person on this device. */
export async function POST(
  req: NextRequest,
  { params }: { params: { inviteToken: string } },
) {
  const trip = await tripByToken(params.inviteToken);
  if (!trip) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as { memberId?: string };
  const admin = createAdminClient();
  const { data: member } = await admin
    .from("trip_members")
    .select("*")
    .eq("id", body.memberId ?? "")
    .eq("trip_id", trip.id)
    .maybeSingle();
  if (!member) {
    return NextResponse.json({ error: "bad_member" }, { status: 400 });
  }
  if (member.claimed) {
    return NextResponse.json({ error: "already_claimed" }, { status: 409 });
  }

  const {
    data: { user },
  } = await createClient().auth.getUser();
  await admin
    .from("trip_members")
    .update({
      claimed: true,
      claimed_at: new Date().toISOString(),
      user_id: user?.id ?? null,
    })
    .eq("id", member.id);

  // remember this device is that member
  try {
    const raw = cookies().get(TRIP_COOKIE)?.value;
    const map = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    map[trip.id] = member.secret;
    cookies().set(TRIP_COOKIE, JSON.stringify(map), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  } catch {
    /* ignore */
  }

  const { data: fresh } = await admin
    .from("trip_members")
    .select("*")
    .eq("id", member.id)
    .single();

  return NextResponse.json({
    tripId: trip.id,
    memberId: member.id,
    secret: member.secret,
    view: await buildTripView(trip, fresh ?? member),
  });
}
