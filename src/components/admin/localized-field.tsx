"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { locales, localeLabels, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

export type LocalizedValue = Partial<Record<Locale, string>>;

export function LocalizedField({
  label,
  value,
  onChange,
  multiline = false,
  maxLength,
  required,
  translatable = true,
}: {
  label: string;
  value: LocalizedValue;
  onChange: (v: LocalizedValue) => void;
  multiline?: boolean;
  maxLength?: number;
  required?: boolean;
  translatable?: boolean;
}) {
  const [tab, setTab] = useState<Locale>("pt");
  const [translating, setTranslating] = useState(false);

  async function translate() {
    const source = value[tab]?.trim();
    if (!source) {
      toast.error(`Write the ${localeLabels[tab].native} text first.`);
      return;
    }
    setTranslating(true);
    try {
      const res = await fetch("/api/admin/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: source, from: tab }),
      });
      if (!res.ok) throw new Error();
      const { translations } = (await res.json()) as {
        translations: LocalizedValue;
      };
      onChange({ ...value, ...translations });
      toast.success("Translated — review the other tabs");
    } catch {
      toast.error("Translation failed.");
    } finally {
      setTranslating(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label>
          {label}
          {required && <span className="text-primary"> *</span>}
        </Label>
        <div className="flex items-center gap-1">
          {translatable && (
            <button
              type="button"
              onClick={translate}
              disabled={translating}
              title={`Translate from ${localeLabels[tab].native} to the others`}
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-text-muted hover:bg-subtle hover:text-text-primary disabled:opacity-50"
            >
              {translating ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Sparkles className="size-3.5" />
              )}
            </button>
          )}
          {locales.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setTab(l)}
              className={cn(
                "rounded px-2 py-0.5 text-xs font-medium",
                tab === l
                  ? "bg-primary/15 text-text-primary"
                  : "text-text-muted hover:bg-subtle",
                !value[l]?.trim() && "opacity-60",
              )}
            >
              {localeLabels[l].flag}
            </button>
          ))}
        </div>
      </div>
      {multiline ? (
        <textarea
          value={value[tab] ?? ""}
          maxLength={maxLength}
          onChange={(e) => onChange({ ...value, [tab]: e.target.value })}
          rows={4}
          className="w-full rounded-md border border-border bg-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      ) : (
        <Input
          value={value[tab] ?? ""}
          maxLength={maxLength}
          onChange={(e) => onChange({ ...value, [tab]: e.target.value })}
        />
      )}
      {maxLength && (
        <p className="text-right text-[11px] text-text-muted">
          {(value[tab] ?? "").length}/{maxLength}
        </p>
      )}
    </div>
  );
}
