import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthForm } from "@/components/auth/auth-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("loginTitle") };
}

export default function LoginPage() {
  return (
    <div className="container flex min-h-[calc(100dvh-8rem)] items-center justify-center py-10">
      <Suspense>
        <AuthForm mode="login" />
      </Suspense>
    </div>
  );
}
