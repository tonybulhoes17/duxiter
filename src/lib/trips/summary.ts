import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { computeBalances } from "@/lib/trips/balances";
import type { TripSummary } from "@/lib/trips/types";

/** Compact list rows for "my trips". `secrets` = { tripId: memberSecret } for guests. */
export async function summarizeTrips(
  tripIds: string[],
  userId: string | null,
  secrets: Record<string, string> = {},
): Promise<TripSummary[]> {
  if (tripIds.length === 0) return [];
  const admin = createAdminClient();

  const [{ data: trips }, { data: members }, { data: expenses }, { data: settlements }] =
    await Promise.all([
      admin.from("trips").select("*").in("id", tripIds),
      admin.from("trip_members").select("*").in("trip_id", tripIds),
      admin.from("trip_expenses").select("*").in("trip_id", tripIds),
      admin.from("trip_settlements").select("*").in("trip_id", tripIds),
    ]);

  const expIds = (expenses ?? []).map((e) => e.id);
  const { data: shares } = expIds.length
    ? await admin.from("trip_expense_shares").select("*").in("expense_id", expIds)
    : { data: [] };

  return (trips ?? [])
    .map((t) => {
      const roster = (members ?? []).filter((m) => m.trip_id === t.id);
      const exp = (expenses ?? []).filter((e) => e.trip_id === t.id);
      const expIdSet = new Set(exp.map((e) => e.id));
      const sh = (shares ?? []).filter((s) => expIdSet.has(s.expense_id));
      const setts = (settlements ?? []).filter((s) => s.trip_id === t.id);
      const balances = computeBalances(roster, exp, sh, setts);
      const you =
        roster.find((m) => userId && m.user_id === userId) ??
        roster.find((m) => secrets[t.id] && m.secret === secrets[t.id]);
      return {
        id: t.id,
        name: t.name,
        emoji: t.emoji,
        baseCurrency: t.base_currency,
        status: t.status,
        memberCount: roster.length,
        totalSpent: exp.reduce((a, e) => a + Number(e.amount), 0),
        yourNet: you
          ? (balances.find((b) => b.memberId === you.id)?.net ?? 0)
          : null,
        updatedAt: t.updated_at,
      } satisfies TripSummary;
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
