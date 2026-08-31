"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CityCard } from "@/components/discovery/city-card";
import type { CityWithCount } from "@/lib/queries";
import type { Locale } from "@/i18n/config";

interface Item {
  city: CityWithCount;
  name: string;
  toursLabel: string;
}

export function CitiesExplorer({
  items,
  locale,
  searchPlaceholder,
  emptyLabel,
}: {
  items: Item[];
  locale: Locale;
  searchPlaceholder: string;
  emptyLabel: string;
}) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter(
      (it) =>
        it.name.toLowerCase().includes(needle) ||
        (it.city.country ?? "").toLowerCase().includes(needle),
    );
  }, [items, q]);

  return (
    <>
      <div className="relative mt-6 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={searchPlaceholder}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="mt-10 text-sm text-text-muted">{emptyLabel}</p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((it) => (
            <CityCard
              key={it.city.id}
              city={it.city}
              locale={locale}
              toursLabel={it.toursLabel}
            />
          ))}
        </div>
      )}
    </>
  );
}
