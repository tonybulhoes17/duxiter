import { cn } from "@/lib/utils";

/**
 * Duxiter mark — a location pin wearing headphones, with sound waves.
 * Pin is brand red; the headphones + waves use `currentColor` so the
 * caller controls them per theme (navy on light, light-navy on dark).
 */
export function DuxiterMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("h-8 w-8 text-secondary", className)}
      role="img"
      aria-label="Duxiter"
    >
      {/* sound waves */}
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.9"
      >
        <path d="M12 22c-3 4-3 12 0 16" />
        <path d="M6 17c-5 7-5 21 0 28" />
        <path d="M52 22c3 4 3 12 0 16" />
        <path d="M58 17c5 7 5 21 0 28" />
      </g>

      {/* pin */}
      <path
        d="M32 6c-9.4 0-17 7.4-17 16.6 0 11.6 13.9 24.9 16.1 26.9a1.4 1.4 0 0 0 1.8 0C37.1 47.5 51 34.2 51 22.6 51 13.4 43.4 6 32 6Z"
        fill="var(--color-primary)"
      />
      <circle cx="32" cy="22" r="6.5" fill="var(--bg-card)" />

      {/* headphone band + cups */}
      <path
        d="M18 24a14 14 0 0 1 28 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <rect x="14.5" y="22" width="7" height="11" rx="3.5" fill="currentColor" />
      <rect x="42.5" y="22" width="7" height="11" rx="3.5" fill="currentColor" />
    </svg>
  );
}

export function DuxiterLogo({
  className,
  showWordmark = true,
}: {
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <DuxiterMark />
      {showWordmark && (
        <span className="font-display text-xl font-extrabold tracking-tight text-text-primary">
          Duxiter
        </span>
      )}
    </span>
  );
}
