import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, MapPin } from "lucide-react";

export function CityHero({
  name,
  country,
  description,
  imageUrl,
  toursLabel,
  backHref,
  backLabel,
}: {
  name: string;
  country: string | null;
  description: string;
  imageUrl: string | null;
  toursLabel: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <section className="relative h-[44vh] min-h-[280px] w-full overflow-hidden border-b border-border">
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={name}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-elevated" />
      )}
      <div className="absolute inset-0 scrim-bottom" />

      {backHref && (
        <Link
          href={backHref}
          className="absolute left-4 top-4 z-10 inline-flex items-center gap-1 rounded-full bg-overlay px-3 py-2 text-sm text-white backdrop-blur safe-top hover:bg-black/60"
        >
          <ChevronLeft className="size-4" />
          {backLabel}
        </Link>
      )}
      <div className="container relative flex h-full flex-col justify-end pb-6">
        <p className="flex items-center gap-1.5 text-sm text-white/75">
          <MapPin className="size-3.5" />
          {country}
          <span className="mx-1 opacity-40">·</span>
          {toursLabel}
        </p>
        <h1 className="mt-1 font-display text-4xl font-extrabold text-white md:text-5xl">
          {name}
        </h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm text-white/80 md:text-base">
            {description}
          </p>
        )}
      </div>
    </section>
  );
}
