import { NextResponse, type NextRequest } from "next/server";
import { assertAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TourRow } from "@/lib/database.types";

export async function POST(req: NextRequest) {
  const denied = await assertAdmin();
  if (denied) return denied;

  const b = (await req.json().catch(() => null)) as Partial<TourRow> | null;
  if (!b?.city_id || !b.title || !b.type) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("tours")
    .insert({
      city_id: b.city_id,
      title: b.title,
      short_description: b.short_description ?? null,
      description: b.description ?? null,
      type: b.type,
      cover_image_url: b.cover_image_url ?? null,
      difficulty: b.difficulty ?? "easy",
      estimated_duration_minutes: b.estimated_duration_minutes ?? null,
      distance_km: b.distance_km ?? null,
      price_usd: b.price_usd ?? 0,
      tags: b.tags ?? [],
      status: b.status ?? "draft",
      is_active: b.status === "approved",
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: "insert_failed" }, { status: 400 });
  }
  return NextResponse.json({ id: data.id });
}
