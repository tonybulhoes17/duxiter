import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getAdminCities } from "@/lib/admin-queries";
import { getLocalizedText } from "@/i18n/config";

export default async function AdminCitiesPage() {
  const cities = await getAdminCities();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Cities</h1>
        <Button asChild size="sm">
          <Link href="/admin/cities/new">
            <Plus className="size-4" />
            Add city
          </Link>
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-card text-left text-xs text-text-muted">
            <tr>
              <th className="p-3 font-medium">Name</th>
              <th className="p-3 font-medium">Slug</th>
              <th className="p-3 font-medium">Country</th>
              <th className="p-3 font-medium">Tours</th>
              <th className="p-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {cities.map((c) => (
              <tr key={c.id} className="bg-card/50 hover:bg-card">
                <td className="p-3">
                  <Link
                    href={`/admin/cities/${c.id}/edit`}
                    className="font-medium hover:underline"
                  >
                    {getLocalizedText(c.name, "en")}
                  </Link>
                </td>
                <td className="p-3 font-metric text-text-muted">{c.slug}</td>
                <td className="p-3 text-text-secondary">{c.country ?? "—"}</td>
                <td className="p-3 font-metric">{c.tourCount}</td>
                <td className="p-3">
                  <Badge variant={c.is_active ? "success" : "default"}>
                    {c.is_active ? "Active" : "Hidden"}
                  </Badge>
                </td>
              </tr>
            ))}
            {cities.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-text-muted">
                  No cities yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
