"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Glassmorphic overlay that slides up from the bottom on phones and centres
 * itself on larger screens — the iOS sheet presentation.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  // Rendered through a portal so the sheet is never nested inside whatever
  // opened it. A sheet containing a form would otherwise land inside a caller's
  // form, and nested <form> elements are invalid — the inner one is dropped and
  // its submit silently posts the outer form instead.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    // Stop the page behind the sheet from scrolling with it.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/25 backdrop-blur-sm"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative max-h-[88dvh] w-full overflow-y-auto rounded-t-3xl bg-canvas shadow-float
                   animate-fade-in-up sm:max-w-lg sm:rounded-3xl"
      >
        <div className="glass sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-black/[0.06] px-4 py-3">
          <h2 className="text-[17px] font-semibold tracking-[-0.01em]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-[15px] font-medium text-ios-blue active:opacity-60"
          >
            Done
          </button>
        </div>

        <div className="px-4 py-4 pb-safe">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
