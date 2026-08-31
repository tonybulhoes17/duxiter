"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { locales, localeLabels, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

export function LanguageChooser({ initial }: { initial: Locale }) {
  const t = useTranslations("onboarding");
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/cities";

  const [choice, setChoice] = useState<Locale>(initial);
  const [saving, setSaving] = useState(false);

  async function confirm() {
    setSaving(true);
    const res = await fetch("/api/auth/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: choice }),
    });
    if (!res.ok) {
      setSaving(false);
      toast.error("Could not save your language. Try again.");
      return;
    }
    document.cookie = `DUXITER_LOCALE=${choice}; path=/; max-age=${60 * 60 * 24 * 365}`;
    router.replace(next);
    router.refresh();
  }

  return (
    <div className="w-full max-w-md">
      <h1 className="font-display text-2xl font-bold">{t("title")}</h1>
      <p className="mt-1 text-sm text-text-secondary">{t("subtitle")}</p>

      <div className="mt-6 grid gap-3">
        {locales.map((l) => {
          const active = l === choice;
          return (
            <button
              key={l}
              type="button"
              onClick={() => setChoice(l)}
              className={cn(
                "flex items-center gap-3 rounded-lg border p-4 text-left transition-colors",
                active
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card hover:border-white/20",
              )}
            >
              <span className="text-2xl">{localeLabels[l].flag}</span>
              <span className="flex-1">
                <span className="block font-medium text-text-primary">
                  {localeLabels[l].native}
                </span>
                <span className="block text-xs text-text-muted">
                  {localeLabels[l].label}
                </span>
              </span>
              {active && <Check className="size-5 text-primary" />}
            </button>
          );
        })}
      </div>

      <Button onClick={confirm} disabled={saving} size="lg" className="mt-6 w-full">
        {saving && <Loader2 className="size-4 animate-spin" />}
        {t("continue")}
      </Button>
    </div>
  );
}
