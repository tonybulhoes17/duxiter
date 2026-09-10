"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getDeviceTrips } from "@/lib/trips/client-store";
import { formatMoney, intlLocale } from "@/lib/trips/format";
import type { TripSummary } from "@/lib/trips/types";

export function TripsList({ canCreate }: { canCreate: boolean }) {
  const t = useTranslations("trip");
  const loc = intlLocale(useLocale());
  const [trips, setTrips] = useState<TripSummary[] | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      const device = getDeviceTrips();
      const [mine, guest] = await Promise.all([
        fetch("/api/trips")
          .then((r) => (r.ok ? r.json() : { trips: [] }))
          .catch(() => ({ trips: [] })),
        device.length
          ? fetch("/api/trips/mine", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                tokens: device.map((d) => ({
                  tripId: d.tripId,
                  secret: d.secret,
                })),
              }),
            })
              .then((r) => (r.ok ? r.json() : { trips: [] }))
              .catch(() => ({ trips: [] }))
          : Promise.resolve({ trips: [] }),
      ]);
      if (!alive) return;
      const map = new Map<string, TripSummary>();
      for (const x of [...mine.trips, ...guest.trips]) map.set(x.id, x);
      setTrips(
        [...map.values()].sort((a, b) =>
          b.updatedAt.localeCompare(a.updatedAt),
        ),
      );
    }
    load();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="mt-6 space-y-3">
      {canCreate && (
        <Button asChild className="w-full">
          <Link href="/trips/new">
            <Plus className="size-4" />
            {t("new")}
          </Link>
        </Button>
      )}

      {trips === null ? (
        <div className="flex justify-center py-10">
          <Loader2 className="size-5 animate-spin text-text-muted" />
        </div>
      ) : trips.length === 0 ? (
        <p className="py-8 text-center text-sm text-text-muted">
          {canCreate ? t("empty") : t("emptyGuest")}
        </p>
      ) : (
        trips.map((tr) => (
          <Link
            key={tr.id}
            href={`/trips/${tr.id}`}
            className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 hover:border-white/20"
          >
            <span className="text-2xl">{tr.emoji}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-heading font-semibold">{tr.name}</p>
              <p className="text-xs text-text-muted">
                {t("membersCount", { count: tr.memberCount })} ·{" "}
                {formatMoney(tr.totalSpent, tr.baseCurrency, loc)}
                {tr.status === "closed" ? ` · ${t("closed")}` : ""}
              </p>
            </div>
            {tr.yourNet != null && Math.abs(tr.yourNet) >= 0.01 && (
              <span
                className={
                  tr.yourNet > 0
                    ? "shrink-0 font-metric text-sm font-semibold text-success"
                    : "shrink-0 font-metric text-sm font-semibold text-primary"
                }
              >
                {tr.yourNet > 0 ? "+" : ""}
                {formatMoney(tr.yourNet, tr.baseCurrency, loc)}
              </span>
            )}
          </Link>
        ))
      )}
    </div>
  );
}
