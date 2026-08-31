import { NextResponse, type NextRequest } from "next/server";
import { assertAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/validate";

export async function POST(req: NextRequest) {
  const denied = await assertAdmin();
  if (denied) return denied;

  const b = (await req.json().catch(() => ({}))) as {
    tourId?: string;
    orderedIds?: string[];
  };
  if (
    !isUuid(b.tourId) ||
    !Array.isArray(b.orderedIds) ||
    !b.orderedIds.every(isUuid)
  ) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const admin = createAdminClient();
  // Two-phase to dodge the unique(tour_id, order_index) constraint.
  await Promise.all(
    b.orderedIds.map((id, i) =>
      admin
        .from("tour_stops")
        .update({ order_index: 1000 + i })
        .eq("id", id)
        .eq("tour_id", b.tourId!),
    ),
  );
  await Promise.all(
    b.orderedIds.map((id, i) =>
      admin
        .from("tour_stops")
        .update({ order_index: i })
        .eq("id", id)
        .eq("tour_id", b.tourId!),
    ),
  );

  return NextResponse.json({ ok: true });
}
