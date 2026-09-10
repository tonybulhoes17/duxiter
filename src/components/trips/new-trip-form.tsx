"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, Plus, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TRIP_CURRENCIES } from "@/lib/trips/validate";

const EMOJIS = ["🧳", "🏖️", "🏔️", "🌆", "🗺️", "✈️", "🚗", "⛺", "🍷", "🎉"];

export function NewTripForm({ defaultYou }: { defaultYou: string }) {
  const t = useTranslations("trip");
  const router = useRouter();
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🧳");
  const [currency, setCurrency] = useState("BRL");
  const [people, setPeople] = useState<string[]>([defaultYou || "", "", ""]);
  const [busy, setBusy] = useState(false);

  function setPerson(i: number, v: string) {
    setPeople((p) => p.map((x, idx) => (idx === i ? v : x)));
  }

  async function submit() {
    const members = people.map((p) => p.trim()).filter(Boolean);
    if (!name.trim()) return toast.error(t("nameLabel"));
    if (members.length < 2) return toast.error(t("needTwo"));
    setBusy(true);
    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, emoji, currency, members }),
      });
      if (!res.ok) throw new Error();
      const { id } = (await res.json()) as { id: string };
      router.replace(`/trips/${id}?invited=1`);
    } catch {
      setBusy(false);
      toast.error(t("failed"));
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">{t("new")}</h1>

      <div className="space-y-2">
        <Label>{t("emojiLabel")}</Label>
        <div className="flex flex-wrap gap-2">
          {EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setEmoji(e)}
              className={`flex size-10 items-center justify-center rounded-md border text-xl ${
                emoji === e ? "border-primary bg-primary/10" : "border-border"
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="tn">{t("nameLabel")}</Label>
        <Input
          id="tn"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("namePlaceholder")}
          maxLength={80}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cur">{t("currencyLabel")}</Label>
        <select
          id="cur"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className="h-11 w-full rounded-md border border-border bg-elevated px-3 text-sm"
        >
          {TRIP_CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label>{t("peopleLabel")}</Label>
        <p className="text-xs text-text-muted">{t("peopleHint")}</p>
        <div className="space-y-2">
          {people.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={p}
                onChange={(e) => setPerson(i, e.target.value)}
                placeholder={i === 0 ? `${defaultYou || ""}`.trim() : ""}
                maxLength={40}
              />
              {i === 0 ? (
                <span className="w-16 shrink-0 text-xs text-text-muted">
                  {t("youAre")}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setPeople((pp) => pp.filter((_, x) => x !== i))}
                  className="flex size-9 shrink-0 items-center justify-center rounded-md text-text-muted hover:bg-subtle"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setPeople((p) => [...p, ""])}
          className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
        >
          <Plus className="size-4" />
          {t("addPerson")}
        </button>
      </div>

      <Button onClick={submit} size="lg" className="w-full" disabled={busy}>
        {busy ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Sparkles className="size-4" />
        )}
        {t("create")}
      </Button>
    </div>
  );
}
