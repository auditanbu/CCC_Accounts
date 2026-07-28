"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { OVERS_OPTIONS } from "@/lib/constants";
import { type ActionState, runAction } from "@/app/actions/types";

const tournamentSchema = z.object({
  name: z.string().trim().min(1, "Tournament name is required.").max(100),
  overs: z.coerce
    .number()
    .int()
    .refine((v) => (OVERS_OPTIONS as readonly number[]).includes(v), "Pick a valid overs option."),
  totalFee: z.coerce.number().min(0, "Fee can't be negative."),
});

function revalidateTournaments(id?: number) {
  revalidatePath("/tournaments");
  revalidatePath("/matches");
  revalidatePath("/");
  if (id) revalidatePath(`/tournaments/${id}`);
}

function parse(formData: FormData) {
  return tournamentSchema.parse({
    name: formData.get("name"),
    overs: formData.get("overs"),
    totalFee: formData.get("totalFee") ?? 0,
  });
}

export async function createTournamentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    await requireAdmin();
    const data = parse(formData);
    await prisma.tournament.create({ data });
    revalidateTournaments();
    return { ok: true, message: `${data.name} added.` };
  });
}

export async function updateTournamentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    await requireAdmin();
    const id = z.coerce.number().int().parse(formData.get("id"));
    const data = parse(formData);
    await prisma.tournament.update({ where: { id }, data });
    revalidateTournaments(id);
    return { ok: true, message: "Tournament updated." };
  });
}

export async function deleteTournamentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    await requireAdmin();
    const id = z.coerce.number().int().parse(formData.get("id"));
    const used = await prisma.match.count({ where: { tournamentId: id } });
    if (used > 0) {
      return {
        ok: false,
        error: `This tournament has ${used} match${used === 1 ? "" : "es"} linked and can't be deleted.`,
      };
    }
    await prisma.tournament.delete({ where: { id } });
    revalidateTournaments();
    return { ok: true, message: "Tournament deleted." };
  });
}
