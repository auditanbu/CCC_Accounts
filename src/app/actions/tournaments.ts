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
  totalMatches: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? Number(v) : null))
    .refine(
      (v) => v === null || (Number.isInteger(v) && v > 0 && v <= 200),
      "Number of matches must be a whole number between 1 and 200.",
    ),
  groundIds: z.array(z.coerce.number().int().positive()).default([]),
});

function revalidateTournaments(id?: number) {
  revalidatePath("/tournaments");
  revalidatePath("/matches");
  revalidatePath("/");
  if (id) revalidatePath(`/tournaments/${id}`);
}

function parse(formData: FormData) {
  const { groundIds, ...rest } = tournamentSchema.parse({
    name: formData.get("name"),
    overs: formData.get("overs"),
    totalFee: formData.get("totalFee") ?? 0,
    totalMatches: formData.get("totalMatches") ?? "",
    groundIds: formData.getAll("groundIds"),
  });
  return { data: rest, groundIds };
}

export async function createTournamentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    await requireAdmin();
    const { data, groundIds } = parse(formData);
    const created = await prisma.tournament.create({
      data: { ...data, grounds: { connect: groundIds.map((id) => ({ id })) } },
    });
    revalidateTournaments();
    return {
      ok: true,
      message: `${data.name} added.`,
      created: { id: created.id, name: created.name, overs: created.overs },
    };
  });
}

export async function updateTournamentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    await requireAdmin();
    const id = z.coerce.number().int().parse(formData.get("id"));
    const { data, groundIds } = parse(formData);
    await prisma.tournament.update({
      where: { id },
      // `set` rather than `connect`, so unticking a ground removes it.
      data: { ...data, grounds: { set: groundIds.map((gid) => ({ id: gid })) } },
    });
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
