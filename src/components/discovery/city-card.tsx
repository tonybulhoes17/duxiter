import Link from "next/link";
import Image from "next/image";
import { MapPin } from "lucide-react";
import { getLocalizedText, type Locale } from "@/i18n/config";
import type { CityWithCount } from "@/lib/queries";

export function CityCard({
  city,
  locale,
  toursLabel,
}: {
  city: CityWithCount;
  locale: Locale;
  toursLabel: string;
}) {
  const name = getLocalizedText(city.name, locale);

  return (
    <Link
      href={`/cities/${city.slug}`}
      className="group relative block aspect-[4/5] overflow-hidden rounded-lg border border-border bg-card"
    >
      {city.cover_image_url ? (
        <Image
          src={city.cover_image_url}
          alt={name}
          fill
          sizes="(max-width: 768px) 50vw, 25vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 bg-elevated" />
      )}
      <div className="absolute inset-0 scrim-bottom" />
      <div className="absolute inset-x-0 bottom-0 p-4">
        <h3 className="font-display text-lg font-bold text-white">{name}</h3>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-white/75">
          <MapPin className="size-3" />
          {city.country}
          <span className="mx-1 opacity-40">·</span>
          {toursLabel}
        </p>
      </div>
    </Link>
  );
}
