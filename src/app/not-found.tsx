import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-sm py-16 text-center">
      <p className="text-5xl" aria-hidden>
        🏏
      </p>
      <h1 className="page-title mt-4">Not found</h1>
      <p className="mt-2 text-[14px] text-label-secondary">
        That page has been retired from the squad.
      </p>
      <Link href="/" className="btn-primary mt-6">
        Back to dashboard
      </Link>
    </div>
  );
}
