"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { rememberDeviceTrip } from "@/lib/trips/client-store";
import { formatMoney, intlLocale } from "@/lib/trips/format";
import type { TripView } from "@/lib/trips/types";

export function JoinFlow({
  view,
  inviteToken,
}: {
  view: TripView;
  inviteToken: string;
}) {
  const t = useTranslations("trip");
  const loc = intlLocale(useLocale());
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [addingName, setAddingName] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  async function claim(memberId: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/trips/join/${inviteToken}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId }),
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as {
        tripId: string;
        memberId: string;
        secret: string;
      };
      rememberDeviceTrip({
        tripId: data.tripId,
        secret: data.secret,
        memberId: data.memberId,
        name: view.name,
        emoji: view.emoji,
      });
      router.replace(`/trips/${data.tripId}`);
    } catch {
      setBusy(false);
      toast.error(t("failed"));
    }
  }

  async function addAndClaim() {
    const name = addingName.trim();
    if (!name) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/trips/${view.id}/members?invite=${inviteToken}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        },
      );
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { newMemberId: string | null };
      if (data.newMemberId) await claim(data.newMemberId);
      else throw new Error();
    } catch {
      setBusy(false);
      toast.error(t("failed"));
    }
  }

  const money = (n: number) => formatMoney(n, view.baseCurrency, loc);

  return (
    <div className="mt-3 space-y-5">
      <div className="rounded-xl border border-border bg-card p-5 text-center">
        <span className="text-4xl">{view.emoji}</span>
        <h1 className="mt-2 font-display text-xl font-bold">{view.name}</h1>
        <p className="mt-1 text-xs text-text-muted">
          {t("membersCount", { count: view.members.length })} ·{" "}
          {money(view.totalSpent)}
        </p>
        <p className="mt-1 text-[11px] text-text-muted">
          {t("invitePreviewNote")}
        </p>
      </div>

      <div>
        <p className="mb-2 font-heading font-semibold">{t("whoAreYou")}</p>
        <div className="space-y-2">
          {view.members.map((m) => (
            <button
              key={m.id}
              disabled={busy || m.claimed}
              onClick={() => claim(m.id)}
              className={`flex w-full items-center gap-2 rounded-lg border px-4 py-3 text-left text-sm ${
                m.claimed
                  ? "border-border text-text-muted"
                  : "border-border font-medium hover:border-primary"
              }`}
            >
              <span className="flex-1">{m.name}</span>
              {m.claimed ? (
                <Check className="size-4 text-success" />
              ) : (
                <span className="text-xs text-text-muted">{t("imName", { name: m.name })}</span>
              )}
            </button>
          ))}
        </div>

        {showAdd ? (
          <div className="mt-3 flex items-center gap-2">
            <input
              value={addingName}
              onChange={(e) => setAddingName(e.target.value)}
              placeholder={t("addMeName")}
              maxLength={40}
              className="h-11 flex-1 rounded-md border border-border bg-background px-3 text-sm"
            />
            <Button onClick={addAndClaim} disabled={busy}>
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                t("joinTrip")
              )}
            </Button>
          </div>
        ) : (
          <button
            onClick={() => setShowAdd(true)}
            className="mt-3 text-sm text-text-secondary underline underline-offset-2"
          >
            {t("notListed")}
          </button>
        )}
      </div>
    </div>
  );
}
