"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Loader2, Music, Trash2, Upload } from "lucide-react";
import { Label } from "@/components/ui/label";
import type { StopAudioRow } from "@/lib/database.types";

function clock(s: number | null) {
  if (!s) return "";
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function StopAudioList({
  stopId,
  audios,
  onChange,
}: {
  stopId: string;
  audios: StopAudioRow[];
  onChange: (next: StopAudioRow[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function add(file?: File) {
    if (!file) return;
    setBusy(true);
    try {
      const dur = await new Promise<number>((resolve) => {
        const a = document.createElement("audio");
        a.preload = "metadata";
        a.onloadedmetadata = () =>
          resolve(Number.isFinite(a.duration) ? Math.round(a.duration) : 0);
        a.onerror = () => resolve(0);
        a.src = URL.createObjectURL(file);
      });

      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", "audio");
      fd.append("prefix", `stops/${stopId}`);
      const up = await fetch("/api/admin/upload", { method: "POST", body: fd });
      if (!up.ok) {
        const b = await up.json().catch(() => ({}));
        throw new Error(b.error ?? "upload");
      }
      const { path } = await up.json();

      const create = await fetch(`/api/admin/stops/${stopId}/audios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audio_path: path, duration_seconds: dur || null }),
      });
      if (!create.ok) throw new Error("create");
      const row = (await create.json()) as StopAudioRow;
      onChange([...audios, row]);
    } catch (e) {
      toast.error(`Audio upload failed: ${(e as Error).message}`);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= audios.length) return;
    const next = [...audios];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
    await fetch("/api/admin/stop-audios/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stopId, orderedIds: next.map((a) => a.id) }),
    });
  }

  async function del(id: string) {
    const res = await fetch(`/api/admin/stop-audios/${id}`, { method: "DELETE" });
    if (!res.ok) return toast.error("Delete failed.");
    onChange(audios.filter((a) => a.id !== id));
  }

  return (
    <div className="space-y-2">
      <Label>
        Audio narration{" "}
        <span className="text-text-muted">
          ({audios.length} {audios.length === 1 ? "part" : "parts"} · plays in order)
        </span>
      </Label>

      {audios.map((a, i) => (
        <div
          key={a.id}
          className="flex items-center gap-2 rounded-md border border-border bg-elevated p-2 text-sm"
        >
          <span className="flex size-5 shrink-0 items-center justify-center rounded bg-subtle font-metric text-[11px]">
            {i + 1}
          </span>
          <Music className="size-4 shrink-0 text-text-muted" />
          <span className="flex-1 truncate text-text-secondary">
            {a.audio_path.split("/").pop()}
          </span>
          {a.duration_seconds ? (
            <span className="shrink-0 font-metric text-xs text-text-muted">
              {clock(a.duration_seconds)}
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => move(i, -1)}
            disabled={i === 0}
            className="rounded p-1 text-text-muted hover:bg-subtle disabled:opacity-30"
            aria-label="Move up"
          >
            <ChevronUp className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => move(i, 1)}
            disabled={i === audios.length - 1}
            className="rounded p-1 text-text-muted hover:bg-subtle disabled:opacity-30"
            aria-label="Move down"
          >
            <ChevronDown className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => del(a.id)}
            className="rounded p-1 text-destructive hover:bg-subtle"
            aria-label="Delete"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-border bg-elevated py-3 text-sm text-text-muted hover:border-white/20"
      >
        {busy ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Upload className="size-4" />
        )}
        Add audio part · AAC / MP3 / M4A / WAV · max 80MB
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="audio/aac,audio/mpeg,audio/mp4,audio/x-m4a,audio/wav"
        className="hidden"
        onChange={(e) => add(e.target.files?.[0])}
      />
    </div>
  );
}
