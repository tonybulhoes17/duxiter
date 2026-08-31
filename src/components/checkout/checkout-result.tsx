"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

/**
 * Reads ?checkout=success|cancelled on the tour page after returning from
 * Stripe. On success it refreshes server data a few times (so the webhook
 * has time to land) then sends the user into the player.
 */
export function CheckoutResult({ tourId }: { tourId: string }) {
  const t = useTranslations("checkout");
  const router = useRouter();
  const params = useSearchParams();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    const status = params.get("checkout");
    if (!status) return;
    handled.current = true;

    const clean = `/tours/${tourId}`;

    if (status === "cancelled") {
      toast.info(t("cancelled"));
      router.replace(clean);
      return;
    }

    if (status === "success") {
      toast.success(t("successTitle"), { description: t("successBody") });
      let tries = 0;
      const tick = () => {
        tries += 1;
        router.refresh();
        if (tries < 4) {
          setTimeout(tick, 2000);
        } else {
          // Access should be granted by now — take them to the tour.
          router.replace(`/tours/${tourId}/play`);
        }
      };
      setTimeout(tick, 1200);
    }
  }, [params, router, t, tourId]);

  return null;
}
