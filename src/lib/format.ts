import type { Locale } from "@/i18n/config";

const localeTag: Record<Locale, string> = {
  pt: "pt-BR",
  en: "en-US",
  es: "es-ES",
};

export function formatPrice(usd: number, locale: Locale): string {
  return new Intl.NumberFormat(localeTag[locale], {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(usd);
}

export function formatBrl(brl: number, locale: Locale = "pt"): string {
  return new Intl.NumberFormat(localeTag[locale], {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(brl);
}

export function formatDate(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(localeTag[locale], {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

/** 15% preview rule — number of stops accessible without purchase. */
export function freeStopsCount(totalStops: number): number {
  return Math.max(1, Math.ceil(totalStops * 0.15));
}

/** Seconds -> "m:ss" (or "h:mm:ss"). */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return `${h > 0 ? h + ":" : ""}${mm}:${String(sec).padStart(2, "0")}`;
}

export interface RatingStats {
  average: number;
  count: number;
}

export function ratingStats(
  ratings: { rating: number }[] | null | undefined,
): RatingStats {
  if (!ratings || ratings.length === 0) return { average: 0, count: 0 };
  const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
  return {
    average: Math.round((sum / ratings.length) * 10) / 10,
    count: ratings.length,
  };
}
