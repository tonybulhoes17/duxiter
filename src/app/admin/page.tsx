import Link from "next/link";
import {
  Clock,
  DollarSign,
  Route,
  Users,
  CheckCircle2,
} from "lucide-react";
import { StatCard } from "@/components/admin/stat-card";
import { RevenueChart } from "@/components/admin/revenue-chart";
import { ApprovalActions } from "@/components/admin/approval-actions";
import { getAdminOverview } from "@/lib/admin-queries";
import { formatBrl, formatDate } from "@/lib/format";
import { getLocalizedText } from "@/i18n/config";

export default async function AdminOverviewPage() {
  const o = await getAdminOverview();

  return (
    <div className="space-y-8">
      <h1 className="font-display text-2xl font-bold">Overview</h1>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Revenue this month"
          value={formatBrl(o.revenueMonthBrl)}
          hint={`${o.revenueMonthCount} sale${o.revenueMonthCount === 1 ? "" : "s"}`}
          icon={DollarSign}
        />
        <StatCard label="Active tours" value={String(o.activeTours)} icon={Route} />
        <StatCard label="Users" value={String(o.totalUsers)} icon={Users} />
        <StatCard
          label="Pending approvals"
          value={String(o.pendingApprovals.length)}
          icon={Clock}
        />
      </div>

      <section className="rounded-lg border border-border bg-card p-5">
        <h2 className="font-heading text-sm font-semibold text-text-secondary">
          Revenue · last 30 days
        </h2>
        <div className="mt-3">
          <RevenueChart data={o.dailyRevenue} />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Approval queue */}
        <section className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-base font-semibold">
              Approval queue
            </h2>
            <Link
              href="/admin/tours"
              className="text-xs text-text-secondary hover:text-text-primary"
            >
              All tours
            </Link>
          </div>
          {o.pendingApprovals.length === 0 ? (
            <p className="mt-4 flex items-center gap-2 text-sm text-text-muted">
              <CheckCircle2 className="size-4 text-success" />
              Nothing waiting for review.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {o.pendingApprovals.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center gap-3 rounded-md border border-border bg-elevated p-3"
                >
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/admin/tours/${t.id}/edit`}
                      className="block truncate text-sm font-medium hover:underline"
                    >
                      {getLocalizedText(t.title, "en")}
                    </Link>
                    <p className="text-xs text-text-muted">
                      {t.city ?? "—"} · {t.type} · {formatDate(t.created_at, "en")}
                    </p>
                  </div>
                  <ApprovalActions tourId={t.id} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Recent sales + signups */}
        <div className="space-y-6">
          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="font-heading text-base font-semibold">Recent sales</h2>
            {o.recentSales.length === 0 ? (
              <p className="mt-4 text-sm text-text-muted">No sales yet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-border text-sm">
                {o.recentSales.map((s) => (
                  <li key={s.id} className="flex items-center justify-between py-2">
                    <span className="truncate pr-2">{s.tour}</span>
                    <span className="shrink-0 font-metric text-text-secondary">
                      {s.amount_brl != null ? formatBrl(Number(s.amount_brl)) : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="font-heading text-base font-semibold">
              Recent signups
            </h2>
            {o.recentSignups.length === 0 ? (
              <p className="mt-4 text-sm text-text-muted">No users yet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-border text-sm">
                {o.recentSignups.map((u) => (
                  <li key={u.id} className="flex items-center justify-between py-2">
                    <span className="truncate pr-2">
                      {u.full_name ?? "Traveler"}
                    </span>
                    <span className="shrink-0 font-metric text-text-muted">
                      {formatDate(u.created_at, "en")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
