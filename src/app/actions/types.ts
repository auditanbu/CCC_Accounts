import { ZodError } from "zod";

/** Shared shape for every form action, consumed by `useActionState`. */
export type ActionState = {
  ok: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
  /**
   * Set by create actions so a caller can act on the new record without a
   * round trip — used to select a just-created tournament in the match form,
   * or to drop a just-created player straight into a match's roster.
   */
  created?: {
    id: number;
    name: string;
    overs?: number;
    groundIds?: number[];
    jerseyNumber?: number;
    defaultMatchFee?: number;
  };
};

export const idleState: ActionState = { ok: false };

export function zodToFieldErrors(err: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/**
 * Wraps an action body so validation and DB failures surface as form errors
 * instead of a crashed request. `redirect()` throws by design, so its control
 * flow signal is re-thrown untouched.
 */
export async function runAction(fn: () => Promise<ActionState>): Promise<ActionState> {
  try {
    return await fn();
  } catch (err) {
    if (isNextControlFlow(err)) throw err;
    if (err instanceof ZodError) {
      return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: zodToFieldErrors(err) };
    }
    const message = err instanceof Error ? err.message : "Something went wrong.";
    return { ok: false, error: humanise(message) };
  }
}

function isNextControlFlow(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "digest" in err &&
    typeof (err as { digest?: unknown }).digest === "string" &&
    ((err as { digest: string }).digest.startsWith("NEXT_REDIRECT") ||
      (err as { digest: string }).digest === "NEXT_NOT_FOUND")
  );
}

/** Turn common Prisma constraint errors into something a captain can act on. */
function humanise(message: string): string {
  if (message.includes("Unique constraint failed")) {
    if (message.includes("jerseyNumber")) return "That jersey number is already taken.";
    if (message.includes("name")) return "That name already exists.";
    return "That record already exists.";
  }
  if (message.includes("Foreign key constraint")) {
    return "That item is still linked to other records and can't be removed.";
  }
  if (message.includes("Can't reach database server") || message.includes("P1001")) {
    return "Can't reach the database. Check DATABASE_URL.";
  }
  return message;
}
