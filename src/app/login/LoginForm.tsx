"use client";

import { useActionState } from "react";

import { loginAction } from "@/app/actions/auth";
import { idleState } from "@/app/actions/types";
import { Field, FormMessage, SubmitButton } from "@/components/ui/Form";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(loginAction, idleState);

  return (
    <form action={action} className="card-pad space-y-4">
      <input type="hidden" name="next" value={next ?? "/"} />

      <Field label="Team PIN" htmlFor="pin" error={state.fieldErrors?.pin}>
        <input
          id="pin"
          name="pin"
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          autoFocus
          placeholder="••••••"
          className="input text-center text-[22px] tracking-[0.4em]"
        />
      </Field>

      <FormMessage state={state} />

      <SubmitButton className="btn-primary w-full" pendingLabel="Checking…">
        Sign in
      </SubmitButton>
    </form>
  );
}
