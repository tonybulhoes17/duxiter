import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { LocalizedText } from "@/i18n/config";
import type {
  CityRow,
  DiscountCodeRow,
  TourRow,
  TourStopRow,
  StopImageRow,
  StopAudioRow,
} from "@/lib/database.types";

export async function getAdminDiscounts(): Promise<DiscountCodeRow[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("discount_codes")
    .select("*")
    .order("created_at", { ascending: false });
  return (data ?? []) as DiscountCodeRow[];
}

export interface AdminUserRow {
  id: string;
  full_name: string | null;
  is_banned: boolean;
  created_at: string;
  purchaseCount: number;
  totalSpentBrl: number;
}

export async function getAdminUsers(): Promise<AdminUserRow[]> {
  const admin = createAdminClient();
  const [{ data: profiles }, { data: purchases }] = await Promise.all([
    admin
      .from("user_profiles")
      .select("id, full_name, is_banned, created_at")
      .order("created_at", { ascending: false })
      .limit(200),
    admin
      .from("purchases")
      .select("user_id, amount_paid_brl")
      .eq("status", "completed"),
  ]);

  const byUser = new Map<string, { count: number; total: number }>();
  for (const p of purchases ?? []) {
    const cur = byUser.get(p.user_id) ?? { count: 0, total: 0 };
    cur.count += 1;
    cur.total += Number(p.amount_paid_brl ?? 0);
    byUser.set(p.user_id, cur);
  }

  return (profiles ?? []).map((u) => ({
    ...u,
    purchaseCount: byUser.get(u.id)?.count ?? 0,
    totalSpentBrl: byUser.get(u.id)?.total ?? 0,
  }));
}

export interface AdminAnalytics {
  totals: Record<string, number>;
  daily: { date: string; views: number; starts: number }[];
  topViewed: { tour: string; views: number }[];
  topStarted: { tour: string; starts: number }[];
  signups: { date: string; count: number }[];
}

export async function getAdminAnalytics(): Promise<AdminAnalytics> {
  const admin = createAdminClient();
  const from = new Date(Date.now() - 30 * 864e5).toISOString();

  const [{ data: events }, { data: signups }, { data: tours }] =
    await Promise.all([
      admin
        .from("analytics_events")
        .select("event_type, tour_id, created_at")
        .gte("created_at", from),
      admin
        .from("user_profiles")
        .select("created_at")
        .gte("created_at", from),
      admin.from("tours").select("id, title"),
    ]);

  const tourName = new Map<string, string>();
  for (const t of tours ?? []) {
    const n = t.title as LocalizedText;
    tourName.set(t.id, n?.en ?? n?.pt ?? "—");
  }

  const totals: Record<string, number> = {};
  const dayViews = new Map<string, number>();
  const dayStarts = new Map<string, number>();
  const viewsByTour = new Map<string, number>();
  const startsByTour = new Map<string, number>();

  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
    dayViews.set(d, 0);
    dayStarts.set(d, 0);
  }

  for (const e of events ?? []) {
    totals[e.event_type] = (totals[e.event_type] ?? 0) + 1;
    const d = String(e.created_at).slice(0, 10);
    if (e.event_type === "tour_view") {
      if (dayViews.has(d)) dayViews.set(d, dayViews.get(d)! + 1);
      if (e.tour_id)
        viewsByTour.set(e.tour_id, (viewsByTour.get(e.tour_id) ?? 0) + 1);
    }
    if (e.event_type === "tour_start") {
      if (dayStarts.has(d)) dayStarts.set(d, dayStarts.get(d)! + 1);
      if (e.tour_id)
        startsByTour.set(e.tour_id, (startsByTour.get(e.tour_id) ?? 0) + 1);
    }
  }

  const dailySignups = new Map<string, number>();
  for (let i = 29; i >= 0; i--) {
    dailySignups.set(
      new Date(Date.now() - i * 864e5).toISOString().slice(0, 10),
      0,
    );
  }
  for (const s of signups ?? []) {
    const d = String(s.created_at).slice(0, 10);
    if (dailySignups.has(d)) dailySignups.set(d, dailySignups.get(d)! + 1);
  }

  const topN = (m: Map<string, number>, key: "views" | "starts") =>
    Array.from(m.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([id, n]) => ({ tour: tourName.get(id) ?? "—", [key]: n })) as never;

  return {
    totals,
    daily: Array.from(dayViews.keys()).map((date) => ({
      date,
      views: dayViews.get(date) ?? 0,
      starts: dayStarts.get(date) ?? 0,
    })),
    topViewed: topN(viewsByTour, "views"),
    topStarted: topN(startsByTour, "starts"),
    signups: Array.from(dailySignups, ([date, count]) => ({ date, count })),
  };
}

