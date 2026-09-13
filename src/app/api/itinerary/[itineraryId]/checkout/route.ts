import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { getUsdToBrlRate, usdToBrl, toCentavos } from "@/lib/fx";
import { publicEnv } from "@/lib/env";
import { ITINERARY_PRICE_USD } from "@/lib/itinerary-pricing";
import { isUuid } from "@/lib/validate";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: { itineraryId: string } },
) {
  const itineraryId = params.itineraryId;
  if (!isUuid(itineraryId)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { method?: "card" | "pix" };

  const admin = createAdminClient();
  const { data: itinerary } = await admin
    .from("ai_itineraries")
    .select("id, user_id, city_name")
    .eq("id", itineraryId)
    .maybeSingle();
  if (!itinerary || itinerary.user_id !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { data: existing } = await admin
    .from("itinerary_purchases")
    .select("id, status")
    .eq("user_id", user.id)
    .eq("itinerary_id", itineraryId)
    .maybeSingle();
  if (existing?.status === "completed") {
    return NextResponse.json({ error: "already_owned" }, { status: 409 });
  }
  if (existing) {
    await admin.from("itinerary_purchases").delete().eq("id", existing.id);
  }

  const fxRate = await getUsdToBrlRate();
  const amountBrl = usdToBrl(ITINERARY_PRICE_USD, fxRate);

  const { data: pending, error: pendErr } = await admin
    .from("itinerary_purchases")
    .insert({
      user_id: user.id,
      itinerary_id: itineraryId,
      amount_paid_brl: amountBrl,
      fx_rate_used: fxRate,
      status: "pending",
    })
    .select("id")
    .single();
  if (pendErr || !pending) {
    return NextResponse.json({ error: "could_not_start" }, { status: 500 });
  }

  const methods: Stripe.Checkout.SessionCreateParams.PaymentMethodType[] =
    body.method === "card"
      ? ["card"]
      : body.method === "pix"
        ? ["pix"]
        : ["card", "pix"];

  const cityName = itinerary.city_name?.trim() ?? "";

  const stripe = getStripe();
  const mkParams = (
    pmTypes: Stripe.Checkout.SessionCreateParams.PaymentMethodType[],
  ): Stripe.Checkout.SessionCreateParams => ({
    mode: "payment",
    payment_method_types: pmTypes,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "brl",
          unit_amount: toCentavos(amountBrl),
          product_data: {
            name: cityName
              ? `Duxiter — Roteiro de IA: ${cityName}`
              : "Duxiter — Roteiro de IA",
            description: "Acesso completo ao roteiro com áudio. Não expira.",
          },
        },
      },
    ],
    ...(pmTypes.includes("pix")
      ? { payment_method_options: { pix: { expires_after_seconds: 86400 } } }
      : {}),
    client_reference_id: user.id,
    customer_email: user.email ?? undefined,
    success_url: `${publicEnv.appUrl}/itinerary/${itineraryId}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${publicEnv.appUrl}/itinerary/${itineraryId}?checkout=cancelled`,
    metadata: {
      kind: "itinerary_purchase",
      orderId: pending.id,
      itineraryId,
      userId: user.id,
    },
  });

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create(mkParams(methods));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (methods.includes("pix") && body.method !== "pix" && /pix/i.test(msg)) {
      try {
        session = await stripe.checkout.sessions.create(mkParams(["card"]));
      } catch (err2) {
        console.error("itinerary checkout stripe error (retry)", err2);
        await admin.from("itinerary_purchases").delete().eq("id", pending.id);
        return NextResponse.json({ error: "stripe_error" }, { status: 502 });
      }
    } else {
      console.error("itinerary checkout stripe error", err);
      await admin.from("itinerary_purchases").delete().eq("id", pending.id);
      return NextResponse.json(
        { error: /pix/i.test(msg) ? "pix_unavailable" : "stripe_error" },
        { status: 502 },
      );
    }
  }

  await admin
    .from("itinerary_purchases")
    .update({ stripe_session_id: session.id })
    .eq("id", pending.id);

  return NextResponse.json({ url: session.url });
}
