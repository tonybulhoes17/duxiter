"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Lock, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BuyTourModal } from "@/components/checkout/buy-tour-modal";
import type { AccessState } from "@/lib/access";

export function TourCta({
  tourId,
  access,
  priceLabel,
  basePriceUsd,
  isAuthed,
}: {
  tourId: string;
  access: AccessState;
  priceLabel: string;
  basePriceUsd: number;
  isAuthed: boolean;
}) {
  const t = useTranslations("tour");

  if (access === "free" || access === "purchased") {
    return (
      <Button asChild size="lg" className="w-full sm:w-auto">
        <Link href={`/tours/${tourId}/play`}>
          <Play className="size-4" />
          {t("start")}
        </Link>
      </Button>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto">
      {access === "expired" && (
        <p className="text-sm text-warning">{t("accessExpired")}</p>
      )}
      {isAuthed ? (
        <BuyTourModal
          tourId={tourId}
          basePriceUsd={basePriceUsd}
          triggerLabel={t("buyFor", { price: priceLabel })}
          triggerClassName="w-full sm:w-auto"
        />
      ) : (
        <Button asChild size="lg" className="w-full sm:w-auto">
          <Link href={`/login?next=/tours/${tourId}`}>
            <Lock className="size-4" />
            {t("buyFor", { price: priceLabel })}
          </Link>
        </Button>
      )}
    </div>
  );
}
