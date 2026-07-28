import type { Metadata } from "next";

import { AddGroundForm, EditGroundButton } from "@/components/GroundForms";
import { EmptyState, Section } from "@/components/ui/Card";
import { StadiumIcon } from "@/components/ui/Icons";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Grounds" };

export default async function GroundsPage() {
  const [grounds, admin] = await Promise.all([
    prisma.ground.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { matches: true } } },
    }),
    isAdmin(),
  ]);

  return (
    <div className="space-y-7">
      <div>
        <h1 className="page-title">Grounds</h1>
        <p className="mt-1 text-[14px] text-label-secondary">
          Venues you can pick when creating a match.
        </p>
      </div>

      {admin ? <AddGroundForm /> : null}

      <Section title={`All grounds · ${grounds.length}`}>
        {grounds.length === 0 ? (
          <EmptyState
            icon="🏟"
            title="No grounds yet"
            description={
              admin
                ? "Add a ground so matches have somewhere to be played."
                : "No grounds have been added yet."
            }
          />
        ) : (
          <ul className="list-group">
            {grounds.map((g) => (
              <li key={g.id} className="list-row">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ios-green/10 text-ios-green">
                  <StadiumIcon width={20} height={20} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium">{g.name}</span>
                  <span className="block truncate text-[12px] text-label-secondary">
                    {g.location ?? "No location set"} · {g._count.matches} match
                    {g._count.matches === 1 ? "" : "es"}
                  </span>
                </span>
                {admin ? (
                  <EditGroundButton
                    ground={{ id: g.id, name: g.name, location: g.location }}
                    matchCount={g._count.matches}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
