"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocalizedField, type LocalizedValue } from "@/components/admin/localized-field";
import { StopAudioList } from "@/components/admin/stop-audio-list";
import type {
  StopAudioRow,
  StopImageRow,
  TourStopRow,
} from "@/lib/database.types";

type Stop = TourStopRow & {
  stop_images: StopImageRow[];
  stop_audios: StopAudioRow[];
};

export function StopsManager({
  tourId,
  tourType,
  initialStops,
}: {
  tourId: string;
  tourType: "street" | "museum";
  initialStops: Stop[];
}) {
  const router = useRouter();
  const [stops, setStops] = useState<Stop[]>(initialStops);
  const [openId, setOpenId] = useState<string | null>(
    initialStops[0]?.id ?? null,
  );
  const [adding, setAdding] = useState(false);

  function patchLocal(id: string, patch: Partial<Stop>) {
    setStops((s) => s.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }

  async function addStop() {
    setAdding(true);
    const res = await fetch(`/api/admin/tours/${tourId}/stops`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    setAdding(false);
    if (!res.ok) return toast.error("Failed to add stop.");
    const created = (await res.json()) as Stop;
    setStops((s) => [...s, created]);
    setOpenId(created.id);
    router.refresh();
    toast.success("Stop added");
  }

  async function move(index: number, dir: -1 | 1) {
    const j = index + dir;
    if (j < 0 || j >= stops.length) return;
    const next = [...stops];
    [next[index], next[j]] = [next[j], next[index]];
    setStops(next);
    await fetch("/api/admin/stops/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tourId, orderedIds: next.map((s) => s.id) }),
    });
  }

  async function removeStop(id: string) {
    if (!confirm("Delete this stop?")) return;
    const res = await fetch(`/api/admin/stops/${id}`, { method: "DELETE" });
    if (!res.ok) return toast.error("Delete failed.");
    setStops((s) => s.filter((x) => x.id !== id));
    toast.success("Deleted");
  }

  return (
    <div className="space-y-3">
      {stops.map((stop, i) => (
        <StopCard
          key={stop.id}
          stop={stop}
          index={i}
          total={stops.length}
          tourType={tourType}
          open={openId === stop.id}
          onToggle={() => setOpenId(openId === stop.id ? null : stop.id)}
          onMove={(d) => move(i, d)}
          onDelete={() => removeStop(stop.id)}
          onLocalPatch={(p) => patchLocal(stop.id, p)}
        />
      ))}

      <Button variant="outline" onClick={addStop} disabled={adding}>
        {adding ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
        Add stop
      </Button>
    </div>
  );
}

function StopCard({
  stop,
  index,
  total,
  tourType,
  open,
  onToggle,
  onMove,
  onDelete,
  onLocalPatch,
}: {
  stop: Stop;
  index: number;
  total: number;
  tourType: "street" | "museum";
  open: boolean;
  onToggle: () => void;
  onMove: (d: -1 | 1) => void;
  onDelete: () => void;
  onLocalPatch: (p: Partial<Stop>) => void;
}) {
  const [title, setTitle] = useState<LocalizedValue>(stop.title ?? {});
  const [description, setDescription] = useState<LocalizedValue>(
    stop.description ?? {},
  );
  const [lat, setLat] = useState<string>(stop.latitude?.toString() ?? "");
  const [lng, setLng] = useState<string>(stop.longitude?.toString() ?? "");
  const [audios, setAudios] = useState<StopAudioRow[]>(stop.stop_audios ?? []);
  const [images, setImages] = useState<StopImageRow[]>(stop.stop_images ?? []);
  const [saving, setSaving] = useState(false);
  const [imgBusy, setImgBusy] = useState(false);

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/admin/stops/${stop.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        latitude: tourType === "museum" || lat === "" ? null : Number(lat),
        longitude: tourType === "museum" || lng === "" ? null : Number(lng),
      }),
    });
    setSaving(false);
    if (!res.ok) return toast.error("Save failed.");
    onLocalPatch({ title: title as never });
    toast.success("Stop saved");
  }

  async function addImage(file?: File) {
    if (!file) return;
    if (images.length >= 4) return toast.error("Max 4 images.");
    setImgBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", "image");
      fd.append("prefix", `stops/${stop.id}`);
      const up = await fetch("/api/admin/upload", { method: "POST", body: fd });
      if (!up.ok) throw new Error();
      const { url } = await up.json();
      const add = await fetch(`/api/admin/stops/${stop.id}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!add.ok) throw new Error();
      const newImg = (await add.json()) as StopImageRow;
      setImages((im) => [...im, newImg]);
    } catch {
      toast.error("Image upload failed.");
    } finally {
      setImgBusy(false);
    }
  }

  async function delImage(id: string) {
    const res = await fetch(`/api/admin/stop-images/${id}`, { method: "DELETE" });
    if (res.ok) setImages((im) => im.filter((x) => x.id !== id));
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center gap-2 p-3">
        <GripVertical className="size-4 text-text-muted" />
        <span className="flex size-6 items-center justify-center rounded-full bg-subtle font-metric text-xs">
          {index + 1}
        </span>
        <button
          type="button"
          onClick={onToggle}
          className="flex-1 truncate text-left text-sm font-medium"
        >
          {title.pt || title.en || "Untitled stop"}
        </button>
        <button
          type="button"
          onClick={() => onMove(-1)}
          disabled={index === 0}
          className="rounded p-1 text-text-muted hover:bg-subtle disabled:opacity-30"
          aria-label="Move up"
        >
          <ChevronUp className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => onMove(1)}
          disabled={index === total - 1}
          className="rounded p-1 text-text-muted hover:bg-subtle disabled:opacity-30"
          aria-label="Move down"
        >
          <ChevronDown className="size-4" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="rounded p-1 text-destructive hover:bg-subtle"
          aria-label="Delete stop"
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      {open && (
        <div className="space-y-4 border-t border-border p-4">
          <LocalizedField label="Title" value={title} onChange={setTitle} required />
          <LocalizedField
            label="Description"
            value={description}
            onChange={setDescription}
            multiline
          />

          <StopAudioList
            stopId={stop.id}
            audios={audios}
            onChange={setAudios}
          />

          {/* Images */}
          <div className="space-y-2">
            <Label>Images ({images.length}/4)</Label>
            <div className="flex flex-wrap gap-2">
              {images.map((img) => (
                <div
                  key={img.id}
                  className="relative size-20 overflow-hidden rounded-md border border-border"
                >
                  <Image
                    src={img.image_url}
                    alt=""
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => delImage(img.id)}
                    className="absolute right-0.5 top-0.5 rounded bg-black/60 p-0.5 text-white"
                    aria-label="Remove image"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              ))}
              {images.length < 4 && (
                <label className="flex size-20 cursor-pointer items-center justify-center rounded-md border border-dashed border-border text-text-muted hover:border-white/20">
                  {imgBusy ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Plus className="size-4" />
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => addImage(e.target.files?.[0])}
                  />
                </label>
              )}
            </div>
          </div>

          {tourType === "street" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Latitude</Label>
                <Input
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  placeholder="38.71163"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Longitude</Label>
                <Input
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  placeholder="-9.13037"
                />
              </div>
            </div>
          )}

          <Button onClick={save} disabled={saving} size="sm">
            {saving && <Loader2 className="size-4 animate-spin" />}
            Save stop
          </Button>
        </div>
      )}
    </div>
  );
}
