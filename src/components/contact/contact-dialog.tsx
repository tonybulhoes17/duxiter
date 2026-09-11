"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, Mail, Send } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type Status = "idle" | "sending" | "sent" | "error";

export function ContactDialog({
  trigger,
}: {
  /** Custom trigger. Defaults to a small, discreet text link. */
  trigger?: React.ReactNode;
}) {
  const t = useTranslations("contact");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message, locale }),
      });
      if (!res.ok) throw new Error("failed");
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      // reset a beat after close animation
      setTimeout(() => {
        setStatus("idle");
        setName("");
        setEmail("");
        setMessage("");
      }, 200);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-secondary"
          >
            <Mail className="size-3.5" />
            {t("cta")}
          </button>
        )}
      </DialogTrigger>
      <DialogContent>
        {status === "sent" ? (
          <div className="py-4 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Send className="size-5" />
            </div>
            <h3 className="mt-4 font-heading text-base font-semibold">
              {t("successTitle")}
            </h3>
            <p className="mt-1 text-sm text-text-secondary">{t("successBody")}</p>
            <Button className="mt-5 w-full" onClick={() => onOpenChange(false)}>
              {t("close")}
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{t("title")}</DialogTitle>
              <DialogDescription>{t("subtitle")}</DialogDescription>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="contact-name">{t("name")}</Label>
                <Input
                  id="contact-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  minLength={2}
                  maxLength={120}
                  disabled={status === "sending"}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contact-email">{t("email")}</Label>
                <Input
                  id="contact-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  maxLength={200}
                  disabled={status === "sending"}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contact-message">{t("message")}</Label>
                <Textarea
                  id="contact-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  minLength={10}
                  maxLength={4000}
                  placeholder={t("messagePlaceholder")}
                  disabled={status === "sending"}
                />
              </div>
              {/* honeypot: hidden from real users, bots tend to fill every field */}
              <input
                type="text"
                name="company"
                tabIndex={-1}
                autoComplete="off"
                className="hidden"
                aria-hidden="true"
              />
              {status === "error" && (
                <p className="text-sm text-destructive">{t("errorBody")}</p>
              )}
              <Button type="submit" className="w-full" disabled={status === "sending"}>
                {status === "sending" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                {t("send")}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
