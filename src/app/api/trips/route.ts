import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  newInviteToken,
  newMemberSecret,
  newReportToken,
} from "@/lib/trips/tokens";
import { cleanCurrency, cleanEmoji, cleanName } from "@/lib/trips/validate";
import { summarizeTrips } from "@/lib/trips/summary";

export const runtime = "nodejs";

// ---- create a trip ----
export async function POST(req: NextRequest) {
  const {
    data: { user },
  } = await createClient().auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    emoji?: string;
    currency?: string;
    members?: string[];
  };

  const name = cleanName(body.name, 80);
  if (name.length < 1) {
    return NextResponse.json({ error: "name_required" }, { status: 400 });
  }
  const currency = cleanCurrency(body.currency) ?? "BRL";
  const emoji = cleanEmoji(body.emoji) || "🧳";

  const rawMembers = Array.isArray(body.members) ? body.members : [];
  const names: string[] = [];
  for (const m of rawMembers) {
    const n = cleanName(m, 40);
    if (n && !names.some((x) => x.toLowerCase() === n.toLowerCase())) names.push(n);
    if (names.length >= 30) break;
  }
  if (names.length < 2) {
    return NextResponse.json({ error: "need_members" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: trip, error } = await admin
    .from("trips")
    .insert({
      name,
      emoji,
      base_currency: currency,
      created_by: user.id,
      invite_token: newInviteToken(),
      report_token: newReportToken(),
    })
    .select("id, invite_token")
    .single();
  if (error || !trip) {
    console.error("trip create failed", error);
    return NextResponse.json({ error: "create_failed" }, { status: 500 });
  }

  const rows = names.map((n, i) => ({
    trip_id: trip.id,
    name: n,
    role: i === 0 ? "owner" : "member",
    user_id: i === 0 ? user.id : null,
    claimed: i === 0,
    claimed_at: i === 0 ? new Date().toISOString() : null,
    secret: newMemberSecret(),
  }));
  const { error: mErr } = await admin.from("trip_members").insert(rows);
  if (mErr) {
    console.error("trip members insert failed", mErr);
    await admin.from("trips").delete().eq("id", trip.id);
    return NextResponse.json({ error: "create_failed" }, { status: 500 });
  }

  return NextResponse.json({ id: trip.id, inviteToken: trip.invite_token });
}

// ---- my trips (account) ----
export async function GET() {
  const {
    data: { user },
  } = await createClient().auth.getUser();
  if (!user) return NextResponse.json({ trips: [] });

  const admin = createAdminClient();
  const { data: memberships } = await admin
    .from("trip_members")
    .select("trip_id")
    .eq("user_id", user.id);
  const tripIds = [...new Set((memberships ?? []).map((m) => m.trip_id))];

  return NextResponse.json({ trips: await summarizeTrips(tripIds, user.id) });
}
