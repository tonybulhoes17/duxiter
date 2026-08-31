"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import type { DiscountCodeRow } from "@/lib/database.types";

export function DiscountsManager({ codes }: { codes: DiscountCodeRow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [desc, setDesc] = useState("");
  const [mode, setMode] = useState<"percent" | "amount">("percent");
  const [value, setValue] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [expires, setExpires] = useState("");
  const [saving, setSaving] = useState(false);

  async function create() {
    if (!code.trim() || !value) return toast.error("Code and value required.");
    setSaving(true);
    const res = await fetch("/api/admin/discounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        description: desc,
        discount_percent: mode === "percent" ? Number(value) : null,
        discount_amount_usd: mode === "amount" ? Number(value) : null,
        max_uses: maxUses ? Number(maxUses) : null,
        expires_at: expires ? new Date(expires).toISOString() : null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      toast.error(data.error === "code_taken" ? "Code already exists." : "Failed.");
      return;
    }
    toast.success("Code created");
    setOpen(false);
    setCode("");
    setDesc("");
    setValue("");
    setMaxUses("");
    setExpires("");
    router.refresh();
  }

  async function toggle(c: DiscountCodeRow) {
    await fetch(`/api/admin/discounts/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !c.is_active }),
    });
    router.refresh();
  }

  async function del(id: string) {
    if (!confirm("Delete this code?")) return;
    await fetch(`/api/admin/discounts/${id}`, { method: "DELETE" });
    toast.success("Deleted");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setOpen((v) => !v)}>
          <Plus className="size-4" />
          New code
        </Button>
      </div>

      {open && (
        <div className="grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Code</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="SUMMER25"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input value={desc} onChange={(e) => setDesc(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Discount</Label>
            <div className="flex gap-2">
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as "percent" | "amount")}
                className="h-11 rounded-md border border-border bg-elevated px-2 text-sm"
              >
                <option value="percent">%</option>
                <option value="amount">USD</option>
              </select>
              <Input
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Max uses (optional)</Label>
            <Input
              type="number"
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Expires (optional)</Label>
            <Input
              type="date"
              value={expires}
              onChange={(e) => setExpires(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={create} disabled={saving} className="w-full">
              {saving && <Loader2 className="size-4 animate-spin" />}
              Create
            </Button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-card text-left text-xs text-text-muted">
            <tr>
              <th className="p-3 font-medium">Code</th>
              <th className="p-3 font-medium">Value</th>
              <th className="p-3 font-medium">Used</th>
              <th className="p-3 font-medium">Expires</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {codes.map((c) => (
              <tr key={c.id} className="bg-card/50">
                <td className="p-3 font-metric font-medium">{c.code}</td>
                <td className="p-3">
                  {c.discount_percent
                    ? `${c.discount_percent}%`
                    : `$${c.discount_amount_usd}`}
                </td>
                <td className="p-3 font-metric text-text-muted">
                  {c.used_count}
                  {c.max_uses ? `/${c.max_uses}` : ""}
                </td>
                <td className="p-3 text-text-secondary">
                  {c.expires_at ? formatDate(c.expires_at, "en") : "—"}
                </td>
                <td className="p-3">
                  <button type="button" onClick={() => toggle(c)}>
                    <Badge variant={c.is_active ? "success" : "default"}>
                      {c.is_active ? "Active" : "Off"}
                    </Badge>
                  </button>
                </td>
                <td className="p-3 text-right">
                  <button
                    type="button"
                    onClick={() => del(c.id)}
                    className="text-destructive hover:opacity-70"
                    aria-label="Delete"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </td>
              </tr>
            ))}
            {codes.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-text-muted">
                  No discount codes.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
