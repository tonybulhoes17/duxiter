import { NextResponse, type NextRequest } from "next/server";
import { assertAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const denied = await assertAdmin();
  if (denied) return denied;

  const b = (await req.json().catch(() => null)) as {
    slug?: string;
    name?: Record<string, string>;
    description?: Record<string, string>;
    country?: string;
    cover_image_url?: string | null;
    is_active?: boolean;
  } | null;

  const slug = b?.slug?.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
  if (!slug || !b?.name || Object.keys(b.name).length === 0) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("cities")
    .insert({
      slug,
      name: b.name,
      description: b.description ?? null,
      country: b.country ?? null,
      cover_image_url: b.cover_image_url ?? null,
      is_active: b.is_active ?? true,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.code === "23505" ? "slug_taken" : "insert_failed" },
      { status: 400 },
    );
  }
  return NextResponse.json({ id: data.id });
}
