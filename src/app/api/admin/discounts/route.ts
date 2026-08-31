import { NextResponse, type NextRequest } from "next/server";
import { assertAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const denied = await assertAdmin();
  if (denied) return denied;

  const b = (await req.json().catch(() => null)) as {
    code?: string;
    description?: string;
    discount_percent?: number | null;
    discount_amount_usd?: number | null;
    applies_to_tour_id?: string | null;
    max_uses?: number | null;
    expires_at?: string | null;
  } | null;

  const code = b?.code?.trim().toUpperCase().replace(/\s+/g, "");
  if (!code || (!b?.discount_percent && !b?.discount_amount_usd)) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("discount_codes")
    .insert({
      code,
      description: b.description ?? null,
      discount_percent: b.discount_percent || null,
      discount_amount_usd: b.discount_amount_usd || null,
      applies_to_tour_id: b.applies_to_tour_id || null,
      max_uses: b.max_uses || null,
      expires_at: b.expires_at || null,
      is_active: true,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.code === "23505" ? "code_taken" : "insert_failed" },
      { status: 400 },
    );
  }
  return NextResponse.json({ id: data.id });
}
