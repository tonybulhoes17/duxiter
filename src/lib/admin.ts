import "server-only";

import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";

/** Page guard — redirects non-admins away. Returns the admin session user. */
export async function requireAdmin() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/admin");
  if (!user.isAdmin) redirect("/");
  return user;
}

/**
 * API-route guard. Returns null when the caller is an admin, otherwise a
 * ready-to-return 401/403 response.
 *   const denied = await assertAdmin(); if (denied) return denied;
 */
export async function assertAdmin(): Promise<NextResponse | null> {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!user.isAdmin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  return null;
}
