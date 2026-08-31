import { NextResponse, type NextRequest } from "next/server";
import { assertAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth";
import { isUuid } from "@/lib/validate";

export async function POST(
  req: NextRequest,
  { params }: { params: { userId: string } },
) {
  const denied = await assertAdmin();
  if (denied) return denied;
  if (!isUuid(params.userId)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const me = await getSessionUser();
  if (me?.id === params.userId) {
    return NextResponse.json({ error: "cannot_ban_self" }, { status: 400 });
  }

  const { banned } = (await req.json().catch(() => ({}))) as { banned?: boolean };
  const admin = createAdminClient();

  await admin
    .from("user_profiles")
    .update({ is_banned: !!banned })
    .eq("id", params.userId);

  await admin.auth.admin.updateUserById(params.userId, {
    ban_duration: banned ? "876000h" : "none",
  });

  return NextResponse.json({ ok: true, banned: !!banned });
}
