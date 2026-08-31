"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BuyTourModal } from "@/components/checkout/buy-tour-modal";

export function PaywallOverlay({
  tourId,
  priceLabel,
  basePriceUsd,
  isAuthed,
  expired,
}: {
  tourId: string;
  priceLabel: string;
  basePriceUsd: number;
  isAuthed: boolean;
  expired?: boolean;
}) {
  const t = useTranslations("tour");

  return (
    <div className="flex flex-col items-center gap-3 rounded-md border border-border bg-card px-6 py-10 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-locked/20 text-locked">
        <Lock className="size-6" />
      </div>
      <p className="font-heading text-base font-semibold text-text-primary">
        {expired ? t("accessExpired") : t("locked")}
      </p>
      {isAuthed ? (
        <BuyTourModal
          tourId={tourId}
          basePriceUsd={basePriceUsd}
          triggerLabel={t("unlockCta", { price: priceLabel })}
        />
      ) : (
        <Button asChild>
          <Link href={`/login?next=/tours/${tourId}/play`}>
            {t("unlockCta", { price: priceLabel })}
          </Link>
        </Button>
      )}
    </div>
  );
}
