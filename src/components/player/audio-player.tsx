"use client";

import Image from "next/image";
import { Loader2, Music, Pause, Play, RotateCcw, RotateCw } from "lucide-react";
import { useAudio, type AudioQueue } from "@/components/audio/audio-provider";
import { cn } from "@/lib/utils";
import { formatClock } from "@/lib/format";

export interface StopAudioPart {
  id: string;
  label: string;
  durationHint: number | null;
  artwork?: string | null;
}

/**
 * Per-stop audio. Each part has its own play button so the visitor can
 * pick any one; playback runs through the global <AudioProvider>, which
 * keeps playing across navigation and continues to the next part / stop.
 */
export function AudioPlayer({
  queue,
  startIndex,
  parts,
  className,
}: {
  queue: AudioQueue;
  startIndex: number;
  parts: StopAudioPart[];
  className?: string;
}) {
  const audio = useAudio();
  if (parts.length === 0) return null;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border border-border bg-elevated",
        className,
      )}
    >
      {parts.map((part, i) => {
        const qIndex = startIndex + i;
        const isActive =
          audio.queueKey === queue.key && audio.index === qIndex;
        const playing = isActive && audio.playing;
        const loading = isActive && audio.loading;
        const error = isActive ? audio.error : null;

        const current = isActive ? audio.currentTime : 0;
        const duration = isActive
          ? audio.duration || part.durationHint || 0
          : part.durationHint || 0;
        const pct = duration > 0 ? (current / duration) * 100 : 0;

        return (
          <div
            key={part.id}
            className={cn(
              "border-b border-border last:border-b-0",
              isActive && "bg-card/40",
            )}
          >
            <div className="flex items-center gap-3 p-2.5">
              {part.artwork ? (
                <span className="relative size-9 shrink-0 overflow-hidden rounded bg-subtle">
                  <Image
                    src={part.artwork}
                    alt=""
                    fill
                    sizes="36px"
                    className="object-cover"
                  />
                </span>
              ) : (
                <span className="flex size-9 shrink-0 items-center justify-center rounded bg-subtle text-text-muted">
                  <Music className="size-4" />
                </span>
              )}

              <button
                type="button"
                onClick={() =>
                  isActive
                    ? audio.toggle()
                    : audio.playQueue(queue, qIndex)
                }
                disabled={!!error}
                aria-label={playing ? "Pause" : "Play"}
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : playing ? (
                  <Pause className="size-4" />
                ) : (
                  <Play className="size-4 translate-x-0.5" />
                )}
              </button>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text-primary">
                  {part.label}
                </p>
                {error ? (
                  <p className="text-xs text-warning">{error}</p>
                ) : (
                  <p className="font-metric text-[11px] text-text-muted">
                    {isActive
                      ? `${formatClock(current)} / ${formatClock(duration)}`
                      : formatClock(duration)}
                  </p>
                )}
              </div>
            </div>

            {isActive && !error && (
              <div className="space-y-2 px-2.5 pb-2.5">
                <input
                  type="range"
                  min={0}
                  max={duration || 0}
                  step={0.1}
                  value={current}
                  onChange={(e) => audio.seek(Number(e.target.value))}
                  aria-label="Seek"
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-full accent-primary"
                  style={{
                    background: `linear-gradient(to right, var(--color-primary) ${pct}%, var(--bg-subtle) ${pct}%)`,
                  }}
                />
                <div className="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => audio.skip(-15)}
                    aria-label="Back 15 seconds"
                    className="flex size-8 items-center justify-center rounded-md text-text-secondary hover:bg-subtle"
                  >
                    <RotateCcw className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => audio.skip(15)}
                    aria-label="Forward 15 seconds"
                    className="flex size-8 items-center justify-center rounded-md text-text-secondary hover:bg-subtle"
                  >
                    <RotateCw className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={audio.cycleRate}
                    aria-label="Playback speed"
                    className="ml-1 min-w-[3rem] rounded-md px-2 py-1.5 font-metric text-xs font-medium text-text-secondary hover:bg-subtle"
                  >
                    {audio.rate}×
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
