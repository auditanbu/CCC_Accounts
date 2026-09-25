"use client";

import Link from "next/link";
import { useState } from "react";

import { EditGroundButton } from "@/components/GroundForms";
import { ResultBadge } from "@/components/MatchCard";
import { ChevronRightIcon, PinIcon, StadiumIcon } from "@/components/ui/Icons";
import { TEAM_NAME } from "@/lib/constants";
import { formatDateDotted } from "@/lib/format";
import type { GroundMatchRow, GroundWithMatches } from "@/lib/queries";

function MatchLine({ m }: { m: GroundMatchRow }) {
  return (
    <Link
      href={`/matches/${m.id}`}
      className="block rounded-xl bg-black/[0.03] p-2.5 transition-colors active:bg-black/[0.06]"
    >
      <div className="flex items-center gap-1.5">
        <span className="badge shrink-0 bg-black/[0.06] text-label-secondary">
          {formatDateDotted(m.date)}
        </span>
        {m.upcoming ? (
          <span className="badge shrink-0 bg-ios-orange/10 text-ios-orange">Upcoming</span>
        ) : null}
        {m.result ? <ResultBadge result={m.result} /> : null}
        <span className="ml-auto truncate text-[13px] text-label-secondary">
          vs {m.opponentTeam}
        </span>
      </div>
      {m.ourScore || m.opponentScore ? (
        <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[13px]">
          <span className="tnum font-semibold">
            {TEAM_NAME} {m.ourScore ?? "—"}
          </span>
          <span className="text-label-tertiary">vs</span>
          <span className="tnum text-label-secondary">
            {m.opponentTeam} {m.opponentScore ?? "—"}
          </span>
        </div>
      ) : (
        <p className="mt-1.5 text-[13px] text-label-tertiary">
          {m.upcoming ? "Not played yet" : "Scores not recorded yet"}
        </p>
      )}
      {m.tournamentName ? (
        <p className="mt-1 truncate text-[12px] text-ios-indigo">🏆 {m.tournamentName}</p>
      ) : (
        <p className="mt-1 text-[12px] text-label-tertiary">Practice match</p>
      )}
    </Link>
  );
}

/**
 * The grounds list, where tapping a venue unfolds the matches played there.
 *
 * One at a time: the lists run to a screenful on a phone, so leaving the
 * previous venue open would push the rest of the grounds out of reach.
 */
export function GroundList({
  grounds,
  admin,
}: {
  grounds: GroundWithMatches[];
  admin: boolean;
}) {
  const [openId, setOpenId] = useState<number | null>(null);

  return (
    <ul className="list-group">
      {grounds.map((g) => {
        const open = openId === g.id;
        const count = g.matches.length;
        const meta = `${g.location ?? "No location set"} · ${count} match${count === 1 ? "" : "es"}`;

        return (
          <li key={g.id} className="border-t border-separator/70 first:border-t-0">
            <div className="list-row">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ios-green/10 text-ios-green">
                <StadiumIcon width={20} height={20} />
              </span>

              <span className="min-w-0 flex-1">
                {/* A ground with nothing played at it has nothing to unfold, so
                    it stays plain text rather than offering a tap that does
                    nothing. The Directions link sits outside the toggle — a
                    link nested in a button is neither valid nor tappable. */}
                {count === 0 ? (
                  <>
                    <span className="block truncate text-[15px] font-medium">{g.name}</span>
                    <span className="block truncate text-[12px] text-label-secondary">{meta}</span>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : g.id)}
                    aria-expanded={open}
                    className="flex w-full items-center gap-1 text-left active:opacity-60"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-medium">{g.name}</span>
                      <span className="block truncate text-[12px] text-label-secondary">
                        {meta}
                      </span>
                    </span>
                    <ChevronRightIcon
                      width={15}
                      height={15}
                      className={`shrink-0 text-label-tertiary transition-transform duration-200 ${
                        open ? "rotate-90" : ""
                      }`}
                    />
                  </button>
                )}

                {g.googleMapUrl ? (
                  <a
                    href={g.googleMapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-0.5 inline-flex items-center gap-1 text-[12px] font-medium text-ios-blue"
                  >
                    <PinIcon width={12} height={12} strokeWidth={2} />
                    Directions
                  </a>
                ) : null}
              </span>

              {admin ? (
                <EditGroundButton
                  ground={{
                    id: g.id,
                    name: g.name,
                    location: g.location,
                    googleMapUrl: g.googleMapUrl,
                  }}
                  matchCount={count}
                />
              ) : null}
            </div>

            {open ? (
              <ul className="animate-fade-in-up space-y-2 px-4 pb-3.5">
                {g.matches.map((m) => (
                  <li key={m.id}>
                    <MatchLine m={m} />
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