export interface AdminFinances {
  totalBrl: number;
  monthBrl: number;
  byMethod: { method: string; brl: number; count: number }[];
  byTour: { tour: string; brl: number; count: number }[];
  byMonth: { month: string; brl: number }[];
}

export async function getAdminFinances(): Promise<AdminFinances> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("purchases")
    .select("amount_paid_brl, payment_method, created_at, tours(title)")
    .eq("status", "completed")
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as unknown as {
    amount_paid_brl: number | null;
    payment_method: string | null;
    created_at: string;
    tours: { title: LocalizedText } | null;
  }[];

  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  let totalBrl = 0;
  let monthBrl = 0;
  const method = new Map<string, { brl: number; count: number }>();
  const tour = new Map<string, { brl: number; count: number }>();
  const month = new Map<string, number>();

  for (const r of rows) {
    const amt = Number(r.amount_paid_brl ?? 0);
    totalBrl += amt;
    const mk = String(r.created_at).slice(0, 7);
    month.set(mk, (month.get(mk) ?? 0) + amt);
    if (mk === monthKey) monthBrl += amt;

    const m = r.payment_method ?? "unknown";
    const mc = method.get(m) ?? { brl: 0, count: 0 };
    mc.brl += amt;
    mc.count += 1;
    method.set(m, mc);

    const tn =
      r.tours?.title?.en ?? r.tours?.title?.pt ?? "—";
    const tc = tour.get(tn) ?? { brl: 0, count: 0 };
    tc.brl += amt;
    tc.count += 1;
    tour.set(tn, tc);
  }

  return {
    totalBrl,
    monthBrl,
    byMethod: Array.from(method, ([m, v]) => ({ method: m, ...v })),
    byTour: Array.from(tour, ([t, v]) => ({ tour: t, ...v })).sort(
      (a, b) => b.brl - a.brl,
    ),
    byMonth: Array.from(month, ([m, brl]) => ({ month: m, brl })).sort((a, b) =>
      a.month.localeCompare(b.month),
    ),
  };
}

export async function getAdminCities() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("cities")
    .select("*, tours(count)")
    .order("slug");
  return (data ?? []).map((c) => {
    const { tours, ...city } = c as unknown as CityRow & {
      tours: { count: number }[];
    };
    return { ...city, tourCount: tours?.[0]?.count ?? 0 };
  });
}

export async function getAdminCity(id: string): Promise<CityRow | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("cities").select("*").eq("id", id).maybeSingle();
  return (data as CityRow | null) ?? null;
}

export interface AdminTourListItem extends TourRow {
  cityName: LocalizedText | null;
  stopCount: number;
}

export async function getAdminTours(): Promise<AdminTourListItem[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("tours")
    .select("*, cities(name), tour_stops(count)")
    .order("created_at", { ascending: false });
  return (data ?? []).map((row) => {
    const r = row as unknown as TourRow & {
      cities: { name: LocalizedText } | null;
      tour_stops: { count: number }[];
    };
    const { cities, tour_stops, ...tour } = r;
    return {
      ...(tour as TourRow),
      cityName: cities?.name ?? null,
      stopCount: tour_stops?.[0]?.count ?? 0,
    };
  });
}

export type AdminStop = TourStopRow & {
  stop_images: StopImageRow[];
  stop_audios: StopAudioRow[];
};

export interface AdminTourDetail extends TourRow {
  stops: AdminStop[];
}

