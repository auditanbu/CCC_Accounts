import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format";

/**
 * Money display with sign-aware colouring.
 * `tone="ledger"` colours positive green / negative red, which is what the
 * balance and pending figures want.
 */
export function Money({
  value,
  tone = "plain",
  className,
  showSign = false,
}: {
  value: number;
  tone?: "plain" | "ledger" | "muted" | "positive" | "negative";
  className?: string;
  showSign?: boolean;
}) {
  const toneClass =
    tone === "ledger"
      ? value < 0
        ? "text-ios-red"
        : value > 0
          ? "text-ios-green"
          : "text-label"
      : tone === "muted"
        ? "text-label-secondary"
        : tone === "positive"
          ? "text-ios-green"
          : tone === "negative"
            ? "text-ios-red"
            : "text-label";

  const prefix = showSign && value > 0 ? "+" : "";

  return (
    <span className={cn("tnum", toneClass, className)}>
      {prefix}
      {formatMoney(value)}
    </span>
  );
}

export function StatCard({
  label,
  value,
  tone = "plain",
  caption,
  accent,
}: {
  label: string;
  value: number | string;
  tone?: "plain" | "ledger" | "positive" | "negative" | "muted";
  caption?: string;
  accent?: string;
}) {
  return (
    <div className="card relative overflow-hidden p-4">
      {accent ? (
        <span className={cn("absolute inset-x-0 top-0 h-[3px]", accent)} aria-hidden />
      ) : null}
      <p className="text-[12px] font-semibold uppercase tracking-[0.05em] text-label-secondary">
        {label}
      </p>
      <p className="mt-1.5 text-[24px] font-bold leading-none tracking-[-0.02em] sm:text-[26px]">
        {typeof value === "number" ? <Money value={value} tone={tone} /> : value}
      </p>
      {caption ? <p className="mt-1.5 text-[12px] text-label-secondary">{caption}</p> : null}
    </div>
  );
}
