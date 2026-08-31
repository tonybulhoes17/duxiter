"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Camera, Compass, Map, Sparkles, User } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/cities", key: "cities", icon: Compass },
  { href: "/identify", key: "identify", icon: Camera },
  { href: "/itinerary/generate", key: "itinerary", icon: Sparkles },
  { href: "/profile", key: "profile", icon: User },
] as const;

export function MobileNav({ authed }: { authed: boolean }) {
  const pathname = usePathname();
  const t = useTranslations("nav");

  // Hide on immersive player routes
  if (pathname.includes("/play")) {
    return null;
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-overlay backdrop-blur-lg safe-bottom md:hidden">
      <ul className="flex items-stretch">
        <li className="flex-1">
          <Link
            href="/"
            className={cn(
              "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium",
              pathname === "/" ? "text-primary" : "text-text-muted",
            )}
          >
            <Map className="size-5" />
            {t("explore")}
          </Link>
        </li>
        {items.map(({ href, key, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          const target = key === "profile" && !authed ? "/login" : href;
          return (
            <li key={href} className="flex-1">
              <Link
                href={target}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium",
                  active ? "text-primary" : "text-text-muted",
                )}
              >
                <Icon className="size-5" />
                {t(key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
