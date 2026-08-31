import { redirect } from "next/navigation";
import { publicEnv } from "@/lib/env";

/**
 * V1: the partner program is disabled. Every /partner/* route redirects
 * to the coming-soon page unless NEXT_PUBLIC_PARTNERS_ENABLED=true.
 */
export default function PartnerCatchAll() {
  if (!publicEnv.partnersEnabled) {
    redirect("/coming-soon");
  }
  redirect("/");
}
