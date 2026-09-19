"use client";

import Script from "next/script";
import { publicEnv } from "@/lib/env";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

/** Fires a Meta Pixel standard event. No-ops if the pixel isn't configured. */
export function trackPixelEvent(
  event: string,
  params?: Record<string, unknown>,
) {
  if (typeof window === "undefined" || !window.fbq) return;
  window.fbq("track", event, params);
}

/** Base Meta Pixel snippet + PageView. No-ops if NEXT_PUBLIC_META_PIXEL_ID isn't set. */
export function MetaPixel() {
  if (!publicEnv.metaPixelId) return null;

  return (
    <Script id="meta-pixel" strategy="afterInteractive">
      {`
        !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
        n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
        document,'script','https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${publicEnv.metaPixelId}');
        fbq('track', 'PageView');
      `}
    </Script>
  );
}
