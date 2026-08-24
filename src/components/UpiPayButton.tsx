"use client";

import { useState, type ReactNode } from "react";

import { Sheet } from "@/components/ui/Sheet";
import { WalletIcon } from "@/components/ui/Icons";
import { UPI_APPS, buildUpiAppLink, type UpiAppId } from "@/lib/upi";

/**
 * Brand-coloured badges, not the apps' actual logo art — there's no way to
 * fetch or bundle the real trademarked assets here, so this is the safer
 * stand-in. Still unambiguous: each is paired with the app's full name.
 */
const APP_BADGE: Record<UpiAppId, { bg: string; fg: string; letter: string }> = {
  gpay: { bg: "#FFFFFF", fg: "#4285F4", letter: "G" },
  phonepe: { bg: "#5F259F", fg: "#FFFFFF", letter: "P" },
  bhim: { bg: "#00447C", fg: "#FFFFFF", letter: "B" },
};

/** "Pay via UPI" button that opens a picker for Google Pay / PhonePe / BHIM,
 * each going straight to that app's own confirm-payment screen. */
export function UpiPayButton({
  note,
  amount,
  className = "btn-primary btn-sm w-full sm:w-auto",
  children,
}: {
  /** Transaction note shown to the payer — varies by where this is used. */
  note: string;
  /** Pre-fills the amount when known, so the payer doesn't have to type it. */
  amount?: number;
  className?: string;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {children ?? (
          <>
            <WalletIcon width={16} height={16} />
            Pay via UPI
          </>
        )}
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="Pay via UPI">
        <ul className="list-group">
          {UPI_APPS.map((app) => {
            const badge = APP_BADGE[app.id];
            return (
              <li key={app.id}>
                <a
                  href={buildUpiAppLink(app.id, note, amount)}
                  onClick={() => setOpen(false)}
                  className="list-row-link"
                >
                  <span
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-[17px] font-bold ring-1 ring-black/[0.06]"
                    style={{ backgroundColor: badge.bg, color: badge.fg }}
                    aria-hidden
                  >
                    {badge.letter}
                  </span>
                  <span className="min-w-0 flex-1 text-[15px] font-medium">{app.name}</span>
                </a>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-[12px] text-label-secondary">
          If nothing happens after picking one, that app isn&apos;t installed on this phone.
        </p>
      </Sheet>
    </>
  );
}
