import type { Metadata } from "next";

import { FieldPlanner } from "@/app/field/FieldPlanner";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Field set" };

export default async function FieldPage() {
  const players = await prisma.player.findMany({
    where: { status: "ACTIVE" },
    orderBy: [{ name: "asc" }],
    select: { id: true, name: true, jerseyNumber: true },
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Field set</h1>
        <p className="mt-1 text-[14px] text-label-secondary">
          Plan the field, then share it to the group or save it to your photos.
        </p>
      </div>

      <FieldPlanner players={players} />
    </div>
  );
}
