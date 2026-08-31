import { getLocalizedText, type Locale, type LocalizedText } from "@/i18n/config";
import type { AudioQueue } from "@/components/audio/audio-provider";

export interface QueueStopInput {
  id: string;
  title: LocalizedText;
  locked: boolean;
  audios?: { id: string; url: string; duration: number | null }[];
  images?: { image_url: string }[];
}

export interface SegmentSpan {
  startIndex: number;
  partCount: number;
}

/**
 * Flatten every audio segment of every unlocked stop into one global queue
 * (tour order, then segment order). Returns a map stopId -> where that stop's
 * segments start and how many there are, for the inline per-stop control.
 */
export function buildTourAudioQueue(
  stops: QueueStopInput[],
  opts: {
    tourId: string;
    tourTitle: string;
    locale: Locale;
    partLabel: (n: number, total: number) => string;
  },
): { queue: AudioQueue; segments: Map<string, SegmentSpan> } {
  const tracks: AudioQueue["tracks"] = [];
  const segments = new Map<string, SegmentSpan>();

  for (const s of stops) {
    const segs = s.audios ?? [];
    if (s.locked || segs.length === 0) continue;

    const startIndex = tracks.length;
    const stopTitle = getLocalizedText(s.title, opts.locale);
    const artwork = s.images?.[0]?.image_url ?? null;

    segs.forEach((seg, i) => {
      tracks.push({
        id: seg.id,
        src: seg.url,
        title: stopTitle,
        subtitle: opts.tourTitle,
        artwork,
        durationHint: seg.duration,
        part: segs.length > 1 ? opts.partLabel(i + 1, segs.length) : null,
      });
    });
    segments.set(s.id, { startIndex, partCount: segs.length });
  }

  return {
    queue: {
      key: opts.tourId,
      href: `/tours/${opts.tourId}/play`,
      tracks,
    },
    segments,
  };
}
