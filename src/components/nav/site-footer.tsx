import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ContactDialog } from "@/components/contact/contact-dialog";

export async function SiteFooter() {
  const t = await getTranslations("footer");

  return (
    <footer className="border-t border-border py-6">
      <div className="container flex flex-col items-center justify-between gap-3 text-center sm:flex-row sm:text-left">
        <p className="text-xs text-text-muted">{t("rights")}</p>
        <div className="flex items-center gap-4">
          <Link
            href="/termos"
            className="text-xs text-text-muted hover:text-text-secondary"
          >
            {t("terms")}
          </Link>
          <ContactDialog />
        </div>
      </div>
    </footer>
  );
}
