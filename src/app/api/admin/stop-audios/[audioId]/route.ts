import { NextResponse, type NextRequest } from "next/server";
import { assertAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/validate";
import type { StopAudioRow } from "@/lib/database.types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { audioId: string } },
) {
  const denied = await assertAdmin();
  if (denied) return denied;
  if (!isUuid(params.audioId)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const b = (await req.json().catch(() => ({}))) as Partial<StopAudioRow>;
  const patch: Partial<StopAudioRow> = {};
  if (b.label !== undefined) patch.label = b.label;
  if (b.duration_seconds !== undefined) patch.duration_seconds = b.duration_seconds;

  const admin = createAdminClient();
  const { error } = await admin
    .from("stop_audios")
    .update(patch)
    .eq("id", params.audioId);
  if (error) {
    return NextResponse.json({ error: "update_failed" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { audioId: string } },
) {
  const denied = await assertAdmin();
  if (denied) return denied;
  if (!isUuid(params.audioId)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const admin = createAdminClient();

  // best-effort remove the file from storage too
  const { data: row } = await admin
    .from("stop_audios")
    .select("audio_path")
    .eq("id", params.audioId)
    .maybeSingle();
  if (row?.audio_path) {
    await admin.storage
      .from("duxiter-audio")
      .remove([row.audio_path])
      .catch(() => {});
  }

  const { error } = await admin
    .from("stop_audios")
    .delete()
    .eq("id", params.audioId);
  if (error) {
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
