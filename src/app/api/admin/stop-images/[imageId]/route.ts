import { NextResponse, type NextRequest } from "next/server";
import { assertAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/validate";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { imageId: string } },
) {
  const denied = await assertAdmin();
  if (denied) return denied;
  if (!isUuid(params.imageId)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const admin = createAdminClient();
  const { error } = await admin
    .from("stop_images")
    .delete()
    .eq("id", params.imageId);
  if (error) {
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
