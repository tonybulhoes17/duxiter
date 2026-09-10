"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Lock,
  Plus,
  RotateCcw,
  Share2,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { publicEnv } from "@/lib/env";
import { formatMoney, formatDate, intlLocale } from "@/lib/trips/format";
import type { TripView } from "@/lib/trips/types";
import { ExpenseDrawer } from "@/components/trips/expense-drawer";

type Tab = "expenses" | "balances";

export function TripDetail({
  initial,
  justCreated = false,
}: {
  initial: TripView;
  justCreated?: boolean;
}) {
  const t = useTranslations("trip");
  const loc = intlLocale(useLocale());
  const [view, setView] = useState(initial);
  const [tab, setTab] = useState<Tab>("expenses");
  const [drawer, setDrawer] = useState<null | { editId?: string }>(null);
  const [showInvite, setShowInvite] = useState(justCreated);

  const money = (n: number) => formatMoney(n, view.baseCurrency, loc);
  const you = view.members.find((m) => m.id === view.youMemberId);
  const canEdit = view.canEdit;

  async function call(url: string, method: string, body?: unknown) {
    const res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      toast.error(t("failed"));
      return null;
    }
    const next = (await res.json()) as TripView;
    setView(next);
    return next;
  }

  async function addMember(name: string) {
    const res = await fetch(`/api/trips/${view.id}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) setView((await res.json()) as TripView);
    else toast.error(t("failed"));
  }

  async function shareInvite() {
    const link = `${publicEnv.appUrl}/j/${view.inviteToken}`;
    const text = t("inviteShareText", {
      trip: view.name,
      link,
      name: you?.name ?? "",
    });
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(link);
        toast.success(t("inviteCopied"));
      }
    } catch {
      /* cancelled */
    }
  }

  return (
    <div className="mx-auto max-w-lg pb-24">
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-border bg-overlay px-4 py-3 backdrop-blur-lg safe-top">
        <Link
          href="/trips"
          className="flex size-9 items-center justify-center rounded-md text-text-secondary hover:bg-subtle"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <span className="text-xl">{view.emoji}</span>
        <p className="min-w-0 flex-1 truncate font-heading font-semibold">
          {view.name}
        </p>
        <button
          type="button"
          onClick={() => setShowInvite(true)}
          className="flex size-9 items-center justify-center rounded-md text-text-secondary hover:bg-subtle"
          aria-label={t("inviteButton")}
        >
          <UserPlus className="size-5" />
        </button>
      </header>

      {view.status === "closed" && (
        <div className="flex items-center gap-2 border-b border-border bg-subtle/40 px-4 py-2 text-xs text-text-secondary">
          <Lock className="size-3.5" />
          {t("tripClosedBanner")}
          {view.isOwner && (
            <button
              className="ml-auto font-medium text-primary"
              onClick={() =>
                call(`/api/trips/${view.id}/close`, "POST", { reopen: true })
              }
            >
              {t("reopenTrip")}
            </button>
          )}
        </div>
      )}

      {/* tabs */}
      <div className="flex gap-1 border-b border-border px-4">
        {(["expenses", "balances"] as Tab[]).map((x) => (
          <button
            key={x}
            onClick={() => setTab(x)}
            className={`-mb-px border-b-2 px-3 py-3 text-sm font-medium ${
              tab === x
                ? "border-primary text-text-primary"
                : "border-transparent text-text-muted"
            }`}
          >
            {x === "expenses" ? t("tabExpenses") : t("tabBalances")}
          </button>
        ))}
      </div>

      {tab === "expenses" ? (
        <div className="space-y-3 p-4">
          {view.expenses.length === 0 ? (
            <p className="py-10 text-center text-sm text-text-muted">
              {t("noExpenses")}
            </p>
          ) : (
            view.expenses.map((e) => {
              const mine = e.shares.find((s) => s.memberId === view.youMemberId);
              return (
                <button
                  key={e.id}
                  onClick={() => canEdit && setDrawer({ editId: e.id })}
                  className="flex w-full items-center gap-3 rounded-lg border border-border bg-card p-3 text-left hover:border-white/20"
                >
                  <span className="text-xl">{e.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{e.title}</p>
                    <p className="text-xs text-text-muted">
                      {t("paidByName", { name: e.paidByName })} ·{" "}
                      {formatDate(e.spentOn, loc)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-metric font-semibold">{money(e.amount)}</p>
                    {mine && (
                      <p className="text-[11px] text-text-muted">
                        {t("yourShareShort", { amount: money(mine.amount) })}
                      </p>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      ) : (
        <BalancesTab
          view={view}
          money={money}
          t={t}
          onSettle={(fromMember, toMember, amount) =>
            call(`/api/trips/${view.id}/settlements`, "POST", {
              fromMember,
              toMember,
              amount,
            })
          }
          onUndoSettle={(id) =>
            call(`/api/trips/${view.id}/settlements/${id}`, "DELETE")
          }
        />
      )}

      {/* owner: close / report */}
      {view.isOwner && view.status === "active" && (
        <div className="px-4 pt-2">
          <button
            onClick={() => {
              if (confirm(t("closeConfirm")))
                call(`/api/trips/${view.id}/close`, "POST", {});
            }}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-border py-2.5 text-sm text-text-secondary hover:border-white/20"
          >
            <Lock className="size-4" />
            {t("closeTrip")}
          </button>
        </div>
      )}
      {view.status === "closed" && (
        <div className="px-4 pt-3">
          <TripReport view={view} money={money} t={t} loc={loc} />
        </div>
      )}

      {/* FAB */}
      {canEdit && (
        <button
          onClick={() => setDrawer({})}
          className="fixed bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg safe-bottom"
        >
          <Plus className="size-4" />
          {t("addExpense")}
        </button>
      )}

      {drawer && (
        <ExpenseDrawer
          view={view}
          editId={drawer.editId}
          onClose={() => setDrawer(null)}
          onSaved={(v) => {
            setView(v);
            setDrawer(null);
          }}
        />
      )}

      {showInvite && (
        <InviteSheet
          view={view}
          t={t}
          onClose={() => setShowInvite(false)}
          onShare={shareInvite}
          onAddMember={addMember}
        />
      )}
    </div>
  );
}

function BalancesTab({
  view,
  money,
  t,
  onSettle,
  onUndoSettle,
}: {
  view: TripView;
  money: (n: number) => string;
  t: ReturnType<typeof useTranslations>;
  onSettle: (from: string, to: string, amount: number) => void;
  onUndoSettle: (id: string) => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const yourNet =
    view.balances.find((b) => b.memberId === view.youMemberId)?.net ?? 0;

  return (
    <div className="space-y-4 p-4">
      {view.youMemberId && (
        <div className="rounded-lg border border-border bg-card p-4 text-center">
          {Math.abs(yourNet) < 0.01 ? (
            <p className="font-heading font-semibold text-text-secondary">
              {t("settledUp")}
            </p>
          ) : (
            <p
              className={`font-heading text-lg font-bold ${
                yourNet > 0 ? "text-success" : "text-primary"
              }`}
            >
              {yourNet > 0
                ? t("youAreOwed", { amount: money(yourNet) })
                : t("youOwe", { amount: money(-yourNet) })}
            </p>
          )}
        </div>
      )}

      {/* suggested settle-up */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
          {t("suggestedTitle")}
        </p>
        {view.suggested.length === 0 ? (
          <p className="text-sm text-text-muted">{t("noSettlements")}</p>
        ) : (
          <div className="space-y-2">
            {view.suggested.map((s, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-lg border border-border bg-card p-3"
              >
                <p className="min-w-0 flex-1 text-sm">
                  <span className="font-medium">{s.fromName}</span>{" "}
                  <span className="text-text-muted">→</span>{" "}
                  <span className="font-medium">{s.toName}</span>
                  <span className="ml-2 font-metric font-semibold">
                    {money(s.amount)}
                  </span>
                </p>
                {view.canEdit && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      onSettle(s.fromMember, s.toMember, s.amount)
                    }
                  >
                    <Check className="size-3.5" />
                    {t("markPaid")}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* per member */}
      <div className="space-y-1.5">
        {view.balances.map((b) => (
          <div key={b.memberId} className="rounded-lg border border-border bg-card">
            <button
              onClick={() => setOpen(open === b.memberId ? null : b.memberId)}
              className="flex w-full items-center gap-2 p-3 text-left"
            >
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {b.name}
                {b.memberId === view.youMemberId ? ` (${t("youAre")})` : ""}
              </span>
              <span
                className={`font-metric text-sm font-semibold ${
                  b.net > 0.01
                    ? "text-success"
                    : b.net < -0.01
                      ? "text-primary"
                      : "text-text-muted"
                }`}
              >
                {b.net > 0 ? "+" : ""}
                {money(b.net)}
              </span>
              <ChevronRight
                className={`size-4 text-text-muted transition-transform ${
                  open === b.memberId ? "rotate-90" : ""
                }`}
              />
            </button>
            {open === b.memberId && (
              <p className="border-t border-border px-3 py-2 text-xs text-text-muted">
                {t("balExplain", {
                  paid: money(b.paid),
                  share: money(b.owed),
                })}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* recorded payments */}
      {view.settlements.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
            {t("recordedPayments")}
          </p>
          <div className="space-y-1.5">
            {view.settlements.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm"
              >
                <span className="min-w-0 flex-1 truncate">
                  {s.fromName} → {s.toName}{" "}
                  <span className="font-metric font-semibold">
                    {money(s.amount)}
                  </span>
                </span>
                {view.canEdit && (
                  <button
                    onClick={() => onUndoSettle(s.id)}
                    className="text-text-muted hover:text-text-secondary"
                    aria-label={t("undo")}
                  >
                    <RotateCcw className="size-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TripReport({
  view,
  money,
  t,
  loc,
}: {
  view: TripView;
  money: (n: number) => string;
  t: ReturnType<typeof useTranslations>;
  loc: string;
}) {
  const perPerson = view.members.length
    ? view.totalSpent / view.members.length
    : 0;
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="font-heading font-semibold">{t("reportTitle")}</p>
      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-text-muted">{t("reportTotal")}</p>
          <p className="font-metric font-semibold">{money(view.totalSpent)}</p>
        </div>
        <div>
          <p className="text-xs text-text-muted">{t("reportPerPerson")}</p>
          <p className="font-metric font-semibold">{money(perPerson)}</p>
        </div>
      </div>
      <table className="mt-3 w-full text-sm">
        <tbody>
          {view.balances.map((b) => (
            <tr key={b.memberId} className="border-t border-border">
              <td className="py-1.5">{b.name}</td>
              <td className="py-1.5 text-right text-text-muted">
                {money(b.paid)}
              </td>
              <td
                className={`py-1.5 text-right font-metric font-semibold ${
                  b.net > 0.01
                    ? "text-success"
                    : b.net < -0.01
                      ? "text-primary"
                      : ""
                }`}
              >
                {b.net > 0 ? "+" : ""}
                {money(b.net)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {view.suggested.length > 0 && (
        <>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
            {t("reportFinalSettle")}
          </p>
          <ul className="mt-1 space-y-0.5 text-sm">
            {view.suggested.map((s, i) => (
              <li key={i}>
                {s.fromName} → {s.toName}:{" "}
                <span className="font-metric font-semibold">
                  {money(s.amount)}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="mt-3 text-[11px] text-text-muted">
        {t("reportGenerated")} · {formatDate(view.createdAt, loc)}
      </p>
    </div>
  );
}

function InviteSheet({
  view,
  t,
  onClose,
  onShare,
  onAddMember,
}: {
  view: TripView;
  t: ReturnType<typeof useTranslations>;
  onClose: () => void;
  onShare: () => void;
  onAddMember: (name: string) => void;
}) {
  const [name, setName] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/50" onClick={onClose}>
      <div
        className="w-full rounded-t-2xl bg-card p-5 safe-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-subtle" />
        <p className="font-heading font-semibold">{t("inviteButton")}</p>
        <Button className="mt-3 w-full" onClick={onShare}>
          <Share2 className="size-4" />
          {t("share")}
        </Button>
        <div className="mt-4 flex items-center gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("addPerson")}
            className="h-10 flex-1 rounded-md border border-border bg-background px-3 text-sm"
            maxLength={40}
          />
          <Button
            variant="outline"
            onClick={() => {
              if (name.trim()) {
                onAddMember(name.trim());
                setName("");
              }
            }}
          >
            <Plus className="size-4" />
          </Button>
        </div>
        <p className="mt-3 text-xs text-text-muted">
          {view.members.map((m) => m.name).join(", ")}
        </p>
      </div>
    </div>
  );
}