export async function getAdminTour(id: string): Promise<AdminTourDetail | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("tours")
    .select("*, tour_stops(*, stop_images(*), stop_audios(*))")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const r = data as unknown as TourRow & { tour_stops: AdminStop[] };
  const { tour_stops, ...tour } = r;
  return {
    ...(tour as TourRow),
    stops: [...(tour_stops ?? [])]
      .sort((a, b) => a.order_index - b.order_index)
      .map((s) => ({
        ...s,
        stop_images: [...(s.stop_images ?? [])].sort(
          (a, b) => a.order_index - b.order_index,
        ),
        stop_audios: [...(s.stop_audios ?? [])].sort(
          (a, b) => a.order_index - b.order_index,
        ),
      })),
  };
}

export interface AdminOverview {
  revenueMonthBrl: number;
  revenueMonthCount: number;
  activeTours: number;
  totalUsers: number;
  pendingApprovals: {
    id: string;
    title: LocalizedText;
    city: string | null;
    type: string;
    created_at: string;
  }[];
  recentSignups: { id: string; full_name: string | null; created_at: string }[];
  recentSales: {
    id: string;
    tour: string;
    amount_brl: number | null;
    method: string | null;
    created_at: string;
  }[];
  dailyRevenue: { date: string; brl: number }[];
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const admin = createAdminClient();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const from30 = new Date(now.getTime() - 30 * 864e5).toISOString();

  const [
    { data: monthSales },
    { count: activeTours },
    { count: totalUsers },
    { data: pending },
    { data: signups },
    { data: recent30 },
  ] = await Promise.all([
    admin
      .from("purchases")
      .select("amount_paid_brl")
      .eq("status", "completed")
      .gte("created_at", monthStart),
    admin
      .from("tours")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved")
      .eq("is_active", true),
    admin.from("user_profiles").select("id", { count: "exact", head: true }),
    admin
      .from("tours")
      .select("id, title, type, created_at, cities(name)")
      .eq("status", "pending_approval")
      .order("created_at", { ascending: true })
      .limit(20),
    admin
      .from("user_profiles")
      .select("id, full_name, created_at")
      .order("created_at", { ascending: false })
      .limit(6),
    admin
      .from("purchases")
      .select("id, amount_paid_brl, payment_method, created_at, tours(title)")
      .eq("status", "completed")
      .gte("created_at", from30)
      .order("created_at", { ascending: false }),
  ]);

  const revenueMonthBrl = (monthSales ?? []).reduce(
    (s, p) => s + Number(p.amount_paid_brl ?? 0),
    0,
  );

  const buckets = new Map<string, number>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 864e5).toISOString().slice(0, 10);
    buckets.set(d, 0);
  }
  for (const p of recent30 ?? []) {
    const d = String(p.created_at).slice(0, 10);
    if (buckets.has(d))
      buckets.set(d, buckets.get(d)! + Number(p.amount_paid_brl ?? 0));
  }

  const tName = (v: unknown) =>
    (v as { title?: LocalizedText } | null)?.title?.en ??
    (v as { title?: LocalizedText } | null)?.title?.pt ??
    "—";

  return {
    revenueMonthBrl,
    revenueMonthCount: (monthSales ?? []).length,
    activeTours: activeTours ?? 0,
    totalUsers: totalUsers ?? 0,
    pendingApprovals: (pending ?? []).map((t) => ({
      id: t.id,
      title: t.title as LocalizedText,
      city:
        ((t.cities as { name?: LocalizedText } | null)?.name?.en ??
          (t.cities as { name?: LocalizedText } | null)?.name?.pt) ||
        null,
      type: t.type,
      created_at: t.created_at,
    })),
    recentSignups: (signups ?? []) as AdminOverview["recentSignups"],
    recentSales: (recent30 ?? []).slice(0, 8).map((p) => ({
      id: p.id,
      tour: tName(p.tours),
      amount_brl: p.amount_paid_brl,
      method: p.payment_method,
      created_at: p.created_at,
    })),
    dailyRevenue: Array.from(buckets, ([date, brl]) => ({ date, brl })),
  };
}
