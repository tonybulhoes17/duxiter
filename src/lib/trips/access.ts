import "server-only";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/validate";
import { TRIP_COOKIE } from "@/lib/trips/tokens";
import type { TripMemberRow, TripRow } from "@/lib/database.types";

export interface TripAccess {
  trip: TripRow;
  member: TripMemberRow | null;
  /** "member" = can act; "preview" = valid invite link, read-only; "none" = no access */
  mode: "member" | "preview" | "none";
}

function readTripCookie(): Record<string, string> {
  try {
    const raw = cookies().get(TRIP_COOKIE)?.value;
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

/** { tripId: memberSecret } — call from a Route Handler where cookies are writable. */
export function tripCookiePayload(): Record<string, string> {
  return readTripCookie();
}

export function serializeTripCookie(map: Record<string, string>): string {
  return JSON.stringify(map);
}

/**
 * Resolve who the caller is for a trip:
 *  - a logged-in user whose account is a trip member, or
 *  - a guest carrying that member's secret in the trip cookie, or
 *  - a holder of the invite link (read-only preview).
 */
export async function resolveTripAccess(
  tripId: string,
  opts: { inviteToken?: string } = {},
): Promise<TripAccess | null> {
  if (!isUuid(tripId)) return null;
  const admin = createAdminClient();

  const { data: trip } = await admin
    .from("trips")
    .select("*")
    .eq("id", tripId)
    .maybeSingle();
  if (!trip) return null;

  const { data: members } = await admin
    .from("trip_members")
    .select("*")
    .eq("trip_id", tripId);
  const roster = members ?? [];

  // 1. logged-in account member
  const {
    data: { user },
  } = await createClient().auth.getUser();
  if (user) {
    const m = roster.find((x) => x.user_id === user.id);
    if (m) return { trip, member: m, mode: "member" };
  }

  // 2. guest with the member secret
  const secret = readTripCookie()[tripId];
  if (secret) {
    const m = roster.find((x) => x.secret === secret);
    if (m) return { trip, member: m, mode: "member" };
  }

  // 3. invite link → read-only preview
  if (opts.inviteToken && opts.inviteToken === trip.invite_token) {
    return { trip, member: null, mode: "preview" };
  }

  return { trip, member: null, mode: "none" };
}
