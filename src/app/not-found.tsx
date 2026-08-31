import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container flex min-h-[70vh] flex-col items-center justify-center gap-4 text-center">
      <p className="font-display text-6xl font-extrabold text-primary">404</p>
      <h1 className="font-heading text-xl font-semibold">Page not found</h1>
      <p className="max-w-sm text-sm text-text-secondary">
        The page you are looking for does not exist or has moved.
      </p>
      <Button asChild variant="outline">
        <Link href="/">Go home</Link>
      </Button>
    </div>
  );
}
