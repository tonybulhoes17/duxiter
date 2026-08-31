import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Plus_Jakarta_Sans, Inter, JetBrains_Mono } from "next/font/google";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { Providers } from "@/components/providers";
import { AudioProvider } from "@/components/audio/audio-provider";
import { PlayerBar } from "@/components/audio/player-bar";
import { SiteHeader } from "@/components/nav/site-header";
import { MobileNav } from "@/components/nav/mobile-nav";
import { getSessionUser } from "@/lib/auth";
import "./globals.css";

const display = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});
const body = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("brand");
  return {
    title: { default: "Duxiter", template: "%s · Duxiter" },
    description: t("tagline"),
    manifest: "/manifest.json",
    applicationName: "Duxiter",
    appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Duxiter" },
    icons: {
      icon: "/icons/icon-192.png",
      apple: "/icons/apple-touch-icon.png",
    },
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  };
}

export const viewport: Viewport = {
  themeColor: "#0F0F18",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();
  const user = await getSessionUser();

  const pathname = headers().get("x-pathname") ?? "";
  const immersive = pathname.includes("/play") || pathname.startsWith("/admin");

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${display.variable} ${body.variable} ${mono.variable} min-h-dvh antialiased`}
      >
        <Providers locale={locale} messages={messages}>
          <AudioProvider>
            {immersive ? (
              <main className="min-h-dvh">{children}</main>
            ) : (
              <>
                <SiteHeader />
                <main className="min-h-[calc(100dvh-4rem)] pb-20 md:pb-0">
                  {children}
                </main>
                <MobileNav authed={!!user} />
              </>
            )}
            <PlayerBar />
          </AudioProvider>
        </Providers>
      </body>
    </html>
  );
}
