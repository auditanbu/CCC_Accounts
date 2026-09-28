import type { Metadata } from "next";

import { GroundList } from "@/app/grounds/GroundList";
import { AddGroundForm } from "@/components/GroundForms";
import { EmptyState, Section } from "@/components/ui/Card";
import { getGroundsWithMatches } from "@/lib/queries";
import { isAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Grounds" };

export default async function GroundsPage() {
  const [grounds, admin] = await Promise.all([getGroundsWithMatches(), isAdmin()]);

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
          <GroundList grounds={grounds} admin={admin} />
        )}
      </Section>
    </div>
  );
}
