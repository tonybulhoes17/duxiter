"use client";

import { useRouter } from "next/navigation";
import { CameraIdentifier } from "@/components/player/camera-identifier";

export function IdentifyClient() {
  const router = useRouter();
  return (
    <CameraIdentifier
      context="street"
      onClose={() => router.push("/")}
    />
  );
}
