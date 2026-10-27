import type { Metadata } from "next";

import { FieldPlanner } from "@/app/field/FieldPlanner";
import { getDeviceId } from "@/lib/device";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Field set" };

export default async function FieldPage() {
  const [players, sets, admin, device] = await Promise.all([
    prisma.player.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ name: "asc" }],
      select: { id: true, name: true, jerseyNumber: true },
    }),
    prisma.fieldSet.findMany({ orderBy: { updatedAt: "desc" } }),
    isAdmin(),
    getDeviceId(),
  ]);

  // The owner's phone id stays on the server; the page only learns what this
  // viewer may do with each set.
  const mine = (s: (typeof sets)[number]) => !s.byAdmin && device !== null && s.ownerKey === device;
  const savedSets = sets.map((s) => ({
    id: s.id,
    name: s.name,
    savedBy: s.savedBy,
    byAdmin: s.byAdmin,
    updatedAt: s.updatedAt.toISOString(),
    canEdit: admin || mine(s),
    data: s.data,
  }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Field set</h1>
        <p className="mt-1 text-[14px] text-label-secondary">
          Plan the field, then share it to the group or save it to your photos.
        </p>
      </div>

      <FieldPlanner
        players={players}
        savedSets={savedSets}
        admin={admin}
        myCount={sets.filter(mine).length}
      />
    </div>
  );
}
