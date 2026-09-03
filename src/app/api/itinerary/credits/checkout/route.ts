import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { publicEnv } from "@/lib/env";
import {
  ITINERARY_PACK_CREDITS,
  ITINERARY_PACK_PRICE_BRL,
} from "@/lib/itinerary-pack";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  // read `method` if provided (card | pix); default: let Stripe offer both
  const body = (await req.json().catch(() => ({}))) as { method?: string };

  const admin = createAdminClient();
  const { data: order, error } = await admin
    .from("itinerary_credit_orders")
    .insert({
      user_id: user.id,
      credits: ITINERARY_PACK_CREDITS,
      amount_brl: ITINERARY_PACK_PRICE_BRL,
      status: "pending",
    })
    .select("id")
    .single();
  if (error || !order) {
    return NextResponse.json({ error: "could_not_start" }, { status: 500 });
  }

  const stripe = getStripe();
  const wantPix =
    publicEnv.pixEnabled && (body.method === "pix" || body.method === undefined);
  const pmTypes: Stripe.Checkout.SessionCreateParams.PaymentMethodType[] =
    body.method === "card"
      ? ["card"]
      : wantPix
        ? ["card", "pix"]
        : ["card"];

  const mkParams = (
    types: Stripe.Checkout.SessionCreateParams.PaymentMethodType[],
  ): Stripe.Checkout.SessionCreateParams => ({
    mode: "payment",
    payment_method_types: types,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "brl",
          unit_amount: Math.round(ITINERARY_PACK_PRICE_BRL * 100),
          product_data: {
            name: `Duxiter — ${ITINERARY_PACK_CREDITS} roteiros de IA`,
            description: `${ITINERARY_PACK_CREDITS} gerações extras de roteiro com áudio. Não expiram.`,
          },
        },
      },
    ],
    ...(types.includes("pix")
      ? { payment_method_options: { pix: { expires_after_seconds: 86400 } } }
      : {}),
    client_reference_id: user.id,
    customer_email: user.email ?? undefined,
    success_url: `${publicEnv.appUrl}/itinerary/generate?credits=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${publicEnv.appUrl}/itinerary/generate?credits=cancelled`,
    metadata: {
      kind: "itinerary_credits",
      orderId: order.id,
      userId: user.id,
      credits: String(ITINERARY_PACK_CREDITS),
    },
  });

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create(mkParams(pmTypes));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (pmTypes.includes("pix") && /pix/i.test(msg)) {
      try {
        session = await stripe.checkout.sessions.create(mkParams(["card"]));
      } catch {
        await admin.from("itinerary_credit_orders").delete().eq("id", order.id);
        return NextResponse.json({ error: "stripe_error" }, { status: 502 });
      }
    } else {
      console.error("credit pack stripe error", err);
      await admin.from("itinerary_credit_orders").delete().eq("id", order.id);
      return NextResponse.json({ error: "stripe_error" }, { status: 502 });
    }
  }

  await admin
    .from("itinerary_credit_orders")
    .update({ stripe_session_id: session.id })
    .eq("id", order.id);

  return NextResponse.json({ url: session.url });
}
