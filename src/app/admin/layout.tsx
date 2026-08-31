import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdmin } from "@/lib/admin";

export const metadata: Metadata = {
  title: { absolute: "Admin · Duxiter" },
  robots: { index: false },
};

// Admin data must always be fresh — never serve a cached render.
export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  return <AdminShell>{children}</AdminShell>;
}
