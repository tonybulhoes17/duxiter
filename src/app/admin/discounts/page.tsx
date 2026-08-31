import { DiscountsManager } from "@/components/admin/discounts-manager";
import { getAdminDiscounts } from "@/lib/admin-queries";

export default async function AdminDiscountsPage() {
  const codes = await getAdminDiscounts();
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Discount codes</h1>
      <DiscountsManager codes={codes} />
    </div>
  );
}
