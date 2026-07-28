"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";
import type { ActionState } from "@/app/actions/types";

export function SubmitButton({
  children,
  className = "btn-primary",
  pendingLabel,
  disabled,
}: {
  children: ReactNode;
  className?: string;
  pendingLabel?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={cn(className)} disabled={pending || disabled}>
      {pending ? (
        <>
          <Spinner />
          {pendingLabel ?? "Saving…"}
        </>
      ) : (
        children
      )}
    </button>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent",
        className,
      )}
      aria-hidden
    />
  );
}

/** Inline success / error banner driven by an action's return value. */
export function FormMessage({ state }: { state: ActionState }) {
  if (state.error) {
    return (
      <p
        role="alert"
        className="rounded-xl bg-ios-red/10 px-3.5 py-2.5 text-[13px] font-medium text-ios-red"
      >
        {state.error}
      </p>
    );
  }
  if (state.ok && state.message) {
    return (
      <p
        role="status"
        className="rounded-xl bg-ios-green/10 px-3.5 py-2.5 text-[13px] font-medium text-[#248A3D]"
      >
        {state.message}
      </p>
    );
  }
  return null;
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && !error ? (
        <p className="mt-1.5 text-[12px] text-label-secondary">{hint}</p>
      ) : null}
      {error ? <p className="field-error">{error}</p> : null}
    </div>
  );
}

/** Destructive submit that asks first — browser confirm keeps it dependency-free. */
export function ConfirmSubmit({
  children,
  message,
  className = "btn-destructive",
}: {
  children: ReactNode;
  message: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={cn(className)}
      disabled={pending}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {pending ? <Spinner /> : null}
      {children}
    </button>
  );
}
