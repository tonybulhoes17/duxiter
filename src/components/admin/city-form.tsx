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
import type { CityRow } from "@/lib/database.types";

export function CityForm({ city }: { city?: CityRow }) {
  const router = useRouter();
  const editing = !!city;

  const [slug, setSlug] = useState(city?.slug ?? "");
  const [name, setName] = useState<LocalizedValue>(city?.name ?? {});
  const [description, setDescription] = useState<LocalizedValue>(
    city?.description ?? {},
  );
  const [country, setCountry] = useState(city?.country ?? "");
  const [cover, setCover] = useState<string | null>(city?.cover_image_url ?? null);
  const [isActive, setIsActive] = useState(city?.is_active ?? true);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!slug.trim() || !name.pt?.trim()) {
      toast.error("Slug and Portuguese name are required.");
      return;
    }
    setSaving(true);
    const payload = {
      slug,
      name,
      description,
      country,
      cover_image_url: cover,
      is_active: isActive,
    };
    const res = await fetch(
      editing ? `/api/admin/cities/${city!.id}` : "/api/admin/cities",
      {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      toast.error(
        data.error === "slug_taken" ? "That slug is taken." : "Save failed.",
      );
      return;
    }
    toast.success("Saved");
    router.push("/admin/cities");
    router.refresh();
  }

  async function del() {
    if (!confirm("Delete this city?")) return;
    const res = await fetch(`/api/admin/cities/${city!.id}`, { method: "DELETE" });
    if (res.status === 409) {
      toast.error("Remove its tours first.");
      return;
    }
    if (!res.ok) return toast.error("Delete failed.");
    toast.success("Deleted");
    router.push("/admin/cities");
    router.refresh();
  }

  return (
    <div className="max-w-xl space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Slug *</Label>
          <Input
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase())}
            placeholder="lisbon"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Country</Label>
          <Input
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="Portugal"
          />
        </div>
      </div>

      <LocalizedField label="Name" value={name} onChange={setName} required />
      <LocalizedField
        label="Description"
        value={description}
        onChange={setDescription}
        multiline
      />
      <ImageUploadField
        label="Cover image"
        value={cover}
        onChange={setCover}
        prefix="cities"
      />

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="size-4 accent-primary"
        />
        Active (visible to travelers)
      </label>

      <div className="flex items-center gap-3 pt-2">
        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="size-4 animate-spin" />}
          {editing ? "Save changes" : "Create city"}
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
