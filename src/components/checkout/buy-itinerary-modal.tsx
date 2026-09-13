"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { CreditCard, Loader2, Lock, QrCode } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { publicEnv } from "@/lib/env";
import { cn } from "@/lib/utils";

type Method = "both" | "card" | "pix";

export function BuyItineraryModal({
  itineraryId,
  priceLabel,
  triggerLabel,
  triggerClassName,
}: {
  itineraryId: string;
  priceLabel: string;
  triggerLabel: string;
  triggerClassName?: string;
}) {
  const t = useTranslations("checkout");
  const ti = useTranslations("itinerary");

  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<Method>("both");
  const [paying, setPaying] = useState(false);

  async function pay() {
    setPaying(true);
    try {
      const res = await fetch(`/api/itinerary/${itineraryId}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: !publicEnv.pixEnabled
            ? "card"
            : method === "both"
              ? undefined
              : method,
        }),
      });
      const data = await res.json();
      if (res.status === 409) {
        toast.error(t("alreadyOwned"));
        window.location.reload();
        return;
      }
      if (data?.error === "pix_unavailable") {
        toast.error(t("pixUnavailable"));
        setMethod("card");
        setPaying(false);
        return;
      }
      if (!res.ok || !data.url) throw new Error();
      window.location.href = data.url;
    } catch {
      setPaying(false);
      toast.error(t("error"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className={triggerClassName}>
          <Lock className="size-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{ti("unlockTitle")}</DialogTitle>
          <DialogDescription>{ti("unlockSubtitle")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-md border border-border bg-elevated p-3">
            <span className="text-sm text-text-secondary">{t("total")}</span>
            <span className="font-metric text-lg font-semibold">{priceLabel}</span>
          </div>
          <p className="text-[11px] text-text-muted">{t("chargedInBrl")}</p>

          {publicEnv.pixEnabled && (
            <div>
              <p className="mb-2 text-sm text-text-secondary">{t("method")}</p>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    ["both", null, t("methodBoth")],
                    ["card", CreditCard, t("card")],
                    ["pix", QrCode, t("pix")],
                  ] as const
                ).map(([value, Icon, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setMethod(value)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-md border py-2.5 text-xs font-medium transition-colors",
                      method === value
                        ? "border-primary bg-primary/10 text-text-primary"
                        : "border-border text-text-secondary hover:border-white/20",
                    )}
                  >
                    {Icon && <Icon className="size-4" />}
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Button size="lg" className="w-full" onClick={pay} disabled={paying}>
            {paying ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {t("processing")}
              </>
            ) : (
              t("pay")
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
