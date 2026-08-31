"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocalizedField, type LocalizedValue } from "@/components/admin/localized-field";
import { ImageUploadField } from "@/components/admin/upload-field";
import type { AdminTourDetail } from "@/lib/admin-queries";
import type { DifficultyLevel, TourStatus, TourType } from "@/lib/database.types";

type Num = number | "";

export function TourForm({
  tour,
  cities,
}: {
  tour?: AdminTourDetail;
  cities: { id: string; name: string }[];
}) {
  const router = useRouter();
  const editing = !!tour;

  const [cityId, setCityId] = useState(tour?.city_id ?? cities[0]?.id ?? "");
  const [type, setType] = useState<TourType>(tour?.type ?? "street");
  const [title, setTitle] = useState<LocalizedValue>(tour?.title ?? {});
  const [short, setShort] = useState<LocalizedValue>(
    tour?.short_description ?? {},
  );
  const [description, setDescription] = useState<LocalizedValue>(
    tour?.description ?? {},
  );
  const [cover, setCover] = useState<string | null>(tour?.cover_image_url ?? null);
  const [tags, setTags] = useState(tour?.tags?.join(", ") ?? "");
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(
    tour?.difficulty ?? "easy",
  );
  const [duration, setDuration] = useState<Num>(
    tour?.estimated_duration_minutes ?? "",
  );
  const [distance, setDistance] = useState<Num>(
    tour?.distance_km != null ? Number(tour.distance_km) : "",
  );
  const [price, setPrice] = useState<Num>(
    tour?.price_usd != null ? Number(tour.price_usd) : 0,
  );
  const [status, setStatus] = useState<TourStatus>(tour?.status ?? "draft");
  const [saving, setSaving] = useState(false);

  async function save(goToStops = false) {
    if (!cityId || !title.pt?.trim()) {
      toast.error("City and Portuguese title are required.");
      return;
    }
    setSaving(true);
    const payload = {
      city_id: cityId,
      type,
      title,
      short_description: short,
      description,
      cover_image_url: cover,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      difficulty,
      estimated_duration_minutes: duration === "" ? null : Number(duration),
      distance_km: type === "museum" || distance === "" ? null : Number(distance),
      price_usd: price === "" ? 0 : Number(price),
      status,
    };
    const res = await fetch(
      editing ? `/api/admin/tours/${tour!.id}` : "/api/admin/tours",
      {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      toast.error("Save failed.");
      return;
    }
    toast.success("Saved");
    const id = editing ? tour!.id : data.id;
    if (goToStops) router.push(`/admin/tours/${id}/stops`);
    else {
      router.push("/admin/tours");
      router.refresh();
    }
  }

  async function del() {
    if (!confirm("Delete this tour?")) return;
    const res = await fetch(`/api/admin/tours/${tour!.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return toast.error("Delete failed.");
    toast.success(data.unpublishedOnly ? "Unpublished (has sales)" : "Deleted");
    router.push("/admin/tours");
    router.refresh();
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>City *</Label>
          <select
            value={cityId}
            onChange={(e) => setCityId(e.target.value)}
            className="h-11 w-full rounded-md border border-border bg-elevated px-3 text-sm"
          >
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Type</Label>
          <div className="flex gap-2">
            {(["street", "museum"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setType(v)}
                className={`flex-1 rounded-md border py-2.5 text-sm capitalize ${
                  type === v
                    ? "border-primary bg-primary/10"
                    : "border-border text-text-secondary"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      <LocalizedField label="Title" value={title} onChange={setTitle} required />
      <LocalizedField
        label="Short description (cards)"
        value={short}
        onChange={setShort}
        maxLength={120}
      />
      <LocalizedField
        label="Full description"
        value={description}
        onChange={setDescription}
        multiline
      />
      <ImageUploadField
        label="Cover image"
        value={cover}
        onChange={setCover}
        prefix="tours"
      />

      <div className="space-y-1.5">
        <Label>Tags (comma separated)</Label>
        <Input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="history, architecture, viewpoints"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Difficulty</Label>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as DifficultyLevel)}
            className="h-11 w-full rounded-md border border-border bg-elevated px-3 text-sm capitalize"
          >
            <option value="easy">easy</option>
            <option value="medium">medium</option>
            <option value="hard">hard</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Duration (min)</Label>
          <Input
            type="number"
            value={duration}
            onChange={(e) =>
              setDuration(e.target.value === "" ? "" : Number(e.target.value))
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label>Distance (km)</Label>
          <Input
            type="number"
            step="0.1"
            disabled={type === "museum"}
            value={distance}
            onChange={(e) =>
              setDistance(e.target.value === "" ? "" : Number(e.target.value))
            }
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Price (USD, 0 = free)</Label>
          <Input
            type="number"
            step="0.01"
            value={price}
            onChange={(e) =>
              setPrice(e.target.value === "" ? "" : Number(e.target.value))
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as TourStatus)}
            className="h-11 w-full rounded-md border border-border bg-elevated px-3 text-sm"
          >
            <option value="draft">Draft (hidden)</option>
            <option value="approved">Published</option>
            <option value="pending_approval">Pending approval</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Button onClick={() => save(false)} disabled={saving}>
          {saving && <Loader2 className="size-4 animate-spin" />}
          {editing ? "Save changes" : "Create tour"}
        </Button>
        <Button variant="outline" onClick={() => save(true)} disabled={saving}>
          {editing ? "Save & edit stops" : "Create & add stops"}
        </Button>
        {editing && (
          <Button variant="ghost" onClick={del} className="text-destructive">
            <Trash2 className="size-4" />
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}
