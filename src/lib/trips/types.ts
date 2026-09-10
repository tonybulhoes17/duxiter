export interface TripMemberView {
  id: string;
  name: string;
  role: "owner" | "member";
  claimed: boolean;
  hasAccount: boolean;
  isYou: boolean;
}

export interface ExpenseShareView {
  memberId: string;
  amount: number;
}

export interface TripExpenseView {
  id: string;
  title: string;
  emoji: string;
  amount: number;
  paidBy: string;
  paidByName: string;
  splitMode: "equal" | "exact";
  spentOn: string;
  note: string | null;
  createdByName: string | null;
  shares: ExpenseShareView[];
}

export interface TripSettlementView {
  id: string;
  fromMember: string;
  fromName: string;
  toMember: string;
  toName: string;
  amount: number;
  settledOn: string;
  note: string | null;
}

export interface MemberBalance {
  memberId: string;
  name: string;
  paid: number;
  owed: number;
  /** net > 0 → the group owes them; net < 0 → they owe the group */
  net: number;
}

export interface SuggestedSettlement {
  fromMember: string;
  fromName: string;
  toMember: string;
  toName: string;
  amount: number;
}

export interface TripView {
  id: string;
  name: string;
  emoji: string;
  baseCurrency: string;
  status: "active" | "closed";
  inviteToken: string;
  reportToken: string;
  createdAt: string;
  closedAt: string | null;
  youMemberId: string | null;
  isOwner: boolean;
  canEdit: boolean;
  members: TripMemberView[];
  expenses: TripExpenseView[];
  settlements: TripSettlementView[];
  balances: MemberBalance[];
  suggested: SuggestedSettlement[];
  totalSpent: number;
}

/** Compact row for the "my trips" list. */
export interface TripSummary {
  id: string;
  name: string;
  emoji: string;
  baseCurrency: string;
  status: "active" | "closed";
  memberCount: number;
  totalSpent: number;
  yourNet: number | null;
  updatedAt: string;
}
