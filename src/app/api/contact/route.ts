import { NextResponse, type NextRequest } from "next/server";
import { sendContactMessage } from "@/lib/email";
import { isLocale } from "@/i18n/config";

export const runtime = "nodejs";

interface Body {
  name?: string;
  email?: string;
  message?: string;
  locale?: string;
  // honeypot — real users never fill this hidden field
  company?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// very small per-instance throttle to slow down spam bursts
const lastSubmitByIp = new Map<string, number>();

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (body.company) {
    // honeypot tripped — pretend success, drop silently
    return NextResponse.json({ ok: true });
  }

  const name = (body.name ?? "").trim().slice(0, 120);
  const email = (body.email ?? "").trim().slice(0, 200);
  const message = (body.message ?? "").trim().slice(0, 4000);
  const locale = isLocale(body.locale) ? body.locale : "pt";

  if (name.length < 2 || !EMAIL_RE.test(email) || message.length < 10) {
    return NextResponse.json({ error: "invalid_fields" }, { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const last = lastSubmitByIp.get(ip);
  if (last && Date.now() - last < 30_000) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  lastSubmitByIp.set(ip, Date.now());

  const result = await sendContactMessage({ name, email, message, locale });
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
