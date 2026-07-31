"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { type ActionState, runAction } from "@/app/actions/types";

const playerSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(60),
  jerseyNumber: z.coerce
    .number({ invalid_type_error: "Jersey number is required." })
    .int("Jersey number must be a whole number.")
    .min(0, "Jersey number can't be negative.")
    .max(999, "Jersey number looks too large."),
  mobileNumber: z
    .string()
    .trim()
    .max(20)
    .optional()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || /^[0-9+\-\s()]{6,20}$/.test(v), "Enter a valid mobile number."),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  defaultMatchFee: z.coerce.number().min(0, "Fee can't be negative."),
  // May legitimately be negative — that is a player in credit.
  openingBalance: z.coerce.number().finite("Enter a number."),
});

function parse(formData: FormData) {
  return playerSchema.parse({
    name: formData.get("name"),
    jerseyNumber: formData.get("jerseyNumber"),
    mobileNumber: formData.get("mobileNumber") ?? "",
    status: formData.get("status") ?? "ACTIVE",
    defaultMatchFee: formData.get("defaultMatchFee") ?? 100,
    openingBalance: formData.get("openingBalance") || 0,
  });
}

function revalidatePlayers(playerId?: number) {
  revalidatePath("/players");
  revalidatePath("/");
  if (playerId) revalidatePath(`/players/${playerId}`);
}

export async function createPlayerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    await requireAdmin();
    const data = parse(formData);
    const created = await prisma.player.create({ data });
    revalidatePlayers();
    return {
      ok: true,
      message: `${data.name} added to the squad.`,
      // Lets a caller (e.g. the roster editor) add them to a match sheet
      // straight away, without re-fetching the squad list.
      created: {
        id: created.id,
        name: created.name,
        jerseyNumber: created.jerseyNumber,
        defaultMatchFee: created.defaultMatchFee,
      },
    };
  });
}

export async function updatePlayerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    await requireAdmin();
    const id = z.coerce.number().int().parse(formData.get("id"));
    const data = parse(formData);
    await prisma.player.update({ where: { id }, data });
    revalidatePlayers(id);
    return { ok: true, message: "Player updated." };
  });
}

export async function deletePlayerAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = z.coerce.number().int().parse(formData.get("id"));

  // Deleting a player would cascade away their match rows and silently rewrite
  // the team's history, so retire them instead once they've played.
  const appearances = await prisma.matchPlayer.count({ where: { playerId: id } });
  if (appearances > 0) {
    await prisma.player.update({ where: { id }, data: { status: "INACTIVE" } });
  } else {
    await prisma.player.delete({ where: { id } });
  }

  revalidatePlayers(id);
  redirect("/players");
}

export async function togglePlayerStatusAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = z.coerce.number().int().parse(formData.get("id"));
  const player = await prisma.player.findUniqueOrThrow({ where: { id } });
  await prisma.player.update({
    where: { id },
    data: { status: player.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" },
  });
  revalidatePlayers(id);
}
