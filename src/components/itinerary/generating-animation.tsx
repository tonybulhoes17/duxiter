"use client";

import { useTranslations } from "next-intl";
import { DuxiterMark } from "@/components/brand/logo";

export function GeneratingAnimation() {
  const t = useTranslations("itinerary");
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 text-center">
      <div className="relative">
        <span className="absolute inset-0 animate-ping rounded-full bg-primary/25" />
        <DuxiterMark className="relative size-14 animate-pulse-pin text-secondary" />
      </div>
      <div>
        <p className="font-heading text-lg font-semibold">{t("generating")}</p>
        <p className="mt-1 text-sm text-text-secondary">{t("generatingHint")}</p>
      </div>
    </div>
  );
}
