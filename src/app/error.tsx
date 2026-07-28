"use client";

import { useEffect, useState } from "react";

type Health =
  | { state: "checking" }
  | { state: "ok" }
  | { state: "degraded"; detail: string }
  | { state: "unknown" };

/**
 * Error boundary that diagnoses itself.
 *
 * Next.js redacts server error messages in production before they reach the
 * browser, so `error.message` here is a generic placeholder and tells the
 * reader nothing. Instead of guessing from it, ask /api/health — which runs on
 * the server and can see the real failure — and report what it says.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [health, setHealth] = useState<Health>({ state: "checking" });

  useEffect(() => {
    console.error(error);
    let cancelled = false;

    fetch("/api/health", { cache: "no-store" })
      .then(async (res) => {
        const body = (await res.json().catch(() => ({}))) as {
          database?: string;
          error?: string;
        };
        if (cancelled) return;
        if (res.ok && body.database === "connected") {
          setHealth({ state: "ok" });
        } else {
          setHealth({
            state: "degraded",
            detail: body.error ?? "The database did not respond.",
          });
        }
      })
      .catch(() => {
        if (!cancelled) setHealth({ state: "unknown" });
      });

    return () => {
      cancelled = true;
    };
  }, [error]);

  return (
    <div className="mx-auto max-w-md py-14 text-center">
      <p className="text-5xl" aria-hidden>
        ⚠️
      </p>
      <h1 className="page-title mt-4">Something went wrong</h1>

      {health.state === "checking" ? (
        <p className="mt-2 text-[14px] text-label-secondary">Checking the connection…</p>
      ) : null}

      {health.state === "degraded" ? (
        <>
          <p className="mt-2 text-[14px] leading-relaxed text-label-secondary">
            The app is running, but it can&apos;t reach its database. This is almost always the{" "}
            <code className="rounded bg-black/[0.06] px-1 py-0.5 text-[13px]">DATABASE_URL</code>{" "}
            environment variable.
          </p>
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words rounded-xl bg-ios-red/[0.07] p-3 text-left text-[12px] leading-relaxed text-ios-red">
            {health.detail}
          </pre>
          <ul className="mt-3 space-y-1.5 text-left text-[13px] text-label-secondary">
            <li>• Check the variable is set on the deployed service, not only locally.</li>
            <li>
              • On a long-running container, use the database&apos;s <strong>direct</strong>{" "}
              connection (Postgres port 5432) rather than a pooler.
            </li>
            <li>• Confirm the password in the string has no unescaped special characters.</li>
          </ul>
        </>
      ) : null}

      {health.state === "ok" ? (
        <p className="mt-2 text-[14px] leading-relaxed text-label-secondary">
          The database is reachable, so this is a problem with the page itself rather than the
          connection. The reference below identifies it in the server logs.
        </p>
      ) : null}

      {health.state === "unknown" ? (
        <p className="mt-2 text-[14px] leading-relaxed text-label-secondary">
          An unexpected error stopped this page from loading, and the health check couldn&apos;t
          be reached either.
        </p>
      ) : null}

      <div className="mt-6 flex justify-center gap-2">
        <button type="button" onClick={reset} className="btn-primary">
          Try again
        </button>
        <a href="/api/health" className="btn-secondary" target="_blank" rel="noreferrer">
          View health
        </a>
      </div>

      {error.digest ? (
        <p className="mt-4 text-[12px] text-label-tertiary">
          Reference: <code className="tnum">{error.digest}</code>
        </p>
      ) : null}
    </div>
  );
}
