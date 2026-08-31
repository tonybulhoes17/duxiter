import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type { UserProfileRow } from "@/lib/database.types";

export interface SessionUser {
  id: string;
  email: string | null;
  profile: UserProfileRow | null;
  isAdmin: boolean;
}

/**
 * Resolve the current user + profile + admin flag for a request.
 * Cached per-request so multiple components share one round-trip.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  if (!isSupabaseConfigured) return null;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: adminRow }] = await Promise.all([
    supabase.from("user_profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("admin_users").select("id").eq("id", user.id).maybeSingle(),
  ]);

  // Banned users are treated as logged out at the app level. The Supabase
  // auth ban (set in the admin ban route) invalidates their token on refresh.
  if ((profile as UserProfileRow | null)?.is_banned) return null;

  return {
    id: user.id,
    email: user.email ?? null,
    profile: (profile as UserProfileRow | null) ?? null,
    isAdmin: !!adminRow,
  };
});
