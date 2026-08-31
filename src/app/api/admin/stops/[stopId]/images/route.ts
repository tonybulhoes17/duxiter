import { NextResponse, type NextRequest } from "next/server";
import { assertAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/validate";

const MAX_IMAGES = 4;

export async function POST(
  req: NextRequest,
  { params }: { params: { stopId: string } },
) {
  const denied = await assertAdmin();
  if (denied) return denied;
  if (!isUuid(params.stopId)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const b = (await req.json().catch(() => ({}))) as { url?: string };
  if (!b.url?.startsWith("http")) {
    return NextResponse.json({ error: "invalid_url" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("stop_images")
    .select("order_index")
    .eq("stop_id", params.stopId)
    .order("order_index", { ascending: false });

  if ((existing?.length ?? 0) >= MAX_IMAGES) {
    return NextResponse.json({ error: "max_images" }, { status: 409 });
  }

  const { data, error } = await admin
    .from("stop_images")
    .insert({
      stop_id: params.stopId,
      image_url: b.url,
      order_index: (existing?.[0]?.order_index ?? -1) + 1,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: "insert_failed" }, { status: 400 });
  }
  return NextResponse.json(data);
}
