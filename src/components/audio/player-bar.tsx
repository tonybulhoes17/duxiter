"use client";

import { useEffect } from "react";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ChevronUp,
  Loader2,
  Music,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  X,
} from "lucide-react";
import { useAudio } from "@/components/audio/audio-provider";

export function PlayerBar() {
  const audio = useAudio();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("tour");

  const visible = !!audio.current && !pathname.includes("/play");

  // Reserve space at the bottom of the page while the bar is shown.
  useEffect(() => {
    document.body.dataset.player = visible ? "active" : "";
    return () => {
      document.body.dataset.player = "";
    };
  }, [visible]);

  if (!visible || !audio.current) return null;

  const { current, playing, loading, currentTime, duration, href } = audio;
  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const openPlayer = () => href && router.push(href);
  const canPrev = audio.index > 0;
  const canNext = audio.queueKey != null; // provider guards the upper bound

  return (
    <div className="fixed inset-x-0 bottom-14 z-40 px-2 md:bottom-4 md:left-auto md:right-4 md:w-[22rem] md:px-0">
      <div className="overflow-hidden rounded-lg border border-border bg-elevated shadow-2xl">
        <div className="h-0.5 w-full bg-subtle">
          <div
            className="h-full bg-primary transition-[width] duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="flex items-center gap-2 p-2">
          {/* Tap the artwork/title area to open the full player screen */}
          <button
            type="button"
            onClick={openPlayer}
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
            aria-label={t("backTo", { name: current.subtitle ?? current.title })}
          >
            <span className="relative size-11 shrink-0 overflow-hidden rounded bg-subtle">
              {current.artwork ? (
                <Image
                  src={current.artwork}
                  alt=""
                  fill
                  sizes="44px"
                  className="object-cover"
                />
              ) : (
                <span className="flex h-full items-center justify-center text-text-muted">
                  <Music className="size-4" />
                </span>
              )}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-text-primary">
                {current.title}
                {current.part ? (
                  <span className="text-text-muted"> · {current.part}</span>
                ) : null}
              </span>
              <span className="block truncate text-xs text-text-muted">
                {current.subtitle}
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => audio.prev()}
            disabled={!canPrev}
            aria-label="Previous"
            className="hidden size-9 shrink-0 items-center justify-center rounded-md text-text-secondary hover:bg-subtle disabled:opacity-30 sm:flex"
          >
            <SkipBack className="size-4" />
          </button>

          <button
            type="button"
            onClick={audio.toggle}
            aria-label={playing ? "Pause" : "Play"}
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary-hover"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : playing ? (
              <Pause className="size-4" />
            ) : (
              <Play className="size-4 translate-x-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={() => audio.next()}
            disabled={!canNext}
            aria-label="Next"
            className="hidden size-9 shrink-0 items-center justify-center rounded-md text-text-secondary hover:bg-subtle disabled:opacity-30 sm:flex"
          >
            <SkipForward className="size-4" />
          </button>

          {/* Expand -> go to the tour's player screen */}
          <button
            type="button"
            onClick={openPlayer}
            aria-label={t("backTo", { name: current.subtitle ?? current.title })}
            className="flex size-9 shrink-0 items-center justify-center rounded-md text-text-secondary hover:bg-subtle"
          >
            <ChevronUp className="size-4" />
          </button>

          <button
            type="button"
            onClick={audio.close}
            aria-label={t("closePlayer")}
            className="flex size-9 shrink-0 items-center justify-center rounded-md text-text-muted hover:bg-subtle"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
