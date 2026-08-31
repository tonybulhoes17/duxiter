import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { getStripe, accessExpiryFrom } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env";
import { sendPurchaseConfirmation } from "@/lib/email";
import { getLocalizedText } from "@/i18n/config";
import type { PaymentMethodType } from "@/lib/database.types";

export const runtime = "nodejs";

function mapMethod(types: string[] | undefined): PaymentMethodType | null {
  if (!types?.length) return null;
  if (types.includes("pix")) return "pix";
  if (types.includes("card")) return "stripe_card";
  return null;
}

async function grantAccess(session: Stripe.Checkout.Session) {
  const admin = createAdminClient();
  const purchaseId = session.metadata?.purchaseId;
  const discountCodeId = session.metadata?.discountCodeId || null;

  const match = purchaseId
    ? admin.from("purchases").select("*").eq("id", purchaseId)
    : admin.from("purchases").select("*").eq("stripe_session_id", session.id);

  const { data: purchase } = await match.maybeSingle();
  if (!purchase) {
    console.warn("webhook: no purchase for session", session.id);
    return;
  }
  if (purchase.status === "completed") return; // idempotent

  const method = mapMethod(
    (session.payment_method_types as string[] | undefined) ??
      (session.metadata?.method ? [session.metadata.method] : undefined),
  );

  await admin
    .from("purchases")
    .update({
      status: "completed",
      expires_at: accessExpiryFrom(),
      payment_method: method,
      stripe_payment_intent_id:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : (session.payment_intent?.id ?? null),
      amount_paid_brl: session.amount_total
        ? session.amount_total / 100
        : purchase.amount_paid_brl,
    })
    .eq("id", purchase.id);

  if (discountCodeId) {
    await admin.rpc("increment_discount_use", { p_code_id: discountCodeId });
    await admin
      .from("discount_code_uses")
      .upsert(
        {
          code_id: discountCodeId,
          user_id: purchase.user_id,
          purchase_id: purchase.id,
        },
        { onConflict: "code_id,purchase_id", ignoreDuplicates: true },
      );
  }

  // Confirmation email (no-ops if Resend isn't configured).
  try {
    const [{ data: authUser }, { data: profile }, { data: tourRow }] =
      await Promise.all([
        admin.auth.admin.getUserById(purchase.user_id),
        admin
          .from("user_profiles")
          .select("preferred_language")
          .eq("id", purchase.user_id)
          .maybeSingle(),
        admin
          .from("tours")
          .select("title, cities(name)")
          .eq("id", purchase.tour_id)
          .maybeSingle(),
      ]);
    const to = session.customer_details?.email ?? authUser?.user?.email;
    if (to && tourRow) {
      const lang = (profile?.preferred_language ?? "en") as "pt" | "en" | "es";
      const title = getLocalizedText(
        tourRow.title as Record<string, string>,
        lang,
      );
      const city = getLocalizedText(
        (tourRow.cities as { name?: Record<string, string> } | null)?.name ?? {},
        lang,
      );
      const amt = session.amount_total
        ? new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: (session.currency ?? "brl").toUpperCase(),
          }).format(session.amount_total / 100)
        : "";
      await sendPurchaseConfirmation({
        to,
        tourId: purchase.tour_id,
        tourTitle: title,
        cityName: city || null,
        amountLabel: amt,
        locale: lang,
      });
    }
  } catch (err) {
    console.error("confirmation email step failed", err);
  }
}

async function markFailed(session: Stripe.Checkout.Session, status: "expired") {
  const admin = createAdminClient();
  const purchaseId = session.metadata?.purchaseId;
  const q = purchaseId
    ? admin.from("purchases").update({ status }).eq("id", purchaseId)
    : admin
        .from("purchases")
        .update({ status })
        .eq("stripe_session_id", session.id);
  await q.neq("status", "completed");
}

async function handleRefund(charge: Stripe.Charge) {
  const pi =
    typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : charge.payment_intent?.id;
  if (!pi) return;
  const admin = createAdminClient();
  await admin
    .from("purchases")
    .update({ status: "refunded" })
    .eq("stripe_payment_intent_id", pi);
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "no_signature" }, { status: 400 });
  }

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      raw,
      sig,
      serverEnv.stripeWebhookSecret,
    );
  } catch (err) {
    console.error("webhook signature verification failed", err);
    return NextResponse.json({ error: "bad_signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        // Cards: paid immediately. PIX: still 'unpaid' here — wait for async event.
        if (session.payment_status === "paid") await grantAccess(session);
        break;
      }
      case "checkout.session.async_payment_succeeded": {
        await grantAccess(event.data.object as Stripe.Checkout.Session);
        break;
      }
      case "checkout.session.async_payment_failed":
      case "checkout.session.expired": {
        await markFailed(event.data.object as Stripe.Checkout.Session, "expired");
        break;
      }
      case "charge.refunded": {
        await handleRefund(event.data.object as Stripe.Charge);
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error("webhook handler error", event.type, err);
    return NextResponse.json({ error: "handler_error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
