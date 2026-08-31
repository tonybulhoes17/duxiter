"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgePercent,
  BarChart3,
  LayoutDashboard,
  MapPin,
  Menu,
  Route,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useState } from "react";
import { DuxiterMark } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/tours", label: "Tours", icon: Route },
  { href: "/admin/cities", label: "Cities", icon: MapPin },
  { href: "/admin/discounts", label: "Discounts", icon: BadgePercent },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/finances", label: "Finances", icon: Wallet },
] as const;

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const items = (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => {
        const { href, label, icon: Icon } = item;
        const exact = "exact" in item && item.exact;
        const active = exact
          ? pathname === href
          : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary/15 text-text-primary"
                : "text-text-secondary hover:bg-subtle hover:text-text-primary",
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[240px_1fr]">
      {/* Desktop sidebar */}
      <aside className="hidden border-r border-border bg-card p-4 md:flex md:flex-col md:gap-6">
        <Link href="/admin" className="flex items-center gap-2">
          <DuxiterMark className="size-7" />
          <span className="font-display text-lg font-extrabold">Duxiter</span>
          <span className="rounded bg-subtle px-1.5 py-0.5 text-[10px] font-semibold text-text-muted">
            ADMIN
          </span>
        </Link>
        {items}
        <Link
          href="/"
          className="mt-auto text-xs text-text-muted hover:text-text-primary"
        >
          ← Back to site
        </Link>
      </aside>

      {/* Mobile header + drawer */}
      <div className="flex items-center justify-between border-b border-border bg-card p-3 md:hidden">
        <Link href="/admin" className="flex items-center gap-2">
          <DuxiterMark className="size-6" />
          <span className="font-display font-extrabold">Admin</span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
          className="rounded-md p-2 hover:bg-subtle"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      {open && (
        <div className="border-b border-border bg-card p-3 md:hidden">{items}</div>
      )}

      <main className="min-w-0 p-4 md:p-8">{children}</main>
    </div>
  );
}
