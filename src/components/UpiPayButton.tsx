import type { ReactNode } from "react";

import { WalletIcon } from "@/components/ui/Icons";
import { buildUpiLink } from "@/lib/upi";

/**
 * "Pay via UPI" — a plain link on the standard upi:// scheme, so the OS
 * offers whichever UPI apps are installed and the payment lands in the
 * picked app's ordinary P2P flow.
 *
 * There's no in-app app picker any more: choosing the app here meant using
 * that app's own scheme, and Google Pay's rejects personal-VPA payments that
 * don't carry merchant credentials (see buildUpiLink). Letting the OS choose
 * costs one extra tap and works.
 */
export function UpiPayButton({
  note,
  amount,
  className = "btn-primary btn-sm w-full sm:w-auto",
  children,
}: {
  /** Transaction note shown to the payer. Omitted where they fill their own. */
  note?: string;
  /** Pre-fills the amount. Omitted where the payer chooses how much to pay. */
  amount?: number;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <a href={buildUpiLink(note, amount)} className={className}>
      {children ?? (
        <>
          <WalletIcon width={16} height={16} />
          Pay via UPI
        </>
      )}
    </a>
  );
}
