import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/validate";
import { resolveTripAccess } from "@/lib/trips/access";
import { buildTripView } from "@/lib/trips/view";
import { equalShares } from "@/lib/trips/balances";
import {
  cleanAmount,
  cleanDate,
  cleanEmoji,
  cleanName,
} from "@/lib/trips/validate";

export const runtime = "nodejs";

async function guard(tripId: string, expenseId: string) {
  if (!isUuid(expenseId)) return { error: "not_found" as const, status: 404 };
  const access = await resolveTripAccess(tripId);
  if (!access || access.mode !== "member") {
    return { error: "forbidden" as const, status: 403 };
  }
  if (access.trip.status !== "active") {
    return { error: "trip_closed" as const, status: 409 };
  }
  const admin = createAdminClient();
  const { data: expense } = await admin
    .from("trip_expenses")
    .select("id")
    .eq("id", expenseId)
    .eq("trip_id", tripId)
    .maybeSingle();
  if (!expense) return { error: "not_found" as const, status: 404 };
  return { access, admin };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { tripId: string; expenseId: string } },
) {
  const g = await guard(params.tripId, params.expenseId);
  if ("error" in g) {
    return NextResponse.json({ error: g.error }, { status: g.status });
  }
  const { access, admin } = g;

  const body = (await req.json().catch(() => ({}))) as {
    title?: string;
    emoji?: string;
    amount?: number;
    paidBy?: string;
    splitMode?: "equal" | "exact";
    spentOn?: string;
    note?: string;
    participants?: string[];
    shares?: { memberId: string; amount: number }[];
  };
  const title = cleanName(body.title, 80);
  const amount = cleanAmount(body.amount);
  if (!title || amount == null) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const { data: members } = await admin
    .from("trip_members")
    .select("id")
    .eq("trip_id", access.trip.id);
  const memberIds = new Set((members ?? []).map((m) => m.id));
  if (!body.paidBy || !memberIds.has(body.paidBy)) {
    return NextResponse.json({ error: "bad_payer" }, { status: 400 });
  }

  const mode = body.splitMode === "exact" ? "exact" : "equal";
  let shares: { memberId: string; amount: number }[];
  if (mode === "exact") {
    const rows = (body.shares ?? []).filter(
      (s) => memberIds.has(s.memberId) && Number(s.amount) >= 0,
    );
    const total = rows.reduce(
      (a, s) => a + Math.round(Number(s.amount) * 100),
      0,
    );
    if (rows.length < 1 || Math.abs(total - Math.round(amount * 100)) > rows.length) {
      return NextResponse.json({ error: "shares_mismatch" }, { status: 400 });
    }
    shares = rows.map((s) => ({
      memberId: s.memberId,
      amount: Math.round(Number(s.amount) * 100) / 100,
    }));
  } else {
    const parts = [...new Set(body.participants ?? [])].filter((id) =>
      memberIds.has(id),
    );
    if (parts.length < 1) {
      return NextResponse.json({ error: "no_participants" }, { status: 400 });
    }
    shares = equalShares(amount, parts);
  }

  await admin
    .from("trip_expenses")
    .update({
      title,
      emoji: cleanEmoji(body.emoji) || "💸",
      amount,
      paid_by: body.paidBy,
      split_mode: mode,
      spent_on: cleanDate(body.spentOn),
      note: cleanName(body.note, 400) || null,
    })
    .eq("id", params.expenseId);
  await admin
    .from("trip_expense_shares")
    .delete()
    .eq("expense_id", params.expenseId);
  await admin.from("trip_expense_shares").insert(
    shares.map((s) => ({
      expense_id: params.expenseId,
      member_id: s.memberId,
      share_amount: s.amount,
    })),
  );
  await admin
    .from("trips")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", access.trip.id);

  return NextResponse.json(await buildTripView(access.trip, access.member));
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { tripId: string; expenseId: string } },
) {
  const g = await guard(params.tripId, params.expenseId);
  if ("error" in g) {
    return NextResponse.json({ error: g.error }, { status: g.status });
  }
  const { access, admin } = g;
  await admin.from("trip_expenses").delete().eq("id", params.expenseId);
  await admin
    .from("trips")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", access.trip.id);
  return NextResponse.json(await buildTripView(access.trip, access.member));
}
