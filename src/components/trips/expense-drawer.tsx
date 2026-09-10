"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMoney, intlLocale } from "@/lib/trips/format";
import type { TripView } from "@/lib/trips/types";

const EMOJIS = ["💸", "🍽️", "🍺", "🏨", "🚕", "🎟️", "🛒", "⛽", "☕", "🎁"];

export function ExpenseDrawer({
  view,
  editId,
  onClose,
  onSaved,
}: {
  view: TripView;
  editId?: string;
  onClose: () => void;
  onSaved: (v: TripView) => void;
}) {
  const t = useTranslations("trip");
  const loc = intlLocale(useLocale());
  const editing = editId
    ? view.expenses.find((e) => e.id === editId)
    : undefined;

  const [emoji, setEmoji] = useState(editing?.emoji ?? "💸");
  const [title, setTitle] = useState(editing?.title ?? "");
  const [amount, setAmount] = useState(
    editing ? String(editing.amount) : "",
  );
  const [paidBy, setPaidBy] = useState(
    editing?.paidBy ?? view.youMemberId ?? view.members[0]?.id ?? "",
  );
  const [spentOn, setSpentOn] = useState(
    editing?.spentOn ?? new Date().toISOString().slice(0, 10),
  );
  const [participants, setParticipants] = useState<string[]>(
    editing
      ? editing.shares.map((s) => s.memberId)
      : view.members.map((m) => m.id),
  );
  const [note, setNote] = useState(editing?.note ?? "");
  const [busy, setBusy] = useState(false);

  const amountNum = Number(amount.replace(",", "."));
  const perPerson =
    participants.length > 0 && amountNum > 0
      ? amountNum / participants.length
      : 0;

  function toggle(id: string) {
    setParticipants((p) =>
      p.includes(id) ? p.filter((x) => x !== id) : [...p, id],
    );
  }

  async function save() {
    if (!title.trim() || !(amountNum > 0)) return toast.error(t("failed"));
    if (participants.length < 1 || !paidBy) return toast.error(t("failed"));
    setBusy(true);
    const payload = {
      title: title.trim(),
      emoji,
      amount: amountNum,
      paidBy,
      splitMode: "equal" as const,
      spentOn,
      note: note.trim() || undefined,
      participants,
    };
    const res = await fetch(
      editId
        ? `/api/trips/${view.id}/expenses/${editId}`
        : `/api/trips/${view.id}/expenses`,
      {
        method: editId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    setBusy(false);
    if (!res.ok) return toast.error(t("failed"));
    onSaved((await res.json()) as TripView);
  }

  async function remove() {
    if (!editId || !confirm(t("expDeleteConfirm"))) return;
    setBusy(true);
    const res = await fetch(`/api/trips/${view.id}/expenses/${editId}`, {
      method: "DELETE",
    });
    setBusy(false);
    if (!res.ok) return toast.error(t("failed"));
    onSaved((await res.json()) as TripView);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/50" onClick={onClose}>
      <div
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-card p-5 safe-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <p className="font-heading font-semibold">{t("addExpense")}</p>
          <button onClick={onClose} className="text-text-muted">
            <X className="size-5" />
          </button>
        </div>

        <div className="mt-4 flex items-start gap-2">
          <select
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            className="h-11 rounded-md border border-border bg-background px-2 text-lg"
          >
            {EMOJIS.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("expTitlePlaceholder")}
            maxLength={80}
            className="h-11 flex-1 rounded-md border border-border bg-background px-3 text-sm"
          />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-text-muted">{t("expAmount")}</label>
            <div className="mt-1 flex h-11 items-center rounded-md border border-border bg-background px-3">
              <span className="mr-1 text-xs text-text-muted">
                {view.baseCurrency}
              </span>
              <input
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
                className="w-full bg-transparent text-sm outline-none"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-text-muted">{t("expWhen")}</label>
            <input
              type="date"
              value={spentOn}
              onChange={(e) => setSpentOn(e.target.value)}
              className="mt-1 h-11 w-full rounded-md border border-border bg-background px-3 text-sm"
            />
          </div>
        </div>

        <div className="mt-3">
          <label className="text-xs text-text-muted">{t("expPaidBy")}</label>
          <select
            value={paidBy}
            onChange={(e) => setPaidBy(e.target.value)}
            className="mt-1 h-11 w-full rounded-md border border-border bg-background px-3 text-sm"
          >
            {view.members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
                {m.id === view.youMemberId ? ` (${t("youAre")})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-3">
          <div className="flex items-center justify-between">
            <label className="text-xs text-text-muted">
              {t("expSplitBetween")}
            </label>
            {perPerson > 0 && (
              <span className="text-xs text-text-secondary">
                {t("perPersonShort", {
                  amount: formatMoney(perPerson, view.baseCurrency, loc),
                })}
              </span>
            )}
          </div>
          <div className="mt-1 space-y-1">
            {view.members.map((m) => (
              <label
                key={m.id}
                className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={participants.includes(m.id)}
                  onChange={() => toggle(m.id)}
                />
                <span className="flex-1">{m.name}</span>
                {participants.includes(m.id) && perPerson > 0 && (
                  <span className="font-metric text-xs text-text-muted">
                    {formatMoney(perPerson, view.baseCurrency, loc)}
                  </span>
                )}
              </label>
            ))}
          </div>
        </div>

        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t("expNote")}
          maxLength={400}
          className="mt-3 h-11 w-full rounded-md border border-border bg-background px-3 text-sm"
        />

        <div className="mt-4 flex gap-2">
          {editId && (
            <Button variant="outline" onClick={remove} disabled={busy}>
              <Trash2 className="size-4" />
            </Button>
          )}
          <Button className="flex-1" onClick={save} disabled={busy}>
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              t("expSave")
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
