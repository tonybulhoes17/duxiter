import { Download } from "lucide-react";
import { StatCard } from "@/components/admin/stat-card";
import { RevenueChart } from "@/components/admin/revenue-chart";
import { getAdminFinances } from "@/lib/admin-queries";
import { formatBrl } from "@/lib/format";
import { DollarSign, TrendingUp } from "lucide-react";

const METHOD_LABEL: Record<string, string> = {
  stripe_card: "Card",
  pix: "PIX",
  unknown: "—",
};

export default async function AdminFinancesPage() {
  const f = await getAdminFinances();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Finances</h1>
        <a
          href="/api/admin/finances/export"
          className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-subtle"
        >
          <Download className="size-4" />
          Export CSV
        </a>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard
          label="Total revenue"
          value={formatBrl(f.totalBrl)}
          icon={DollarSign}
        />
        <StatCard
          label="This month"
          value={formatBrl(f.monthBrl)}
          icon={TrendingUp}
        />
      </div>

      <section className="rounded-lg border border-border bg-card p-5">
        <h2 className="font-heading text-sm font-semibold text-text-secondary">
          Revenue by month
        </h2>
        <div className="mt-3">
          <RevenueChart
            data={f.byMonth.map((m) => ({ date: m.month, brl: m.brl }))}
          />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="font-heading text-base font-semibold">By payment method</h2>
          <ul className="mt-3 divide-y divide-border text-sm">
            {f.byMethod.map((m) => (
              <li key={m.method} className="flex justify-between py-2">
                <span>
                  {METHOD_LABEL[m.method] ?? m.method}{" "}
                  <span className="text-text-muted">({m.count})</span>
                </span>
                <span className="font-metric">{formatBrl(m.brl)}</span>
              </li>
            ))}
            {f.byMethod.length === 0 && (
              <li className="py-2 text-text-muted">No sales yet.</li>
            )}
          </ul>
        </section>

        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="font-heading text-base font-semibold">By tour</h2>
          <ul className="mt-3 divide-y divide-border text-sm">
            {f.byTour.slice(0, 10).map((t) => (
              <li key={t.tour} className="flex justify-between py-2">
                <span className="truncate pr-2">
                  {t.tour} <span className="text-text-muted">({t.count})</span>
                </span>
                <span className="shrink-0 font-metric">{formatBrl(t.brl)}</span>
              </li>
            ))}
            {f.byTour.length === 0 && (
              <li className="py-2 text-text-muted">No sales yet.</li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
