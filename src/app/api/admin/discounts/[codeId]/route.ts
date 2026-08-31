import { NextResponse, type NextRequest } from "next/server";
import { assertAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/validate";
import type { DiscountCodeRow } from "@/lib/database.types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { codeId: string } },
) {
  const denied = await assertAdmin();
  if (denied) return denied;
  if (!isUuid(params.codeId)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const b = (await req.json().catch(() => ({}))) as Partial<DiscountCodeRow>;
  const patch: Partial<DiscountCodeRow> = {};
  for (const k of [
    "description",
    "discount_percent",
    "discount_amount_usd",
    "max_uses",
    "expires_at",
    "is_active",
  ] as const) {
    if (b[k] !== undefined) (patch as Record<string, unknown>)[k] = b[k];
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("discount_codes")
    .update(patch)
    .eq("id", params.codeId);
  if (error) {
    return NextResponse.json({ error: "update_failed" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { codeId: string } },
) {
  const denied = await assertAdmin();
  if (denied) return denied;
  if (!isUuid(params.codeId)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const admin = createAdminClient();
  await admin.from("discount_code_uses").delete().eq("code_id", params.codeId);
  const { error } = await admin
    .from("discount_codes")
    .delete()
    .eq("id", params.codeId);
  if (error) {
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
