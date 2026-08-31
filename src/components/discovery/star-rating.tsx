import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function StarRating({
  value,
  count,
  size = "sm",
  showCount = true,
  className,
}: {
  value: number;
  count?: number;
  size?: "sm" | "md";
  showCount?: boolean;
  className?: string;
}) {
  const px = size === "md" ? "size-4" : "size-3.5";

  if (!value && !count) {
    return (
      <span className={cn("text-xs text-text-muted", className)}>—</span>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <Star className={cn(px, "fill-warning text-warning")} />
      <span className="font-metric text-xs font-medium text-text-primary">
        {value.toFixed(1)}
      </span>
      {showCount && count !== undefined && (
        <span className="font-metric text-xs text-text-muted">
          ({count})
        </span>
      )}
    </span>
  );
}
