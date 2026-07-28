"use client";

import { useActionState, useState } from "react";

import { loginAction } from "@/app/actions/auth";
import { idleState } from "@/app/actions/types";
import { Field, FormMessage, SubmitButton } from "@/components/ui/Form";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(loginAction, idleState);
  const [reveal, setReveal] = useState(false);

  return (
    <form action={action} className="card-pad space-y-4">
      <input type="hidden" name="next" value={next ?? "/"} />

      <Field
        label="Team PIN"
        htmlFor="pin"
        error={state.fieldErrors?.pin}
        hint="Any length — whatever is set as ADMIN_PIN."
      >
        <div className="relative">
          <input
            id="pin"
            name="pin"
            type={reveal ? "text" : "password"}
            inputMode="numeric"
            /*
             * Not "current-password". That invites the browser's password
             * manager to autofill a saved credential from elsewhere, which
             * silently replaces whatever the admin types and fails the sign-in
             * for no visible reason. "one-time-code" is the closest standard
             * value that password managers leave alone.
             */
            autoComplete="one-time-code"
            data-1p-ignore
            data-lpignore="true"
            autoFocus
            placeholder="Enter PIN"
            className="input pr-16 text-center text-[19px] tracking-[0.15em]
                       placeholder:text-[15px] placeholder:tracking-normal"
          />
          <button
            type="button"
            onClick={() => setReveal((v) => !v)}
            className="absolute inset-y-0 right-0 px-3 text-[13px] font-medium text-ios-blue"
            aria-label={reveal ? "Hide PIN" : "Show PIN"}
          >
            {reveal ? "Hide" : "Show"}
          </button>
        </div>
      </Field>

      <FormMessage state={state} />

      <SubmitButton className="btn-primary w-full" pendingLabel="Checking…">
        Sign in
      </SubmitButton>
    </form>
  );
}
