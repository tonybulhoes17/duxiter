import { getTranslations } from "next-intl/server";
import { ContactDialog } from "@/components/contact/contact-dialog";

export async function SiteFooter() {
  const t = await getTranslations("footer");

  return (
    <footer className="border-t border-border py-6">
      <div className="container flex flex-col items-center justify-between gap-2 text-center sm:flex-row sm:text-left">
        <p className="text-xs text-text-muted">{t("rights")}</p>
        <ContactDialog />
      </div>
    </footer>
  );
}
