import { Badge } from "@/components/ui/badge";
import { BanToggle } from "@/components/admin/user-row-actions";
import { getAdminUsers } from "@/lib/admin-queries";
import { formatBrl, formatDate } from "@/lib/format";

export default async function AdminUsersPage() {
  const users = await getAdminUsers();

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Users</h1>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-card text-left text-xs text-text-muted">
            <tr>
              <th className="p-3 font-medium">Name</th>
              <th className="p-3 font-medium">Joined</th>
              <th className="p-3 font-medium">Purchases</th>
              <th className="p-3 font-medium">Spent</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((u) => (
              <tr key={u.id} className="bg-card/50">
                <td className="p-3 font-medium">{u.full_name ?? "Traveler"}</td>
                <td className="p-3 text-text-secondary">
                  {formatDate(u.created_at, "en")}
                </td>
                <td className="p-3 font-metric">{u.purchaseCount}</td>
                <td className="p-3 font-metric text-text-secondary">
                  {u.totalSpentBrl > 0 ? formatBrl(u.totalSpentBrl) : "—"}
                </td>
                <td className="p-3">
                  {u.is_banned ? (
                    <Badge variant="locked">Banned</Badge>
                  ) : (
                    <Badge variant="success">Active</Badge>
                  )}
                </td>
                <td className="p-3 text-right">
                  <BanToggle userId={u.id} banned={u.is_banned} />
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-text-muted">
                  No users yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
