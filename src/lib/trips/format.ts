export function formatMoney(
  amount: number,
  currency: string,
  locale = "pt-BR",
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function formatDate(iso: string, locale = "pt-BR"): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(iso + (iso.length === 10 ? "T12:00:00" : "")));
  } catch {
    return iso;
  }
}

const LOCALE_MAP: Record<string, string> = {
  pt: "pt-BR",
  en: "en-US",
  es: "es-ES",
};
export const intlLocale = (l: string) => LOCALE_MAP[l] ?? "pt-BR";
