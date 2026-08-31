"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReviewCard } from "@/components/discovery/review-card";
import { StarRating } from "@/components/discovery/star-rating";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/config";

export interface ReviewItem {
  id: string;
  user_id: string;
  author: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
}

export function ReviewsSection({
  tourId,
  reviews,
  ratingAvg,
  ratingCount,
  locale,
  currentUserId,
  isAdmin,
  canReview,
}: {
  tourId: string;
  reviews: ReviewItem[];
  ratingAvg: number;
  ratingCount: number;
  locale: Locale;
  currentUserId: string | null;
  isAdmin: boolean;
  canReview: boolean;
}) {
  const t = useTranslations("tour");
  const router = useRouter();

  const mine = currentUserId
    ? reviews.find((r) => r.user_id === currentUserId)
    : undefined;

  const [sort, setSort] = useState<"recent" | "rating">("recent");
  const [rating, setRating] = useState(mine?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState(mine?.comment ?? "");
  const [editing, setEditing] = useState(!mine);
  const [busy, setBusy] = useState(false);

  const sorted = useMemo(() => {
    const arr = [...reviews];
    if (sort === "rating") arr.sort((a, b) => b.rating - a.rating);
    else
      arr.sort(
        (a, b) => +new Date(b.created_at) - +new Date(a.created_at),
      );
    return arr;
  }, [reviews, sort]);

  async function submit() {
    if (!(rating >= 1)) return toast.error(t("pickRating"));
    setBusy(true);
    const res = await fetch(`/api/tours/${tourId}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, comment }),
    });
    setBusy(false);
    if (!res.ok) {
      toast.error(t("reviewFailed"));
      return;
    }
    toast.success(t("reviewThanks"));
    setEditing(false);
    router.refresh();
  }

  async function del(id: string) {
    if (!confirm("Hide this review?")) return;
    const res = await fetch(`/api/reviews/${id}`, { method: "DELETE" });
    if (!res.ok) return toast.error("Failed.");
    toast.success("Hidden");
    router.refresh();
  }

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold">
          {t("reviewsTitle")}{" "}
          <span className="font-metric text-base font-normal text-text-muted">
            · {t("reviews", { count: ratingCount })}
          </span>
        </h2>
        {ratingCount > 0 && (
          <div className="flex items-center gap-3">
            <StarRating value={ratingAvg} count={ratingCount} size="md" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as "recent" | "rating")}
              className="rounded-md border border-border bg-elevated px-2 py-1 text-xs"
            >
              <option value="recent">{t("sortRecent")}</option>
              <option value="rating">{t("sortRating")}</option>
            </select>
          </div>
        )}
      </div>

      {/* Write / edit */}
      {canReview && (
        <div className="mt-4 rounded-lg border border-border bg-card p-4">
          {mine && !editing ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{t("yourReview")}</p>
                <StarRating value={mine.rating} showCount={false} />
              </div>
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                {t("editReview")}
              </Button>
            </div>
          ) : (
            <>
              <p className="text-sm font-medium">
                {mine ? t("editReview") : t("writeReview")}
              </p>
              <div className="mt-2 flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onMouseEnter={() => setHover(n)}
                    onMouseLeave={() => setHover(0)}
                    onClick={() => setRating(n)}
                    aria-label={`${n} stars`}
                  >
                    <Star
                      className={cn(
                        "size-6",
                        (hover || rating) >= n
                          ? "fill-warning text-warning"
                          : "fill-subtle text-subtle",
                      )}
                    />
                  </button>
                ))}
              </div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder={t("reviewPlaceholder")}
                className="mt-3 w-full rounded-md border border-border bg-elevated px-3 py-2 text-sm placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <div className="mt-3 flex gap-2">
                <Button onClick={submit} disabled={busy} size="sm">
                  {busy && <Loader2 className="size-4 animate-spin" />}
                  {t("submitReview")}
                </Button>
                {mine && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditing(false);
                      setRating(mine.rating);
                      setComment(mine.comment ?? "");
                    }}
                  >
                    {t("cancelReview")}
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {reviews.length === 0 ? (
        <p className="mt-4 text-sm text-text-muted">{t("noReviewsYet")}</p>
      ) : (
        <div className="mt-4 space-y-3">
          {sorted.map((r) => (
            <div key={r.id} className="relative">
              <ReviewCard
                author={r.author}
                rating={r.rating}
                comment={r.comment}
                createdAt={r.created_at}
                locale={locale}
              />
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => del(r.id)}
                  aria-label="Hide review"
                  className="absolute right-2 top-2 rounded p-1 text-text-muted hover:bg-subtle hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
