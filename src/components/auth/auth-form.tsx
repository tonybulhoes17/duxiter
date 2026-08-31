"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";

type Mode = "login" | "signup";

export function AuthForm({ mode }: { mode: Mode }) {
  const t = useTranslations("auth");
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/cities";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState<null | "email" | "google" | "apple">(null);

  const supabase = useMemo(
    () => (isSupabaseConfigured ? createClient() : null),
    [],
  );
  const redirectTo = `${typeof window !== "undefined" ? window.location.origin : ""}/auth/callback?next=${encodeURIComponent(next)}`;

  async function oauth(provider: "google" | "apple") {
    if (!supabase) return toast.error(t("genericError"));
    setLoading(provider);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    });
    if (error) {
      setLoading(null);
      toast.error(error.message);
    }
  }

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return toast.error(t("genericError"));
    setLoading("email");

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: redirectTo },
      });
      setLoading(null);
      if (error) return toast.error(error.message);
      toast.success(t("checkEmail"));
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(null);
    if (error) return toast.error(error.message);
    router.push(next);
    router.refresh();
  }

  return (
    <div className="w-full max-w-sm">
      <h1 className="font-display text-2xl font-bold">
        {mode === "login" ? t("loginTitle") : t("signupTitle")}
      </h1>
      <p className="mt-1 text-sm text-text-secondary">
        {mode === "login" ? t("loginSubtitle") : t("signupSubtitle")}
      </p>

      <div className="mt-6 flex flex-col gap-2">
        <Button
          variant="outline"
          onClick={() => oauth("google")}
          disabled={loading !== null}
        >
          {loading === "google" ? <Loader2 className="size-4 animate-spin" /> : null}
          {t("continueWithGoogle")}
        </Button>
        <Button
          variant="outline"
          onClick={() => oauth("apple")}
          disabled={loading !== null}
        >
          {loading === "apple" ? <Loader2 className="size-4 animate-spin" /> : null}
          {t("continueWithApple")}
        </Button>
      </div>

      <div className="my-5 flex items-center gap-3 text-xs text-text-muted">
        <span className="h-px flex-1 bg-border" />
        {t("orEmail")}
        <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={submitEmail} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">{t("email")}</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">{t("password")}</Label>
          <Input
            id="password"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={loading !== null}>
          {loading === "email" ? <Loader2 className="size-4 animate-spin" /> : null}
          {mode === "login" ? t("loginButton") : t("signupButton")}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-text-secondary">
        {mode === "login" ? t("noAccount") : t("hasAccount")}{" "}
        <Link
          href={mode === "login" ? "/signup" : "/login"}
          className="font-medium text-text-primary underline underline-offset-4"
        >
          {mode === "login" ? t("signupButton") : t("loginButton")}
        </Link>
      </p>
    </div>
  );
}
