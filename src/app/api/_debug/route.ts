import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** TEMPORARY diagnostic — delete after debugging the deploy. */
export async function GET() {
  const mask = (v: string | undefined) =>
    !v ? null : `${v.slice(0, 6)}…${v.slice(-4)} (len ${v.length})`;

  const out: Record<string, unknown> = {
    isSupabaseConfigured,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? null,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: mask(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      SUPABASE_SERVICE_ROLE_KEY: mask(process.env.SUPABASE_SERVICE_ROLE_KEY),
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? null,
      VERCEL_ENV: process.env.VERCEL_ENV ?? null,
    },
  };

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("cities")
      .select("slug, is_active")
      .eq("is_active", true);
    out.query = { count: data?.length ?? 0, rows: data, error };
  } catch (e) {
    out.query = { threw: String(e) };
  }

  return NextResponse.json(out);
}
