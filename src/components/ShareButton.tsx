"use client";

import { useEffect, useRef, useState } from "react";

import { CheckIcon, ShareIcon } from "@/components/ui/Icons";

type Status = "idle" | "copied" | "error";

/** The team's WhatsApp group — the message is copied, then this is opened so
 * it can be pasted straight in (WhatsApp has no API to pre-fill a group's
 * message from a link, so pasting is still a manual last step). */
const WHATSAPP_GROUP_URL = "https://chat.whatsapp.com/LKsSaTjsiYXLf80aeUEbQa";

/**
 * Copies the pre-rendered WhatsApp summary to the clipboard and opens the
 * team's group chat so it can be pasted in.
 *
 * `navigator.clipboard` needs a secure context, which a plain-http Railway
 * preview or an in-app browser may not provide, so there's a textarea
 * fallback plus a visible copy of the text to select by hand.
 */
export function ShareButton({ text }: { text: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const [showPreview, setShowPreview] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function flash(next: Status) {
    setStatus(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setStatus("idle"), 2400);
  }

  function copyAndOpen() {
    // Opened synchronously, in the same click handler, so browsers don't
    // treat it as an unrequested popup — an await before this would.
    window.open(WHATSAPP_GROUP_URL, "_blank", "noopener,noreferrer");
    void copyText();
  }

  async function copyText() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else if (!legacyCopy(text)) {
        throw new Error("copy unavailable");
      }
      flash("copied");
    } catch {
      setShowPreview(true);
      flash("error");
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={copyAndOpen}
        className={status === "copied" ? "btn-success w-full" : "btn-primary w-full"}
      >
        {status === "copied" ? (
          <>
            <CheckIcon width={17} height={17} />
            Copied — paste it in WhatsApp
          </>
        ) : (
          <>
            <ShareIcon width={17} height={17} />
            Copy & open WhatsApp group
          </>
        )}
      </button>

      {status === "error" ? (
        <p role="alert" className="text-[13px] font-medium text-ios-red">
          Couldn&apos;t reach the clipboard — select the text below and copy it manually.
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => setShowPreview((v) => !v)}
        className="text-[13px] font-medium text-ios-blue"
      >
        {showPreview ? "Hide preview" : "Preview message"}
      </button>

      {showPreview ? (
        <pre className="animate-fade-in-up overflow-x-auto whitespace-pre-wrap break-words rounded-xl bg-black/[0.04] p-3.5 text-[13px] leading-relaxed text-label">
          {text}
        </pre>
      ) : null}
    </div>
  );
}

/** execCommand path for browsers without the async Clipboard API. */
function legacyCopy(text: string): boolean {
  const el = document.createElement("textarea");
  el.value = text;
  el.setAttribute("readonly", "");
  el.style.position = "fixed";
  el.style.opacity = "0";
  document.body.appendChild(el);
  el.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  document.body.removeChild(el);
  return ok;
}
