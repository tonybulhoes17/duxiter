"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Loader2, X } from "lucide-react";

export function ApprovalActions({ tourId }: { tourId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<null | "approve" | "reject">(null);

  async function act(action: "approve" | "reject") {
    let reason: string | undefined;
    if (action === "reject") {
      reason = window.prompt("Reason for rejection (shown to the author):") ?? "";
      if (reason === "") return;
    }
    setBusy(action);
    try {
      const res = await fetch(`/api/admin/tours/${tourId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });
      if (!res.ok) throw new Error();
      toast.success(action === "approve" ? "Approved" : "Rejected");
      router.refresh();
    } catch {
      toast.error("Failed. Try again.");
      setBusy(null);
    }
  }

  return (
    <div className="flex shrink-0 gap-1.5">
      <button
        type="button"
        onClick={() => act("approve")}
        disabled={busy !== null}
        aria-label="Approve"
        className="flex size-8 items-center justify-center rounded-md bg-success/15 text-success hover:bg-success/25 disabled:opacity-50"
      >
        {busy === "approve" ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Check className="size-4" />
        )}
      </button>
      <button
        type="button"
        onClick={() => act("reject")}
        disabled={busy !== null}
        aria-label="Reject"
        className="flex size-8 items-center justify-center rounded-md bg-destructive/15 text-destructive hover:bg-destructive/25 disabled:opacity-50"
      >
        {busy === "reject" ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <X className="size-4" />
        )}
      </button>
    </div>
  );
}
