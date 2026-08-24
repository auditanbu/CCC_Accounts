"use client";

import { useState, type ReactNode } from "react";

import { ChevronRightIcon } from "@/components/ui/Icons";

/** Collapsed-by-default section that unfolds on click — e.g. completed tournaments. */
export function Disclosure({
  title,
  children,
  defaultOpen = false,
}: {
  title: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="space-y-2.5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 py-0.5 text-left"
      >
        <span className="section-title">{title}</span>
        <ChevronRightIcon
          className={`shrink-0 text-label-tertiary transition-transform duration-200 ${
            open ? "rotate-90" : ""
          }`}
        />
      </button>
      {open ? <div className="space-y-3">{children}</div> : null}
    </section>
  );
}
