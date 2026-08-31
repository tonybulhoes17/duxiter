import { NextResponse, type NextRequest } from "next/server";
import { assertAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/validate";

export async function POST(req: NextRequest) {
  const denied = await assertAdmin();
  if (denied) return denied;

  const b = (await req.json().catch(() => ({}))) as {
    stopId?: string;
    orderedIds?: string[];
  };
  if (
    !isUuid(b.stopId) ||
    !Array.isArray(b.orderedIds) ||
    !b.orderedIds.every(isUuid)
  ) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const admin = createAdminClient();
  await Promise.all(
    b.orderedIds.map((id, i) =>
      admin
        .from("stop_audios")
        .update({ order_index: i })
        .eq("id", id)
        .eq("stop_id", b.stopId!),
    ),
  );
  return NextResponse.json({ ok: true });
}
