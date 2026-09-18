"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Camera } from "lucide-react";
import { useAudio } from "@/components/audio/audio-provider";
import { cn } from "@/lib/utils";

export function ScanFab() {
  const audio = useAudio();
  const t = useTranslations("landing");
  const playerActive = !!audio.current;

  return (
    <Link
      href="/identify"
      aria-label={t("scanCta")}
      title={t("scanCta")}
      className={cn(
        "fixed right-4 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-2xl transition-transform hover:scale-105 hover:bg-primary-hover active:scale-95",
        playerActive ? "bottom-32 md:bottom-24" : "bottom-20 md:bottom-6",
      )}
    >
      <Camera className="size-6" />
    </Link>
  );
}
