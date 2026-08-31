import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSessionUser } from "@/lib/auth";
import { IdentifyClient } from "@/components/player/identify-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("camera");
  return { title: t("streetTitle") };
}

export default async function IdentifyPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/identify");
  return <IdentifyClient />;
}
