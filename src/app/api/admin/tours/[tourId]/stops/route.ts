import { NextResponse, type NextRequest } from "next/server";
import { assertAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/validate";

// Create a stop at the end of the tour.
export async function POST(
  req: NextRequest,
  { params }: { params: { tourId: string } },
) {
  const denied = await assertAdmin();
  if (denied) return denied;
  if (!isUuid(params.tourId)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const b = (await req.json().catch(() => ({}))) as {
    title?: Record<string, string>;
  };

  const admin = createAdminClient();
  const { data: last } = await admin
    .from("tour_stops")
    .select("order_index")
    .eq("tour_id", params.tourId)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await admin
    .from("tour_stops")
    .insert({
      tour_id: params.tourId,
      order_index: (last?.order_index ?? -1) + 1,
      title: b.title ?? { pt: "Nova parada", en: "New stop", es: "Nueva parada" },
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: "insert_failed" }, { status: 400 });
  }
  return NextResponse.json({ ...data, stop_images: [], stop_audios: [] });
}
