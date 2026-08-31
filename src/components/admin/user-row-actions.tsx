"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export function BanToggle({
  userId,
  banned,
}: {
  userId: string;
  banned: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    const res = await fetch(`/api/admin/users/${userId}/ban`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ banned: !banned }),
    });
    setBusy(false);
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      toast.error(
        b.error === "cannot_ban_self" ? "You can't ban yourself." : "Failed.",
      );
      return;
    }
    toast.success(!banned ? "User banned" : "User unbanned");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className={
        banned
          ? "text-xs font-medium text-success hover:underline"
          : "text-xs font-medium text-destructive hover:underline"
      }
    >
      {busy ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : banned ? (
        "Unban"
      ) : (
        "Ban"
      )}
    </button>
  );
}
