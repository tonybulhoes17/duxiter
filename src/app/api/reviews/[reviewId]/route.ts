import { NextResponse, type NextRequest } from "next/server";
import { assertAdmin } from "@/lib/admin";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/validate";

// Admin-only soft delete (content hidden, record preserved).
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { reviewId: string } },
) {
  const denied = await assertAdmin();
  if (denied) return denied;
  if (!isUuid(params.reviewId)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const me = await getSessionUser();
  const admin = createAdminClient();
  const { error } = await admin
    .from("reviews")
    .update({
      is_deleted: true,
      deleted_by: me?.id ?? null,
      deleted_at: new Date().toISOString(),
    })
    .eq("id", params.reviewId);

  if (error) {
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
