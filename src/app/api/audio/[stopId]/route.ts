import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTourAccess, isStopLocked } from "@/lib/access";
import { isUuid } from "@/lib/validate";

const BUCKET = "duxiter-audio";

const CONTENT_TYPES: Record<string, string> = {
  aac: "audio/aac",
  m4a: "audio/mp4",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
};

/**
 * Protected audio stream. Verifies the caller may hear this stop
 * (free tour, valid purchase, or it is a free-preview stop) and then
 * proxies the file from the private storage bucket with Range support.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { stopId: string } },
) {
  if (!isUuid(params.stopId)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const supabase = createClient();

  const { data: stop } = await supabase
    .from("tour_stops")
    .select("id, tour_id, order_index, audio_url")
    .eq("id", params.stopId)
    .maybeSingle();

  if (!stop || !stop.audio_url) {
    return new NextResponse("Not found", { status: 404 });
  }

  const { data: tour } = await supabase
    .from("tours")
    .select("id, price_usd, status, is_active")
    .eq("id", stop.tour_id)
    .maybeSingle();

  if (!tour || tour.status !== "approved" || !tour.is_active) {
    return new NextResponse("Not found", { status: 404 });
  }

  const { count: total } = await supabase
    .from("tour_stops")
    .select("id", { count: "exact", head: true })
    .eq("tour_id", tour.id);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const access = await getTourAccess(tour, user?.id ?? null);

  if (isStopLocked(stop.order_index, total ?? 0, access)) {
    return new NextResponse("Payment required", { status: 403 });
  }

  // ---- proxy from private bucket ----
  const path = stop.audio_url.replace(/^\/+/, "");
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream";

  const admin = createAdminClient();
  const { data: signed, error: signErr } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 10);

  if (signErr || !signed?.signedUrl) {
    return new NextResponse("Audio unavailable", { status: 502 });
  }

  const range = req.headers.get("range");
  const upstream = await fetch(signed.signedUrl, {
    headers: range ? { Range: range } : {},
  });

  if (!upstream.ok && upstream.status !== 206) {
    return new NextResponse("Audio unavailable", { status: 502 });
  }

  const headers = new Headers();
  headers.set("Content-Type", contentType);
  headers.set("Accept-Ranges", "bytes");
  headers.set("Cache-Control", "private, max-age=0, no-store");
  const len = upstream.headers.get("content-length");
  const cr = upstream.headers.get("content-range");
  if (len) headers.set("Content-Length", len);
  if (cr) headers.set("Content-Range", cr);

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers,
  });
}
