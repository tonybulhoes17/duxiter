import { NextResponse, type NextRequest } from "next/server";
import { assertAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/validate";

// Append an audio segment to a stop.
export async function POST(
  req: NextRequest,
  { params }: { params: { stopId: string } },
) {
  const denied = await assertAdmin();
  if (denied) return denied;
  if (!isUuid(params.stopId)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const b = (await req.json().catch(() => ({}))) as {
    audio_path?: string;
    duration_seconds?: number | null;
    label?: Record<string, string> | null;
  };
  if (!b.audio_path) {
    return NextResponse.json({ error: "missing_path" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: last } = await admin
    .from("stop_audios")
    .select("order_index")
    .eq("stop_id", params.stopId)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await admin
    .from("stop_audios")
    .insert({
      stop_id: params.stopId,
      order_index: (last?.order_index ?? -1) + 1,
      audio_path: b.audio_path,
      duration_seconds: b.duration_seconds ?? null,
      label: b.label ?? null,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: "insert_failed" }, { status: 400 });
  }
  return NextResponse.json(data);
}
