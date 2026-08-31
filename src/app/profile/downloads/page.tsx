import Link from "next/link";
import { redirect } from "next/navigation";
import { Download } from "lucide-react";
import { getSessionUser } from "@/lib/auth";

export const metadata = { title: "Downloads" };

export default async function DownloadsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/profile/downloads");

  return (
    <div className="container py-8 md:py-12">
      <h1 className="flex items-center gap-2 font-display text-2xl font-bold">
        <Download className="size-6 text-primary" />
        Offline downloads
      </h1>
      <p className="mt-3 max-w-md text-sm text-text-secondary">
        Offline caching (tour data, images and audio stored on your device)
        arrives in the PWA milestone. Downloaded tours will be listed here with
        their size and date.
      </p>
      <Link
        href="/profile"
        className="mt-6 inline-block text-sm text-text-secondary underline underline-offset-4"
      >
        ← Back to profile
      </Link>
    </div>
  );
}
