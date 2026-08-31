import { NextResponse, type NextRequest } from "next/server";
import { assertAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/validate";
import type { TourStopRow } from "@/lib/database.types";

const FIELDS = [
  "title",
  "description",
  "audio_url",
  "audio_duration_seconds",
  "latitude",
  "longitude",
] as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: { stopId: string } },
) {
  const denied = await assertAdmin();
  if (denied) return denied;
  if (!isUuid(params.stopId)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const b = (await req.json().catch(() => ({}))) as Partial<TourStopRow>;
  const patch: Record<string, unknown> = {};
  for (const k of FIELDS) if (b[k] !== undefined) patch[k] = b[k];

  const admin = createAdminClient();
  const { error } = await admin
    .from("tour_stops")
    .update(patch as Partial<TourStopRow>)
    .eq("id", params.stopId);
  if (error) {
    return NextResponse.json({ error: "update_failed" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { stopId: string } },
) {
  const denied = await assertAdmin();
  if (denied) return denied;
  if (!isUuid(params.stopId)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const admin = createAdminClient();
  const { error } = await admin
    .from("tour_stops")
    .delete()
    .eq("id", params.stopId);
  if (error) {
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
