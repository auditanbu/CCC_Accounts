"use client";

import { useEffect, useRef, useState } from "react";

import { CheckIcon, ShareIcon } from "@/components/ui/Icons";

type Status = "idle" | "copied" | "error";

/**
 * Copies the pre-rendered WhatsApp summary to the clipboard.
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

  async function copy() {
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

  const waHref = `https://wa.me/?text=${encodeURIComponent(text)}`;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={copy}
          className={status === "copied" ? "btn-success flex-1" : "btn-primary flex-1"}
        >
          {status === "copied" ? (
            <>
              <CheckIcon width={17} height={17} />
              Copied to clipboard
            </>
          ) : (
            <>
              <ShareIcon width={17} height={17} />
              Copy summary for WhatsApp
            </>
          )}
        </button>

        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary sm:w-auto"
        >
          Open WhatsApp
        </a>
      </div>

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
