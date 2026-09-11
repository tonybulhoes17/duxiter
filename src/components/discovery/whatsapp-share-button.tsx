"use client";

import type { ButtonHTMLAttributes, MouseEvent } from "react";

interface WhatsappShareButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  /** Full message, including the link — this is what shows up pre-filled in WhatsApp. */
  message: string;
}

/**
 * Opens WhatsApp (the app on mobile, web.whatsapp.com on desktop) with a
 * pre-filled message, so the user just picks who to send it to. No styling
 * of its own — pass className/children to match wherever it's placed.
 */
export function WhatsappShareButton({
  message,
  onClick,
  children,
  ...props
}: WhatsappShareButtonProps) {
  function handleClick(e: MouseEvent<HTMLButtonElement>) {
    onClick?.(e);
    if (e.defaultPrevented) return;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  return (
    <button type="button" onClick={handleClick} {...props}>
      {children}
    </button>
  );
}
