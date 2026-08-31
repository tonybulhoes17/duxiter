import "server-only";

import Stripe from "stripe";
import { serverEnv } from "@/lib/env";

let client: Stripe | null = null;

export function getStripe(): Stripe {
  if (!client) {
    client = new Stripe(serverEnv.stripeSecretKey, {
      // Pin to the SDK's bundled version; override only if you know why.
      typescript: true,
      appInfo: { name: "Duxiter" },
    });
  }
  return client;
}

/** 6-month access window granted on a completed purchase. */
export const ACCESS_MONTHS = 6;

export function accessExpiryFrom(date = new Date()): string {
  const d = new Date(date);
  d.setMonth(d.getMonth() + ACCESS_MONTHS);
  return d.toISOString();
}
