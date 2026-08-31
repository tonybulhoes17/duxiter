"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Loader2, Upload, X } from "lucide-react";
import { Label } from "@/components/ui/label";

async function upload(file: File, kind: "image" | "audio", prefix: string) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("kind", kind);
  fd.append("prefix", prefix);
  const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
  if (!res.ok) {
    const b = await res.json().catch(() => ({}));
    throw new Error(b.error ?? "upload_failed");
  }
  return res.json() as Promise<{ url?: string; path: string }>;
}

export function ImageUploadField({
  label,
  value,
  onChange,
  prefix,
}: {
  label: string;
  value: string | null;
  onChange: (url: string | null) => void;
  prefix: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function pick(file?: File) {
    if (!file) return;
    setBusy(true);
    try {
      const { url } = await upload(file, "image", prefix);
      onChange(url ?? null);
    } catch (e) {
      toast.error(`Upload failed: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {value ? (
        <div className="relative aspect-[16/10] w-full max-w-sm overflow-hidden rounded-md border border-border">
          <Image src={value} alt="" fill sizes="384px" className="object-cover" />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute right-2 top-2 rounded-md bg-black/60 p-1 text-white"
            aria-label="Remove"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex aspect-[16/10] w-full max-w-sm flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-elevated text-sm text-text-muted hover:border-white/20"
        >
          {busy ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <Upload className="size-5" />
          )}
          JPG / PNG / WebP · max 2MB
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0])}
      />
    </div>
  );
}
