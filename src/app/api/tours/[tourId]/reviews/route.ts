import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validate";

export async function POST(
  req: NextRequest,
  { params }: { params: { tourId: string } },
) {
  if (!isUuid(params.tourId)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    rating?: number;
    comment?: string;
  };
  const rating = Math.round(Number(body.rating));
  if (!(rating >= 1 && rating <= 5)) {
    return NextResponse.json({ error: "bad_rating" }, { status: 400 });
  }
  const comment = (body.comment ?? "").trim().slice(0, 2000) || null;

  const { data: tour } = await supabase
    .from("tours")
    .select("id, price_usd, status, is_active")
    .eq("id", params.tourId)
    .maybeSingle();
  if (!tour || tour.status !== "approved" || !tour.is_active) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Eligibility: free tour -> any signed-in user; paid tour -> must have bought it.
  if (Number(tour.price_usd) > 0) {
    const { data: purchase } = await supabase
      .from("purchases")
      .select("id")
      .eq("user_id", user.id)
      .eq("tour_id", tour.id)
      .eq("status", "completed")
      .maybeSingle();
    if (!purchase) {
      return NextResponse.json({ error: "not_eligible" }, { status: 403 });
    }
  }

  const { data: existing } = await supabase
    .from("reviews")
    .select("id, is_deleted")
    .eq("user_id", user.id)
    .eq("tour_id", tour.id)
    .maybeSingle();

  if (existing) {
    if (existing.is_deleted) {
      return NextResponse.json({ error: "removed" }, { status: 403 });
    }
    const { error } = await supabase
      .from("reviews")
      .update({ rating, comment })
      .eq("id", existing.id);
    if (error) {
      return NextResponse.json({ error: "update_failed" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, updated: true });
  }

  const { error } = await supabase
    .from("reviews")
    .insert({ tour_id: tour.id, user_id: user.id, rating, comment });
  if (error) {
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, created: true });
}
