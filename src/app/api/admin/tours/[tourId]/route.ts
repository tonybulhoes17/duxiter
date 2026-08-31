import { NextResponse, type NextRequest } from "next/server";
import { assertAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/validate";
import type { TourRow } from "@/lib/database.types";

const FIELDS = [
  "city_id",
  "title",
  "short_description",
  "description",
  "type",
  "cover_image_url",
  "difficulty",
  "estimated_duration_minutes",
  "distance_km",
  "price_usd",
  "tags",
  "status",
] as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: { tourId: string } },
) {
  const denied = await assertAdmin();
  if (denied) return denied;
  if (!isUuid(params.tourId)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const b = (await req.json().catch(() => ({}))) as Partial<TourRow>;
  const patch: Record<string, unknown> = {};
  for (const k of FIELDS) if (b[k] !== undefined) patch[k] = b[k];
  if (b.status !== undefined) {
    patch.is_active = b.status === "approved";
    if (b.status === "approved") patch.rejection_reason = null;
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("tours")
    .update(patch as Partial<TourRow>)
    .eq("id", params.tourId);
  if (error) {
    return NextResponse.json({ error: "update_failed" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { tourId: string } },
) {
  const denied = await assertAdmin();
  if (denied) return denied;
  if (!isUuid(params.tourId)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const admin = createAdminClient();
  const { count } = await admin
    .from("purchases")
    .select("id", { count: "exact", head: true })
    .eq("tour_id", params.tourId)
    .eq("status", "completed");
  if ((count ?? 0) > 0) {
    // Don't destroy purchase history — just unpublish.
    await admin
      .from("tours")
      .update({ status: "draft", is_active: false })
      .eq("id", params.tourId);
    return NextResponse.json({ ok: true, unpublishedOnly: true });
  }

  const { error } = await admin.from("tours").delete().eq("id", params.tourId);
  if (error) {
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
