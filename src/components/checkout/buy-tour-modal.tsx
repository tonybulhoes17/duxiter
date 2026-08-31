"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { CreditCard, Loader2, Lock, QrCode, Tag } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatBrl, formatPrice } from "@/lib/format";
import { publicEnv } from "@/lib/env";
import type { Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

interface Quote {
  basePriceUsd: number;
  discountUsd: number;
  finalPriceUsd: number;
  finalPriceBrl: number;
  basePriceBrl: number;
  fxRate: number;
  code: { code: string; label: string | null } | null;
  codeError:
    | "not_found"
    | "inactive"
    | "expired"
    | "max_uses"
    | "wrong_tour"
    | null;
}

type Method = "both" | "card" | "pix";

const CODE_ERR: Record<string, string> = {
  not_found: "codeInvalid",
  inactive: "codeInvalid",
  expired: "codeExpired",
  max_uses: "codeMaxed",
  wrong_tour: "codeWrongTour",
};

export function BuyTourModal({
  tourId,
  basePriceUsd,
  triggerLabel,
  triggerClassName,
}: {
  tourId: string;
  basePriceUsd: number;
  triggerLabel: string;
  triggerClassName?: string;
}) {
  const t = useTranslations("checkout");
  const locale = useLocale() as Locale;
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [validating, setValidating] = useState(false);
  const [method, setMethod] = useState<Method>("both");
  const [paying, setPaying] = useState(false);

  const fetchQuote = useCallback(
    async (code?: string | null) => {
      setValidating(true);
      try {
        const res = await fetch("/api/payments/validate-code", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tourId, code: code ?? undefined }),
        });
        if (!res.ok) throw new Error();
        const data: Quote = await res.json();
        setQuote(data);
        if (code) {
          if (data.codeError) {
            toast.error(t(CODE_ERR[data.codeError] ?? "codeInvalid"));
            setAppliedCode(null);
          } else {
            setAppliedCode(data.code?.code ?? code);
            toast.success(t("codeApplied"));
          }
        }
      } catch {
        toast.error(t("error"));
      } finally {
        setValidating(false);
      }
    },
    [tourId, t],
  );

  useEffect(() => {
    if (open && !quote) fetchQuote(null);
  }, [open, quote, fetchQuote]);

  async function pay() {
    setPaying(true);
    try {
      const res = await fetch("/api/payments/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tourId,
          code: appliedCode ?? undefined,
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
        router.refresh();
        return;
      }
      if (data?.error === "pix_unavailable") {
        toast.error(t("pixUnavailable"));
        setMethod("card");
        setPaying(false);
        return;
      }
      if (!res.ok) throw new Error(data?.error);
      if (data.free) {
        toast.success(t("codeApplied"));
        router.refresh();
        router.push(`/tours/${tourId}/play`);
        return;
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      throw new Error("no_url");
    } catch {
      setPaying(false);
      toast.error(t("error"));
    }
  }

  const finalUsd = quote?.finalPriceUsd ?? basePriceUsd;
  const isFree = finalUsd <= 0;

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
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("subtitle")}</DialogDescription>
        </DialogHeader>

        {!quote ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-6 animate-spin text-text-muted" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Price breakdown */}
            <div className="space-y-1.5 rounded-md border border-border bg-elevated p-3 text-sm">
              <div className="flex justify-between text-text-secondary">
                <span>{t("priceRef")}</span>
                <span className="font-metric">
                  {formatPrice(quote.basePriceUsd, locale)}
                </span>
              </div>
              {quote.discountUsd > 0 && (
                <div className="flex justify-between text-success">
                  <span>{t("discount")}</span>
                  <span className="font-metric">
                    −{formatBrl(quote.basePriceBrl - quote.finalPriceBrl, locale)}
                  </span>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-1.5 text-base font-semibold text-text-primary">
                <span>{t("total")}</span>
                <span className="font-metric">
                  {isFree ? "—" : formatBrl(quote.finalPriceBrl, locale)}
                </span>
              </div>
              <p className="pt-1 text-[11px] text-text-muted">
                {t("chargedInBrl")}
              </p>
            </div>

            {/* Discount code */}
            {appliedCode ? (
              <div className="flex items-center justify-between rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm">
                <span className="flex items-center gap-1.5 text-success">
                  <Tag className="size-3.5" />
                  {appliedCode}
                </span>
                <button
                  type="button"
                  className="text-xs text-text-secondary underline"
                  onClick={() => {
                    setAppliedCode(null);
                    setCodeInput("");
                    fetchQuote(null);
                  }}
                >
                  {t("remove")}
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                  placeholder={t("discountCode")}
                  className="uppercase"
                />
                <Button
                  variant="outline"
                  onClick={() => fetchQuote(codeInput)}
                  disabled={!codeInput || validating}
                >
                  {validating ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    t("apply")
                  )}
                </Button>
              </div>
            )}

            {/* Payment method */}
            {!isFree && publicEnv.pixEnabled && (
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

            <Button
              size="lg"
              className="w-full"
              onClick={pay}
              disabled={paying || validating}
            >
              {paying ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {t("processing")}
                </>
              ) : isFree ? (
                t("payFree")
              ) : (
                t("pay")
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
