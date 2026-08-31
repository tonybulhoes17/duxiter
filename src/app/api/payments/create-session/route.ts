import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe, accessExpiryFrom } from "@/lib/stripe";
import { quotePrice } from "@/lib/pricing";
import { getUsdToBrlRate, usdToBrl, toCentavos } from "@/lib/fx";
import { publicEnv } from "@/lib/env";
import { isUuid } from "@/lib/validate";
import { getLocalizedText } from "@/i18n/config";

export const runtime = "nodejs";

type Method = "card" | "pix";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { tourId?: string; code?: string; method?: Method };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  if (!isUuid(body.tourId)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const admin = createAdminClient();

  const { data: tour } = await admin
    .from("tours")
    .select("id, title, description, price_usd, status, is_active")
    .eq("id", body.tourId)
    .maybeSingle();
  if (!tour || tour.status !== "approved" || !tour.is_active) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (Number(tour.price_usd) <= 0) {
    return NextResponse.json({ error: "tour_is_free" }, { status: 400 });
  }

  // Already own it?
  const { data: existing } = await admin
    .from("purchases")
    .select("id, status, expires_at")
    .eq("user_id", user.id)
    .eq("tour_id", tour.id)
    .maybeSingle();
  if (
    existing?.status === "completed" &&
    existing.expires_at &&
    new Date(existing.expires_at) > new Date()
  ) {
    return NextResponse.json({ error: "already_owned" }, { status: 409 });
  }

  const quote = await quotePrice(tour.id, Number(tour.price_usd), body.code);
  const fxRate = await getUsdToBrlRate();
  const amountBrl = usdToBrl(quote.finalPriceUsd, fxRate);

  // Below Stripe's minimum BRL charge -> just grant it (discount edge case).
  const STRIPE_MIN_BRL = 0.5;
  const grantFree = quote.finalPriceUsd <= 0 || amountBrl < STRIPE_MIN_BRL;

  if (grantFree) {
    if (existing) {
      await admin.from("purchases").delete().eq("id", existing.id);
    }
    const { data: freeP, error: freeErr } = await admin
      .from("purchases")
      .insert({
        user_id: user.id,
        tour_id: tour.id,
        amount_paid_usd: 0,
        amount_paid_brl: 0,
        fx_rate_used: fxRate,
        currency: "brl",
        discount_code_id: quote.code?.id ?? null,
        discount_amount_usd: quote.discountUsd,
        status: "completed",
        expires_at: accessExpiryFrom(),
      })
      .select("id")
      .single();
    if (freeErr || !freeP) {
      return NextResponse.json({ error: "could_not_start" }, { status: 500 });
    }
    if (quote.code) {
      await admin.rpc("increment_discount_use", { p_code_id: quote.code.id });
      await admin.from("discount_code_uses").insert({
        code_id: quote.code.id,
        user_id: user.id,
        purchase_id: freeP.id,
      });
    }
    return NextResponse.json({ free: true });
  }

  // Fresh pending purchase row (replace any stale one).
  if (existing) {
    await admin.from("purchases").delete().eq("id", existing.id);
  }
  const { data: pending, error: pendErr } = await admin
    .from("purchases")
    .insert({
      user_id: user.id,
      tour_id: tour.id,
      amount_paid_usd: quote.finalPriceUsd,
      amount_paid_brl: amountBrl,
      fx_rate_used: fxRate,
      currency: "brl",
      discount_code_id: quote.code?.id ?? null,
      discount_amount_usd: quote.discountUsd,
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

  const title = getLocalizedText(tour.title as Record<string, string>, "pt");
  const description = getLocalizedText(
    (tour.description as Record<string, string>) ?? {},
    "pt",
  ).slice(0, 300);

  const stripe = getStripe();
  const params = (
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
          product_data: { name: title, description: description || undefined },
        },
      },
    ],
    ...(pmTypes.includes("pix")
      ? { payment_method_options: { pix: { expires_after_seconds: 86400 } } }
      : {}),
    client_reference_id: user.id,
    customer_email: user.email ?? undefined,
    success_url: `${publicEnv.appUrl}/tours/${tour.id}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${publicEnv.appUrl}/tours/${tour.id}?checkout=cancelled`,
    metadata: {
      purchaseId: pending.id,
      tourId: tour.id,
      userId: user.id,
      discountCodeId: quote.code?.id ?? "",
      discountUsd: String(quote.discountUsd),
      finalPriceUsd: String(quote.finalPriceUsd),
      fxRate: String(fxRate),
    },
  });

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create(params(methods));
  } catch (err) {
    // PIX not yet enabled on the account -> retry with card only unless the
    // customer explicitly asked for PIX.
    const msg = err instanceof Error ? err.message : "";
    if (methods.includes("pix") && body.method !== "pix" && /pix/i.test(msg)) {
      try {
        session = await stripe.checkout.sessions.create(params(["card"]));
      } catch (err2) {
        console.error("stripe session error (retry)", err2);
        await admin.from("purchases").delete().eq("id", pending.id);
        return NextResponse.json({ error: "stripe_error" }, { status: 502 });
      }
    } else {
      console.error("stripe session error", err);
      await admin.from("purchases").delete().eq("id", pending.id);
      return NextResponse.json(
        { error: /pix/i.test(msg) ? "pix_unavailable" : "stripe_error" },
        { status: 502 },
      );
    }
  }

  await admin
    .from("purchases")
    .update({ stripe_session_id: session.id })
    .eq("id", pending.id);

  return NextResponse.json({ url: session.url });
}
