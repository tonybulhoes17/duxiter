import { NextResponse, type NextRequest } from "next/server";
import { assertAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/validate";
import type { TourRow } from "@/lib/database.types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { tourId: string } },
) {
  const denied = await assertAdmin();
  if (denied) return denied;
  if (!isUuid(params.tourId)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    action?: "approve" | "reject" | "unpublish";
    reason?: string;
  };

  const admin = createAdminClient();
  let patch: Partial<TourRow>;
  switch (body.action) {
    case "approve":
      patch = { status: "approved", is_active: true, rejection_reason: null };
      break;
    case "reject":
      patch = {
        status: "rejected",
        is_active: false,
        rejection_reason: body.reason?.slice(0, 500) ?? null,
      };
      break;
    case "unpublish":
      patch = { status: "draft", is_active: false };
      break;
    default:
      return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  }

  const { error } = await admin
    .from("tours")
    .update(patch)
    .eq("id", params.tourId);
  if (error) {
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
