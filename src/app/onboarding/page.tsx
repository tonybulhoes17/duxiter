import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { LanguageChooser } from "@/components/auth/language-chooser";
import { getSessionUser } from "@/lib/auth";
import type { Locale } from "@/i18n/config";

export const metadata = { title: "Welcome" };

export default async function OnboardingPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/onboarding");
  if (user.profile?.onboarded_at) redirect("/cities");

  const locale = (await getLocale()) as Locale;

  return (
    <div className="container flex min-h-[calc(100dvh-8rem)] items-center justify-center py-10">
      <Suspense>
        <LanguageChooser initial={user.profile?.preferred_language ?? locale} />
      </Suspense>
    </div>
  );
}
