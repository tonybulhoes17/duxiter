import { Star } from "lucide-react";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/config";

function initials(name: string | null): string {
  if (!name) return "🙂";
  return name
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function ReviewCard({
  author,
  rating,
  comment,
  createdAt,
  locale,
}: {
  author: string | null;
  rating: number;
  comment: string | null;
  createdAt: string;
  locale: Locale;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-full bg-subtle text-xs font-semibold text-text-secondary">
          {initials(author)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-text-primary">
            {author ?? "Traveler"}
          </p>
          <p className="font-metric text-xs text-text-muted">
            {formatDate(createdAt, locale)}
          </p>
        </div>
        <div className="ml-auto flex gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={cn(
                "size-3.5",
                i < rating
                  ? "fill-warning text-warning"
                  : "fill-subtle text-subtle",
              )}
            />
          ))}
        </div>
      </div>
      {comment && (
        <p className="mt-3 whitespace-pre-line text-sm text-text-secondary">
          {comment}
        </p>
      )}
    </div>
  );
}
