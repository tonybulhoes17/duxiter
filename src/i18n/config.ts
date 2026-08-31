export const locales = ["pt", "en", "es"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";
export const LOCALE_COOKIE = "DUXITER_LOCALE";

export const localeLabels: Record<Locale, { label: string; flag: string; native: string }> = {
  pt: { label: "Portuguese", flag: "🇧🇷", native: "Português" },
  en: { label: "English", flag: "🇬🇧", native: "English" },
  es: { label: "Spanish", flag: "🇪🇸", native: "Español" },
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}

/**
 * Localized content stored in JSONB columns: {"pt": "...", "en": "...", "es": "..."}.
 * Falls back through PT -> EN -> first available value.
 */
export type LocalizedText = Partial<Record<Locale, string>> & Record<string, string>;

export function getLocalizedText(
  field: LocalizedText | null | undefined,
  lang: string,
): string {
  if (!field) return "";
  return (
    field[lang] ??
    field["pt"] ??
    field["en"] ??
    Object.values(field)[0] ??
    ""
  );
}
