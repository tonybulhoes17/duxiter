import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { quotePrice } from "@/lib/pricing";
import { getUsdToBrlRate, usdToBrl } from "@/lib/fx";
import { isUuid } from "@/lib/validate";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { tourId?: string; code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  if (!isUuid(body.tourId)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { data: tour } = await supabase
    .from("tours")
    .select("id, price_usd, status, is_active")
    .eq("id", body.tourId)
    .maybeSingle();
  if (!tour || tour.status !== "approved" || !tour.is_active) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const quote = await quotePrice(tour.id, Number(tour.price_usd), body.code);
  const fxRate = await getUsdToBrlRate();

  return NextResponse.json({
    basePriceUsd: quote.basePriceUsd,
    discountUsd: quote.discountUsd,
    finalPriceUsd: quote.finalPriceUsd,
    finalPriceBrl: usdToBrl(quote.finalPriceUsd, fxRate),
    basePriceBrl: usdToBrl(quote.basePriceUsd, fxRate),
    fxRate,
    code: quote.code ? { code: quote.code.code, label: quote.code.label } : null,
    codeError: quote.codeError,
  });
}
