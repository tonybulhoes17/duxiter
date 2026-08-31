import { NextResponse, type NextRequest } from "next/server";
import { assertAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const AUDIO_TYPES = [
  "audio/aac",
  "audio/mpeg",
  "audio/mp4",
  "audio/x-m4a",
  "audio/wav",
  "audio/x-wav",
];
const MAX_IMAGE = 2 * 1024 * 1024;
const MAX_AUDIO = 80 * 1024 * 1024;

function ext(name: string, type: string) {
  const fromName = name.split(".").pop()?.toLowerCase();
  if (fromName && fromName.length <= 4) return fromName;
  return type.split("/").pop() ?? "bin";
}

export async function POST(req: NextRequest) {
  const denied = await assertAdmin();
  if (denied) return denied;

  const form = await req.formData();
  const file = form.get("file");
  const kind = form.get("kind"); // "image" | "audio"
  const prefix = String(form.get("prefix") ?? "misc").replace(/[^a-z0-9/_-]/gi, "");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "no_file" }, { status: 400 });
  }

  const isImage = kind === "image";
  const allowed = isImage ? IMAGE_TYPES : AUDIO_TYPES;
  const maxBytes = isImage ? MAX_IMAGE : MAX_AUDIO;
  const bucket = isImage ? "duxiter-public" : "duxiter-audio";

  if (!allowed.includes(file.type)) {
    return NextResponse.json(
      { error: "unsupported_type", got: file.type },
      { status: 415 },
    );
  }
  if (file.size > maxBytes) {
    return NextResponse.json({ error: "too_large" }, { status: 413 });
  }

  const path = `${prefix}/${crypto.randomUUID()}.${ext(file.name, file.type)}`;
  const admin = createAdminClient();

  const { error } = await admin.storage
    .from(bucket)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) {
    return NextResponse.json(
      { error: "upload_failed", detail: error.message },
      { status: 500 },
    );
  }

  if (isImage) {
    const { data } = admin.storage.from(bucket).getPublicUrl(path);
    return NextResponse.json({ url: data.publicUrl, path });
  }
  // audio: return the storage path (streamed later via /api/audio/[stopId])
  return NextResponse.json({ path });
}
