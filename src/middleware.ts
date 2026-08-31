import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image
     * - favicon, icons, manifest, service worker
     * - files with an extension (images, fonts…)
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|workbox-|icons/|assets/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)$).*)",
  ],
};
