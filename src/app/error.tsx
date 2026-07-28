"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const looksLikeDb =
    error.message.includes("DATABASE_URL") ||
    error.message.includes("P1001") ||
    error.message.includes("Can't reach database");

  return (
    <div className="mx-auto max-w-sm py-16 text-center">
      <p className="text-5xl" aria-hidden>
        ⚠️
      </p>
      <h1 className="page-title mt-4">Something went wrong</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-label-secondary">
        {looksLikeDb
          ? "The app can't reach the database. Check that DATABASE_URL is set and migrations have run."
          : "An unexpected error stopped this page from loading."}
      </p>
      <button type="button" onClick={reset} className="btn-primary mt-6">
        Try again
      </button>
    </div>
  );
}
