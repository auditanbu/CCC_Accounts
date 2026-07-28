import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { MatchForm } from "@/components/MatchForm";
import { ChevronLeftIcon } from "@/components/ui/Icons";
import { createMatchAction } from "@/app/actions/matches";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "New match" };

export default async function NewMatchPage() {
  if (!(await isAdmin())) redirect("/login?next=/matches/new");

  const [grounds, tournaments] = await Promise.all([
    prisma.ground.findMany({ orderBy: { name: "asc" } }),
    prisma.tournament.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <Link
          href="/matches"
          className="mb-2 inline-flex items-center gap-1 text-[14px] font-medium text-ios-blue"
        >
          <ChevronLeftIcon width={16} height={16} />
          Matches
        </Link>
        <h1 className="page-title">New match</h1>
        <p className="mt-1 text-[14px] text-label-secondary">
          Create the fixture first — roster and accounts come next.
        </p>
      </div>

      {grounds.length === 0 ? (
        <div className="card-pad space-y-3">
          <p className="text-[15px] font-semibold">Add a ground first</p>
          <p className="text-[13px] text-label-secondary">
            Every match needs a venue. Add one, then come back here.
          </p>
          <Link href="/grounds" className="btn-primary w-full sm:w-auto">
            Go to grounds
          </Link>
        </div>
      ) : (
        <MatchForm
          action={createMatchAction}
          grounds={grounds}
          tournaments={tournaments}
          submitLabel="Create match"
        />
      )}
    </div>
  );
}
