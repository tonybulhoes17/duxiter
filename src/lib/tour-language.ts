export const TOUR_LANGUAGES = [
  { code: "pt", label: "Português", flag: "🇧🇷" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "hi", label: "हिन्दी", flag: "🇮🇳" },
] as const;

export type TourLanguageCode = (typeof TOUR_LANGUAGES)[number]["code"];

// Falls back to Portuguese for tours saved before the `language` column
// existed (or before a migration has run), rather than crashing on
// null/undefined.
export function getTourLanguageLabel(code: string | null | undefined): string {
  const c = code || "pt";
  return TOUR_LANGUAGES.find((l) => l.code === c)?.label ?? c.toUpperCase();
}

export function getTourLanguageFlag(code: string | null | undefined): string {
  const c = code || "pt";
  return TOUR_LANGUAGES.find((l) => l.code === c)?.flag ?? "🌐";
}
