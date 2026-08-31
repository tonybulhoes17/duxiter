import "server-only";

import { Resend } from "resend";
import { publicEnv } from "@/lib/env";

const KEY = process.env.RESEND_API_KEY;
const FROM =
  process.env.DUXITER_EMAIL_FROM ?? "Duxiter <onboarding@resend.dev>";

export const isEmailConfigured = !!KEY;

const COPY = {
  pt: {
    subject: (t: string) => `Seu acesso ao passeio "${t}" está liberado`,
    heading: "Pagamento confirmado 🎧",
    body: (t: string, c: string) =>
      `Seu acesso ao passeio <strong>${t}</strong>${c ? ` em ${c}` : ""} está ativo por 6 meses.`,
    cta: "Iniciar o passeio",
    foot: "Bom passeio! — Equipe Duxiter",
  },
  en: {
    subject: (t: string) => `Your access to "${t}" is ready`,
    heading: "Payment confirmed 🎧",
    body: (t: string, c: string) =>
      `Your access to <strong>${t}</strong>${c ? ` in ${c}` : ""} is active for 6 months.`,
    cta: "Start the tour",
    foot: "Enjoy the walk! — The Duxiter team",
  },
  es: {
    subject: (t: string) => `Tu acceso al tour "${t}" está listo`,
    heading: "Pago confirmado 🎧",
    body: (t: string, c: string) =>
      `Tu acceso a <strong>${t}</strong>${c ? ` en ${c}` : ""} está activo durante 6 meses.`,
    cta: "Iniciar el tour",
    foot: "¡Buen paseo! — El equipo de Duxiter",
  },
};

export async function sendPurchaseConfirmation(opts: {
  to: string;
  tourId: string;
  tourTitle: string;
  cityName?: string | null;
  amountLabel: string;
  locale?: "pt" | "en" | "es";
}) {
  if (!KEY) return;
  const l = COPY[opts.locale ?? "en"] ?? COPY.en;
  const playUrl = `${publicEnv.appUrl}/tours/${opts.tourId}/play`;

  const html = `<!doctype html><html><body style="margin:0;background:#0f0f18;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#f4f4fa">
  <div style="max-width:480px;margin:0 auto;padding:32px 24px">
    <div style="font-weight:800;font-size:20px;letter-spacing:-.02em;color:#fff">Duxiter</div>
    <h1 style="font-size:20px;margin:24px 0 8px">${l.heading}</h1>
    <p style="color:#a0a0b8;line-height:1.6;margin:0 0 8px">${l.body(
      escapeHtml(opts.tourTitle),
      escapeHtml(opts.cityName ?? ""),
    )}</p>
    <p style="color:#65657a;font-size:13px;margin:0 0 24px">${opts.amountLabel}</p>
    <a href="${playUrl}" style="display:inline-block;background:#e53935;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600">${l.cta}</a>
    <p style="color:#65657a;font-size:12px;margin-top:32px">${l.foot}</p>
  </div></body></html>`;

  try {
    const resend = new Resend(KEY);
    await resend.emails.send({
      from: FROM,
      to: opts.to,
      subject: l.subject(opts.tourTitle),
      html,
    });
  } catch (err) {
    console.error("purchase email failed", err);
  }
}

function escapeHtml(s: string) {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}
