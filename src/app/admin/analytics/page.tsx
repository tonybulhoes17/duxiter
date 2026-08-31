import { Eye, PlayCircle, Sparkles, UserPlus } from "lucide-react";
import { StatCard } from "@/components/admin/stat-card";
import { MiniLineChart } from "@/components/admin/line-chart";
import { getAdminAnalytics } from "@/lib/admin-queries";

export default async function AdminAnalyticsPage() {
  const a = await getAdminAnalytics();
  const signupTotal = a.signups.reduce((s, d) => s + d.count, 0);

  return (
    <div className="space-y-8">
      <h1 className="font-display text-2xl font-bold">Analytics</h1>
      <p className="-mt-6 text-sm text-text-muted">Last 30 days</p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Tour views"
          value={String(a.totals.tour_view ?? 0)}
          icon={Eye}
        />
        <StatCard
          label="Tours started"
          value={String(a.totals.tour_start ?? 0)}
          icon={PlayCircle}
        />
        <StatCard
          label="Itineraries generated"
          value={String(a.totals.itinerary_generate ?? 0)}
          icon={Sparkles}
        />
        <StatCard label="New users" value={String(signupTotal)} icon={UserPlus} />
      </div>

      <section className="rounded-lg border border-border bg-card p-5">
        <h2 className="font-heading text-sm font-semibold text-text-secondary">
          Views vs starts
        </h2>
        <div className="mt-3">
          <MiniLineChart
            data={a.daily}
            series={[
              { key: "views", label: "Views", color: "#E53935" },
              { key: "starts", label: "Starts", color: "#3B82F6" },
            ]}
          />
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-5">
        <h2 className="font-heading text-sm font-semibold text-text-secondary">
          New users
        </h2>
        <div className="mt-3">
          <MiniLineChart
            data={a.signups}
            series={[{ key: "count", label: "Signups", color: "#22C55E" }]}
          />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="font-heading text-base font-semibold">
            Top tours · views
          </h2>
          <ul className="mt-3 divide-y divide-border text-sm">
            {a.topViewed.map((t) => (
              <li key={t.tour} className="flex justify-between py-2">
                <span className="truncate pr-2">{t.tour}</span>
                <span className="font-metric text-text-secondary">
                  {t.views}
                </span>
              </li>
            ))}
            {a.topViewed.length === 0 && (
              <li className="py-2 text-text-muted">No data yet.</li>
            )}
          </ul>
        </section>

        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="font-heading text-base font-semibold">
            Top tours · starts
          </h2>
          <ul className="mt-3 divide-y divide-border text-sm">
            {a.topStarted.map((t) => (
              <li key={t.tour} className="flex justify-between py-2">
                <span className="truncate pr-2">{t.tour}</span>
                <span className="font-metric text-text-secondary">
                  {t.starts}
                </span>
              </li>
            ))}
            {a.topStarted.length === 0 && (
              <li className="py-2 text-text-muted">No data yet.</li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
