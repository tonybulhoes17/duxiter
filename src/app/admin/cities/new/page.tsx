import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { CityForm } from "@/components/admin/city-form";

export default function NewCityPage() {
  return (
    <div className="space-y-6">
      <Link
        href="/admin/cities"
        className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
      >
        <ChevronLeft className="size-4" />
        Cities
      </Link>
      <h1 className="font-display text-2xl font-bold">Add city</h1>
      <CityForm />
    </div>
  );
}
