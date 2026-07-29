import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { MatchForm } from "@/components/MatchForm";
import { ConfirmSubmit } from "@/components/ui/Form";
import { ChevronLeftIcon, TrashIcon } from "@/components/ui/Icons";
import { deleteMatchAction, updateMatchAction } from "@/app/actions/matches";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Edit match" };

export default async function EditMatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const matchId = Number(id);
  if (!Number.isInteger(matchId)) notFound();

  if (!(await isAdmin())) redirect(`/login?next=/matches/${matchId}/edit`);

  const [match, grounds, tournaments] = await Promise.all([
    prisma.match.findUnique({ where: { id: matchId } }),
    prisma.ground.findMany({ orderBy: { name: "asc" } }),
    prisma.tournament.findMany({
      orderBy: { name: "asc" },
      // The form narrows its ground list to the venues of the chosen tournament.
      include: { grounds: { select: { id: true } } },
    }),
  ]);
  if (!match) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <Link
          href={`/matches/${match.id}`}
          className="mb-2 inline-flex items-center gap-1 text-[14px] font-medium text-ios-blue"
        >
          <ChevronLeftIcon width={16} height={16} />
          Match
        </Link>
        <h1 className="page-title">Edit match</h1>
      </div>

      <MatchForm
        action={updateMatchAction}
        grounds={grounds}
        tournaments={tournaments.map((t) => ({
          ...t,
          groundIds: t.grounds.map((g) => g.id),
        }))}
        initial={match}
        submitLabel="Save changes"
      />

      <div className="card-pad">
        <p className="text-[15px] font-semibold">Delete this match</p>
        <p className="mb-3 mt-1 text-[13px] text-label-secondary">
          Removes the fixture along with its roster, collections and expenses. This can&apos;t be
          undone.
        </p>
        <form action={deleteMatchAction}>
          <input type="hidden" name="id" value={match.id} />
          <ConfirmSubmit
            message={`Delete the match vs ${match.opponentTeam}? Its collections and expenses will be removed too.`}
            className="btn-destructive w-full sm:w-auto"
          >
            <TrashIcon width={16} height={16} />
            Delete match
          </ConfirmSubmit>
        </form>
      </div>
    </div>
  );
}
