"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Check, Globe } from "lucide-react";
import { locales, localeLabels, LOCALE_COOKIE, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function choose(next: Locale) {
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}`;
    setOpen(false);
    startTransition(() => router.refresh());
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-2 text-sm text-text-secondary hover:bg-subtle hover:text-text-primary"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Globe className="size-4" />
        {compact ? (
          localeLabels[locale].flag
        ) : (
          <span>{localeLabels[locale].native}</span>
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <ul
            role="listbox"
            className="absolute right-0 z-50 mt-1 w-44 overflow-hidden rounded-md border border-border bg-popover p-1 shadow-xl"
          >
            {locales.map((l) => (
              <li key={l}>
                <button
                  type="button"
                  onClick={() => choose(l)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-sm px-2.5 py-2 text-sm hover:bg-subtle",
                    l === locale ? "text-text-primary" : "text-text-secondary",
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span>{localeLabels[l].flag}</span>
                    {localeLabels[l].native}
                  </span>
                  {l === locale && <Check className="size-4 text-primary" />}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
