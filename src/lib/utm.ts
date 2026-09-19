const STORAGE_KEY = "duxiter_utm";

export type StoredUtm = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
};

/** Reads utm_* from the current URL and stores them, first-touch only. */
export function captureUtmFromUrl(search: string): void {
  if (typeof window === "undefined") return;
  try {
    if (window.localStorage.getItem(STORAGE_KEY)) return; // first touch wins
    const params = new URLSearchParams(search);
    const source = params.get("utm_source");
    if (!source) return;
    const utm: StoredUtm = {
      utm_source: source,
      utm_medium: params.get("utm_medium") ?? undefined,
      utm_campaign: params.get("utm_campaign") ?? undefined,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(utm));
  } catch {
    /* attribution must never break the app */
  }
}

export function getStoredUtm(): StoredUtm | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredUtm) : null;
  } catch {
    return null;
  }
}
