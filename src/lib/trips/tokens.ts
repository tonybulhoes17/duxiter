import "server-only";

import { randomBytes } from "crypto";

function tok(bytes: number): string {
  return randomBytes(bytes).toString("base64url");
}

/** Link token for the whole trip — grants read-only preview + slot claiming. */
export const newInviteToken = () => tok(15); // ~20 chars

/** Public read-only report link token. */
export const newReportToken = () => tok(15);

/** Per-member credential for guests (device token). */
export const newMemberSecret = () => tok(21); // ~28 chars

/** Cookie holding { tripId: memberSecret } for guest access. httpOnly. */
export const TRIP_COOKIE = "dux_trips";
