import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getAdminTours } from "@/lib/admin-queries";
import { getLocalizedText } from "@/i18n/config";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

const STATUS_VARIANT: Record<
  string,
  "success" | "default" | "primary" | "locked"
> = {
  approved: "success",
  draft: "default",
  pending_approval: "primary",
  rejected: "locked",
};

export default async function AdminToursPage() {
  const tours = await getAdminTours();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Tours</h1>
        <Button asChild size="sm">
          <Link href="/admin/tours/new">
            <Plus className="size-4" />
            New tour
          </Link>
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-card text-left text-xs text-text-muted">
            <tr>
              <th className="p-3 font-medium">Title</th>
              <th className="p-3 font-medium">City</th>
              <th className="p-3 font-medium">Type</th>
              <th className="p-3 font-medium">Stops</th>
              <th className="p-3 font-medium">Price</th>
              <th className="p-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {tours.map((t) => (
              <tr
                key={t.id}
                className={cn(
                  "bg-card/50 hover:bg-card",
                  t.status === "pending_approval" && "bg-primary/5",
                )}
              >
                <td className="p-3">
                  <Link
                    href={`/admin/tours/${t.id}/edit`}
                    className="font-medium hover:underline"
                  >
                    {getLocalizedText(t.title, "en")}
                  </Link>
                </td>
                <td className="p-3 text-text-secondary">
                  {t.cityName ? getLocalizedText(t.cityName, "en") : "—"}
                </td>
                <td className="p-3 capitalize text-text-secondary">{t.type}</td>
                <td className="p-3">
                  <Link
                    href={`/admin/tours/${t.id}/stops`}
                    className="font-metric text-text-secondary hover:underline"
                  >
                    {t.stopCount}
                  </Link>
                </td>
                <td className="p-3 font-metric">
                  {Number(t.price_usd) === 0
                    ? "Free"
                    : formatPrice(Number(t.price_usd), "en")}
                </td>
                <td className="p-3">
                  <Badge variant={STATUS_VARIANT[t.status] ?? "default"}>
                    {t.status.replace("_", " ")}
                  </Badge>
                </td>
              </tr>
            ))}
            {tours.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-text-muted">
                  No tours yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
