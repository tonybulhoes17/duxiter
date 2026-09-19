"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { captureUtmFromUrl } from "@/lib/utm";

/** Captures utm_* from the landing URL into localStorage, once per browser. */
export function UtmCapture() {
  const params = useSearchParams();

  useEffect(() => {
    captureUtmFromUrl(params.toString());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
