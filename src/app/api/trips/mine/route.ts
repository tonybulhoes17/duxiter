import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/validate";
import { summarizeTrips } from "@/lib/trips/summary";

export const runtime = "nodejs";

/** Trips a guest joined on this device (from localStorage { tripId, secret }[]). */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    tokens?: { tripId?: string; secret?: string }[];
  };
  const pairs = (body.tokens ?? [])
    .filter(
      (t): t is { tripId: string; secret: string } =>
        isUuid(t.tripId) && typeof t.secret === "string" && t.secret.length > 8,
    )
    .slice(0, 50);
  if (pairs.length === 0) return NextResponse.json({ trips: [] });

  const admin = createAdminClient();
  const { data: members } = await admin
    .from("trip_members")
    .select("trip_id, secret")
    .in(
      "trip_id",
      pairs.map((p) => p.tripId),
    );

  const secrets: Record<string, string> = {};
  for (const p of pairs) {
    if ((members ?? []).some((m) => m.trip_id === p.tripId && m.secret === p.secret))
      secrets[p.tripId] = p.secret;
  }
  const tripIds = Object.keys(secrets);

  return NextResponse.json({ trips: await summarizeTrips(tripIds, null, secrets) });
}
