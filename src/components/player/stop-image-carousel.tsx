"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { getLocalizedText, type Locale } from "@/i18n/config";
import type { StopImageRow } from "@/lib/database.types";

export function StopImageCarousel({
  images,
  locale,
  alt,
  className,
}: {
  images: StopImageRow[];
  locale: Locale;
  alt: string;
  className?: string;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(0);

  if (!images.length) return null;

  function onScroll() {
    const el = trackRef.current;
    if (!el) return;
    setActive(Math.round(el.scrollLeft / el.clientWidth));
  }

  return (
    <div className={cn("relative", className)}>
      <div
        ref={trackRef}
        onScroll={onScroll}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto rounded-md"
      >
        {images.map((img, i) => (
          <div
            key={img.id}
            className="relative aspect-[16/10] w-full shrink-0 snap-center bg-subtle"
          >
            <Image
              src={img.image_url}
              alt={getLocalizedText(img.caption, locale) || `${alt} (${i + 1})`}
              fill
              sizes="(max-width: 768px) 100vw, 640px"
              className="object-cover"
            />
            {getLocalizedText(img.caption, locale) && (
              <p className="absolute inset-x-0 bottom-0 bg-overlay px-3 py-1.5 text-xs text-text-secondary">
                {getLocalizedText(img.caption, locale)}
              </p>
            )}
          </div>
        ))}
      </div>

      {images.length > 1 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
          {images.map((_, i) => (
            <span
              key={i}
              className={cn(
                "size-1.5 rounded-full transition-colors",
                i === active ? "bg-white" : "bg-white/40",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
