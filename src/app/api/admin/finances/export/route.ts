import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLocalizedText } from "@/i18n/config";
import type { LocalizedText } from "@/i18n/config";

function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  const denied = await assertAdmin();
  if (denied) return denied;

  const admin = createAdminClient();
  const { data } = await admin
    .from("purchases")
    .select(
      "created_at, status, payment_method, amount_paid_usd, amount_paid_brl, fx_rate_used, discount_amount_usd, tours(title)",
    )
    .order("created_at", { ascending: false });

  const header = [
    "date",
    "status",
    "method",
    "tour",
    "amount_usd",
    "amount_brl",
    "fx_rate",
    "discount_usd",
  ];
  const lines = [header.join(",")];
  for (const r of (data ?? []) as unknown as {
    created_at: string;
    status: string;
    payment_method: string | null;
    amount_paid_usd: number | null;
    amount_paid_brl: number | null;
    fx_rate_used: number | null;
    discount_amount_usd: number | null;
    tours: { title: LocalizedText } | null;
  }[]) {
    lines.push(
      [
        r.created_at,
        r.status,
        r.payment_method ?? "",
        getLocalizedText(r.tours?.title, "en"),
        r.amount_paid_usd ?? "",
        r.amount_paid_brl ?? "",
        r.fx_rate_used ?? "",
        r.discount_amount_usd ?? "",
      ]
        .map(csvCell)
        .join(","),
    );
  }

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="duxiter-sales-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
