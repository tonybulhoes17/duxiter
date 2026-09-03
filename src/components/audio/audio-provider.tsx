"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export interface AudioTrack {
  id: string;
  src: string;
  title: string;
  subtitle?: string;
  artwork?: string | null;
  durationHint?: number | null;
  /** e.g. "Parte 2/3" when a stop has multiple audio segments */
  part?: string | null;
  /** when true, playback stops (not auto-advances) after this track ends —
   *  used for walking-direction clips so the traveller resumes on arrival */
  pauseAfter?: boolean;
}

export interface AudioQueue {
  /** tour id / itinerary id — identifies the source playlist */
  key: string;
  /** link back to the source page (tour detail, itinerary…) */
  href: string;
  tracks: AudioTrack[];
}

const SPEEDS = [0.75, 1, 1.25, 1.5] as const;

interface AudioContextValue {
  current: AudioTrack | null;
  queueKey: string | null;
  href: string | null;
  index: number;
  playing: boolean;
  loading: boolean;
  currentTime: number;
  duration: number;
  rate: number;
  error: string | null;
  isActive: (trackId: string) => boolean;
  playQueue: (queue: AudioQueue, index: number) => void;
  toggle: () => void;
  seek: (t: number) => void;
  skip: (delta: number) => void;
  next: () => void;
  prev: () => void;
  cycleRate: () => void;
  close: () => void;
}

const Ctx = createContext<AudioContextValue | null>(null);

