import { NextResponse, type NextRequest } from "next/server";
import { assertAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/validate";
import type { CityRow } from "@/lib/database.types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { cityId: string } },
) {
  const denied = await assertAdmin();
  if (denied) return denied;
  if (!isUuid(params.cityId)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const b = (await req.json().catch(() => ({}))) as Partial<CityRow>;
  const patch: Partial<CityRow> = {};
  if (b.slug !== undefined)
    patch.slug = String(b.slug).trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
  for (const k of [
    "name",
    "description",
    "country",
    "cover_image_url",
    "is_active",
  ] as const) {
    if (b[k] !== undefined) (patch as Record<string, unknown>)[k] = b[k];
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("cities")
    .update(patch)
    .eq("id", params.cityId);
  if (error) {
    return NextResponse.json(
      { error: error.code === "23505" ? "slug_taken" : "update_failed" },
      { status: 400 },
    );
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { cityId: string } },
) {
  const denied = await assertAdmin();
  if (denied) return denied;
  if (!isUuid(params.cityId)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const admin = createAdminClient();
  const { count } = await admin
    .from("tours")
    .select("id", { count: "exact", head: true })
    .eq("city_id", params.cityId);
  if ((count ?? 0) > 0) {
    return NextResponse.json({ error: "has_tours" }, { status: 409 });
  }

  const { error } = await admin.from("cities").delete().eq("id", params.cityId);
  if (error) {
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
