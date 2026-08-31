import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validate";

export async function POST(
  req: NextRequest,
  { params }: { params: { itineraryId: string } },
) {
  if (!isUuid(params.itineraryId)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let saved = true;
  try {
    const body = await req.json();
    if (typeof body?.saved === "boolean") saved = body.saved;
  } catch {
    /* default to saving */
  }

  const { error } = await supabase
    .from("ai_itineraries")
    .update({ is_saved: saved })
    .eq("id", params.itineraryId)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, saved });
}