export function useAudio(): AudioContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAudio must be used within <AudioProvider>");
  return v;
}

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [queue, setQueue] = useState<AudioQueue | null>(null);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRate] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);

  const current = queue?.tracks[index] ?? null;

  const load = useCallback(
    (q: AudioQueue, i: number, autoplay: boolean) => {
      const el = audioRef.current;
      if (!el) return;
      const track = q.tracks[i];
      if (!track) return;
      setError(null);
      setLoading(true);
      setCurrentTime(0);
      setDuration(track.durationHint ?? 0);
      el.src = track.src;
      el.playbackRate = rate;
      el.load();
      if (autoplay) el.play().catch(() => {});
    },
    [rate],
  );

  const playQueue = useCallback(
    (q: AudioQueue, i: number) => {
      // Same track already active -> toggle play/pause.
      if (queue?.key === q.key && index === i && current) {
        const el = audioRef.current;
        if (!el) return;
        if (el.paused) el.play().catch(() => {});
        else el.pause();
        return;
      }
      setQueue(q);
      setIndex(i);
      load(q, i, true);
    },
    [queue, index, current, load],
  );

  const toggle = useCallback(() => {
    const el = audioRef.current;
    if (!el || !current) return;
    if (el.paused) el.play().catch(() => {});
    else el.pause();
  }, [current]);

  const seek = useCallback((t: number) => {
    const el = audioRef.current;
    if (el) el.currentTime = t;
  }, []);

  const skip = useCallback(
    (delta: number) => {
      const el = audioRef.current;
      if (el) el.currentTime = Math.min(Math.max(0, el.currentTime + delta), duration || el.duration || 0);
    },
    [duration],
  );

  const next = useCallback(() => {
    if (!queue) return;
    if (index < queue.tracks.length - 1) {
      const i = index + 1;
      setIndex(i);
      load(queue, i, true);
    }
  }, [queue, index, load]);

  const prev = useCallback(() => {
    if (!queue) return;
    const el = audioRef.current;
    if (el && el.currentTime > 3) {
      el.currentTime = 0;
      return;
    }
    if (index > 0) {
      const i = index - 1;
      setIndex(i);
      load(queue, i, true);
    }
  }, [queue, index, load]);

  const cycleRate = useCallback(() => {
    const i = SPEEDS.indexOf(rate as (typeof SPEEDS)[number]);
    const nextRate = SPEEDS[(i + 1) % SPEEDS.length];
    setRate(nextRate);
    if (audioRef.current) audioRef.current.playbackRate = nextRate;
  }, [rate]);

  const close = useCallback(() => {
    const el = audioRef.current;
    if (el) {
      el.pause();
      el.removeAttribute("src");
      el.load();
    }
    setQueue(null);
    setIndex(0);
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, []);

  const isActive = useCallback(
    (trackId: string) => current?.id === trackId,
    [current],
  );

  // ---- Media Session (lock screen / background controls) ----
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    if (!current) {
      navigator.mediaSession.metadata = null;
      return;
    }
    navigator.mediaSession.metadata = new MediaMetadata({
      title: current.title,
      artist: current.subtitle ?? "Duxiter",
      album: "Duxiter",
      artwork: current.artwork
        ? [
            { src: current.artwork, sizes: "512x512", type: "image/jpeg" },
            { src: current.artwork, sizes: "192x192", type: "image/jpeg" },
          ]
        : [{ src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }],
    });

    const h = navigator.mediaSession;
    h.setActionHandler("play", () => toggle());
    h.setActionHandler("pause", () => toggle());
    h.setActionHandler("seekbackward", () => skip(-15));
    h.setActionHandler("seekforward", () => skip(15));
    h.setActionHandler("seekto", (d) => {
      if (d.seekTime != null) seek(d.seekTime);
    });
    h.setActionHandler("previoustrack", () => prev());
    h.setActionHandler(
      "nexttrack",
      queue && index < queue.tracks.length - 1 ? () => next() : null,
    );

    return () => {
      (
        [
          "play",
          "pause",
          "seekbackward",
          "seekforward",
          "seekto",
          "previoustrack",
          "nexttrack",
        ] as const
      ).forEach((a) => h.setActionHandler(a, null));
    };
  }, [current, queue, index, toggle, skip, seek, prev, next]);

  useEffect(() => {
    if (typeof navigator !== "undefined" && "mediaSession" in navigator) {
      navigator.mediaSession.playbackState = playing ? "playing" : "paused";
    }
  }, [playing]);

  const value = useMemo<AudioContextValue>(
    () => ({
      current,
      queueKey: queue?.key ?? null,
      href: queue?.href ?? null,
      index,
      playing,
      loading,
      currentTime,
      duration,
      rate,
      error,
      isActive,
      playQueue,
      toggle,
      seek,
      skip,
      next,
      prev,
      cycleRate,
      close,
    }),
    [
      current,
      queue,
      index,
      playing,
      loading,
      currentTime,
      duration,
      rate,
      error,
      isActive,
      playQueue,
      toggle,
      seek,
      skip,
      next,
      prev,
      cycleRate,
      close,
    ],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <audio
        ref={audioRef}
        preload="none"
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          if (Number.isFinite(d) && d > 0) setDuration(d);
          e.currentTarget.playbackRate = rate;
          setLoading(false);
        }}
        onCanPlay={() => setLoading(false)}
        onWaiting={() => setLoading(true)}
        onPlaying={() => {
          setLoading(false);
          setPlaying(true);
        }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => {
          const el = e.currentTarget;
          setCurrentTime(el.currentTime);
          if (
            typeof navigator !== "undefined" &&
            "mediaSession" in navigator &&
            "setPositionState" in navigator.mediaSession &&
            Number.isFinite(el.duration)
          ) {
            try {
              navigator.mediaSession.setPositionState({
                duration: el.duration,
                position: el.currentTime,
                playbackRate: el.playbackRate,
              });
            } catch {
              /* ignore */
            }
          }
        }}
        onEnded={() => {
          setPlaying(false);
          if (!queue || index >= queue.tracks.length - 1) return;
          if (current?.pauseAfter) {
            // advance the pointer but wait for the traveller to press play
            const i = index + 1;
            setIndex(i);
            load(queue, i, false);
          } else {
            next();
          }
        }}
        onError={() => {
          setLoading(false);
          setPlaying(false);
          setError(
            audioRef.current?.error?.code === 4
              ? "This audio is locked or unavailable."
              : "Could not load audio.",
          );
        }}
      />
    </Ctx.Provider>
  );
}
