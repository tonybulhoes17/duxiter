import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Coming soon" };

export default function ComingSoonPage() {
  return (
    <div className="container flex min-h-[70vh] flex-col items-center justify-center gap-4 text-center">
      <div className="flex size-14 items-center justify-center rounded-xl bg-primary/15 text-primary">
        <Compass className="size-7" />
      </div>
      <h1 className="font-display text-2xl font-bold">Coming soon</h1>
      <p className="max-w-sm text-sm text-text-secondary">
        The guide partner program launches after V1. For now, all tours are
        curated by the Duxiter team.
      </p>
      <Button asChild variant="outline">
        <Link href="/cities">Explore cities</Link>
      </Button>
    </div>
  );
}
