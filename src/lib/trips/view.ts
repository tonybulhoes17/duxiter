import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { computeBalances, suggestSettlements } from "@/lib/trips/balances";
import type { TripRow, TripMemberRow } from "@/lib/database.types";
import type { TripView, TripExpenseView } from "@/lib/trips/types";

/** Build the full client-facing view of a trip. */
export async function buildTripView(
  trip: TripRow,
  callerMember: TripMemberRow | null,
): Promise<TripView> {
  const admin = createAdminClient();
  const [{ data: members }, { data: expenses }, { data: settlements }] =
    await Promise.all([
      admin
        .from("trip_members")
        .select("*")
        .eq("trip_id", trip.id)
        .order("created_at"),
      admin
        .from("trip_expenses")
        .select("*")
        .eq("trip_id", trip.id)
        .order("spent_on", { ascending: false })
        .order("created_at", { ascending: false }),
      admin
        .from("trip_settlements")
        .select("*")
        .eq("trip_id", trip.id)
        .order("settled_on", { ascending: false }),
    ]);

  const roster = members ?? [];
  const exp = expenses ?? [];
  const setts = settlements ?? [];
  const nameById = new Map(roster.map((m) => [m.id, m.name]));

  const { data: shares } = exp.length
    ? await admin
        .from("trip_expense_shares")
        .select("*")
        .in(
          "expense_id",
          exp.map((e) => e.id),
        )
    : { data: [] };
  const shareRows = shares ?? [];
  const sharesByExpense = new Map<string, typeof shareRows>();
  for (const s of shareRows) {
    const arr = sharesByExpense.get(s.expense_id) ?? [];
    arr.push(s);
    sharesByExpense.set(s.expense_id, arr);
  }

  const balances = computeBalances(roster, exp, shareRows, setts);

  const expenseViews: TripExpenseView[] = exp.map((e) => ({
    id: e.id,
    title: e.title,
    emoji: e.emoji,
    amount: Number(e.amount),
    paidBy: e.paid_by,
    paidByName: nameById.get(e.paid_by) ?? "?",
    splitMode: e.split_mode,
    spentOn: e.spent_on,
    note: e.note,
    createdByName: e.created_by ? (nameById.get(e.created_by) ?? null) : null,
    shares: (sharesByExpense.get(e.id) ?? []).map((s) => ({
      memberId: s.member_id,
      amount: Number(s.share_amount),
    })),
  }));

  const isOwner =
    !!callerMember &&
    (callerMember.role === "owner" ||
      (!!trip.created_by && callerMember.user_id === trip.created_by));

  return {
    id: trip.id,
    name: trip.name,
    emoji: trip.emoji,
    baseCurrency: trip.base_currency,
    status: trip.status,
    inviteToken: trip.invite_token,
    reportToken: trip.report_token,
    createdAt: trip.created_at,
    closedAt: trip.closed_at,
    youMemberId: callerMember?.id ?? null,
    isOwner,
    canEdit: trip.status === "active" && !!callerMember,
    members: roster.map((m) => ({
      id: m.id,
      name: m.name,
      role: m.role,
      claimed: m.claimed,
      hasAccount: !!m.user_id,
      isYou: m.id === callerMember?.id,
    })),
    expenses: expenseViews,
    settlements: setts.map((s) => ({
      id: s.id,
      fromMember: s.from_member,
      fromName: nameById.get(s.from_member) ?? "?",
      toMember: s.to_member,
      toName: nameById.get(s.to_member) ?? "?",
      amount: Number(s.amount),
      settledOn: s.settled_on,
      note: s.note,
    })),
    balances,
    suggested: suggestSettlements(balances),
    totalSpent: exp.reduce((a, e) => a + Number(e.amount), 0),
  };
}
