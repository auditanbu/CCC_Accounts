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
  size = "default",
}: {
  label: string;
  value: number | string;
  tone?: "plain" | "ledger" | "positive" | "negative" | "muted";
  caption?: string;
  accent?: string;
  /** "compact" for a row of many tiles that doesn't need the usual weight. */
  size?: "default" | "compact";
}) {
  const compact = size === "compact";
  return (
    <div className={cn("card relative overflow-hidden", compact ? "p-3" : "p-4")}>
      {accent ? (
        <span className={cn("absolute inset-x-0 top-0 h-[3px]", accent)} aria-hidden />
      ) : null}
      <p
        className={cn(
          "font-semibold uppercase tracking-[0.05em] text-label-secondary",
          compact ? "text-[10px]" : "text-[12px]",
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          "font-bold leading-none tracking-[-0.02em]",
          compact ? "mt-1 text-[16px] sm:text-[18px]" : "mt-1.5 text-[24px] sm:text-[26px]",
        )}
      >
        {typeof value === "number" ? <Money value={value} tone={tone} /> : value}
      </p>
      {caption ? (
        <p className={cn("mt-1.5 text-label-secondary", compact ? "text-[11px]" : "text-[12px]")}>
          {caption}
        </p>
      ) : null}
    </div>
  );
}
