import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveTripAccess } from "@/lib/trips/access";
import { buildTripView } from "@/lib/trips/view";
import { equalShares } from "@/lib/trips/balances";
import {
  cleanAmount,
  cleanDate,
  cleanEmoji,
  cleanName,
} from "@/lib/trips/validate";
import { notifyTrip } from "@/lib/trips/notify";

export const runtime = "nodejs";

interface Body {
  title?: string;
  emoji?: string;
  amount?: number;
  paidBy?: string;
  splitMode?: "equal" | "exact";
  spentOn?: string;
  note?: string;
  participants?: string[];
  shares?: { memberId: string; amount: number }[];
}

/** shared build of {expense row, share rows} from a request body */
function buildShares(
  body: Body,
  amount: number,
  memberIds: Set<string>,
): { memberId: string; amount: number }[] | { error: string } {
  const mode = body.splitMode === "exact" ? "exact" : "equal";
  if (mode === "exact") {
    const rows = (body.shares ?? []).filter(
      (s) => memberIds.has(s.memberId) && Number(s.amount) >= 0,
    );
    if (rows.length < 1) return { error: "bad_shares" };
    const total = rows.reduce((a, s) => a + Math.round(Number(s.amount) * 100), 0);
    if (Math.abs(total - Math.round(amount * 100)) > rows.length) {
      return { error: "shares_mismatch" };
    }
    return rows.map((s) => ({
      memberId: s.memberId,
      amount: Math.round(Number(s.amount) * 100) / 100,
    }));
  }
  const parts = [...new Set(body.participants ?? [])].filter((id) =>
    memberIds.has(id),
  );
  if (parts.length < 1) return { error: "no_participants" };
  return equalShares(amount, parts);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { tripId: string } },
) {
  const access = await resolveTripAccess(params.tripId);
  if (!access || access.mode !== "member") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (access.trip.status !== "active") {
    return NextResponse.json({ error: "trip_closed" }, { status: 409 });
  }

  const body = (await req.json().catch(() => ({}))) as Body;
  const title = cleanName(body.title, 80);
  const amount = cleanAmount(body.amount);
  if (!title || amount == null) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: members } = await admin
    .from("trip_members")
    .select("id")
    .eq("trip_id", access.trip.id);
  const memberIds = new Set((members ?? []).map((m) => m.id));
  if (!body.paidBy || !memberIds.has(body.paidBy)) {
    return NextResponse.json({ error: "bad_payer" }, { status: 400 });
  }

  const shares = buildShares(body, amount, memberIds);
  if ("error" in shares) {
    return NextResponse.json({ error: shares.error }, { status: 400 });
  }

  const { data: expense, error } = await admin
    .from("trip_expenses")
    .insert({
      trip_id: access.trip.id,
      title,
      emoji: cleanEmoji(body.emoji) || "💸",
      amount,
      paid_by: body.paidBy,
      split_mode: body.splitMode === "exact" ? "exact" : "equal",
      spent_on: cleanDate(body.spentOn),
      note: cleanName(body.note, 400) || null,
      created_by: access.member?.id ?? null,
    })
    .select("id")
    .single();
  if (error || !expense) {
    console.error("expense insert failed", error);
    return NextResponse.json({ error: "create_failed" }, { status: 500 });
  }

  await admin.from("trip_expense_shares").insert(
    shares.map((s) => ({
      expense_id: expense.id,
      member_id: s.memberId,
      share_amount: s.amount,
    })),
  );
  await admin
    .from("trips")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", access.trip.id);

  void notifyTrip(access.trip.id, access.member?.id ?? null, {
    kind: "expense_added",
    actorName: access.member?.name ?? "",
    title,
    amount,
    currency: access.trip.base_currency,
  });

  return NextResponse.json(await buildTripView(access.trip, access.member));
}
