import type {
  TripExpenseRow,
  TripExpenseShareRow,
  TripMemberRow,
  TripSettlementRow,
} from "@/lib/database.types";
import type { MemberBalance, SuggestedSettlement } from "@/lib/trips/types";

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Split `amount` equally between `memberIds`, distributing the leftover cents. */
export function equalShares(
  amount: number,
  memberIds: string[],
): { memberId: string; amount: number }[] {
  const n = memberIds.length;
  if (n === 0) return [];
  const cents = Math.round(amount * 100);
  const base = Math.floor(cents / n);
  const extra = cents - base * n; // 0..n-1 cents to hand out
  return memberIds.map((memberId, i) => ({
    memberId,
    amount: (base + (i < extra ? 1 : 0)) / 100,
  }));
}

export function computeBalances(
  members: TripMemberRow[],
  expenses: TripExpenseRow[],
  shares: TripExpenseShareRow[],
  settlements: TripSettlementRow[],
): MemberBalance[] {
  const paid = new Map<string, number>();
  const owed = new Map<string, number>();
  const add = (m: Map<string, number>, k: string, v: number) =>
    m.set(k, (m.get(k) ?? 0) + v);

  for (const e of expenses) add(paid, e.paid_by, Number(e.amount));
  for (const s of shares) add(owed, s.member_id, Number(s.share_amount));
  // a settlement: `from` paid `to` back → reduces what `from` owes, reduces what `to` is owed
  for (const st of settlements) {
    add(paid, st.from_member, Number(st.amount));
    add(paid, st.to_member, -Number(st.amount));
  }

  return members.map((m) => {
    const p = r2(paid.get(m.id) ?? 0);
    const o = r2(owed.get(m.id) ?? 0);
    return { memberId: m.id, name: m.name, paid: p, owed: o, net: r2(p - o) };
  });
}

/** Greedy minimal-transaction settle-up. */
export function suggestSettlements(
  balances: MemberBalance[],
): SuggestedSettlement[] {
  const nameById = new Map(balances.map((b) => [b.memberId, b.name]));
  const creditors = balances
    .filter((b) => b.net > 0.01)
    .map((b) => ({ id: b.memberId, amt: b.net }))
    .sort((a, b) => b.amt - a.amt);
  const debtors = balances
    .filter((b) => b.net < -0.01)
    .map((b) => ({ id: b.memberId, amt: -b.net }))
    .sort((a, b) => b.amt - a.amt);

  const out: SuggestedSettlement[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amt = r2(Math.min(debtors[i].amt, creditors[j].amt));
    if (amt > 0.01) {
      out.push({
        fromMember: debtors[i].id,
        fromName: nameById.get(debtors[i].id) ?? "",
        toMember: creditors[j].id,
        toName: nameById.get(creditors[j].id) ?? "",
        amount: amt,
      });
    }
    debtors[i].amt = r2(debtors[i].amt - amt);
    creditors[j].amt = r2(creditors[j].amt - amt);
    if (debtors[i].amt <= 0.01) i++;
    if (creditors[j].amt <= 0.01) j++;
  }
  return out;
}
