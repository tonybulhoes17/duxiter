import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSessionUser } from "@/lib/auth";
import { NewTripForm } from "@/components/trips/new-trip-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("trip");
  return { title: t("new") };
}

export default async function NewTripPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/trips/new");

  const you =
    user.profile?.full_name?.trim().split(/\s+/)[0] || user.email?.split("@")[0] || "";

  return (
    <div className="container max-w-lg py-8 md:py-12">
      <NewTripForm defaultYou={you} />
    </div>
  );
}
