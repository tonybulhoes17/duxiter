import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LogOut, User } from "lucide-react";
import { DuxiterLogo } from "@/components/brand/logo";
import { LanguageSwitcher } from "@/components/nav/language-switcher";
import { NavLink } from "@/components/nav/nav-link";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth";
import { signOut } from "@/lib/actions/auth";

export async function SiteHeader() {
  const t = await getTranslations("nav");
  const user = await getSessionUser();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-overlay backdrop-blur-lg safe-top">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link href="/" className="shrink-0">
          <DuxiterLogo />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <NavLink href="/cities">{t("cities")}</NavLink>
          <NavLink href="/identify">{t("identify")}</NavLink>
          <NavLink href="/itinerary/generate">{t("itinerary")}</NavLink>
          {user?.isAdmin && <NavLink href="/admin">Admin</NavLink>}
        </nav>

        <div className="flex items-center gap-1">
          <LanguageSwitcher />
          {user ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/profile">
                  <User className="size-4" />
                  <span className="hidden sm:inline">{t("profile")}</span>
                </Link>
              </Button>
              <form action={signOut}>
                <Button variant="ghost" size="icon" type="submit" aria-label={t("logout")}>
                  <LogOut className="size-4" />
                </Button>
              </form>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">{t("login")}</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/signup">{t("signup")}</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
