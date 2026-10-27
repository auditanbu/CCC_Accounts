"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { ensureDeviceId, getDeviceId } from "@/lib/device";
import { FIELD_SETS_PER_PHONE, VIEW_H, VIEW_W } from "@/lib/fielding";
import { isAdmin } from "@/lib/session";
import { type ActionState, runAction } from "@/app/actions/types";

/** Backstop for someone clearing cookies to dodge the per-phone limit. */
const MAX_PLAYER_FIELD_SETS = 300;

const MARKER_IDS = ["WK", "B", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

const markerSchema = z.object({
  id: z.string().refine((v) => MARKER_IDS.includes(v), "Unknown marker."),
  role: z.enum(["keeper", "bowler", "fielder"]),
  x: z.number().finite().min(0).max(VIEW_W),
  y: z.number().finite().min(0).max(VIEW_H),
  playerId: z.number().int().positive().nullable(),
});

const dataSchema = z.object({
  v: z.number().int(),
  hand: z.enum(["RHB", "LHB"]),
  title: z.string().max(60),
  labelMode: z.enum(["name", "jersey"]),
  phase: z.enum(["powerplay", "middle", "death"]),
  overs: z.union([z.literal(20), z.literal(30)]),
  markers: z
    .array(markerSchema)
    .length(11)
    .refine((ms) => new Set(ms.map((m) => m.id)).size === 11, "Each marker must appear once."),
});

const saveSchema = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().trim().min(1, "Give the field a name.").max(40),
  savedBy: z.string().trim().max(30),
  data: dataSchema,
});

export type FieldSetInput = z.input<typeof saveSchema>;

function revalidateField() {
  revalidatePath("/field");
}

/** Admin can change anything; a phone only what it saved itself. */
async function canChange(row: { byAdmin: boolean; ownerKey: string | null }): Promise<boolean> {
  if (await isAdmin()) return true;
  const device = await getDeviceId();
  return !row.byAdmin && row.ownerKey !== null && row.ownerKey === device;
}

export async function saveFieldSetAction(input: FieldSetInput): Promise<ActionState> {
  return runAction(async () => {
    const { id, name, savedBy, data } = saveSchema.parse(input);
    const admin = await isAdmin();

    if (id !== undefined) {
      const row = await prisma.fieldSet.findUnique({ where: { id } });
      if (!row) throw new Error("That field set no longer exists.");
      if (!(await canChange(row))) throw new Error("You can only change field sets saved on this phone.");
      await prisma.fieldSet.update({ where: { id }, data: { name, data } });
      revalidateField();
      return { ok: true, message: `${name} updated.`, created: { id, name } };
    }

    if (admin) {
      const row = await prisma.fieldSet.create({
        data: { name, savedBy: "Admin", byAdmin: true, ownerKey: null, data },
      });
      revalidateField();
      return { ok: true, message: `${name} saved.`, created: { id: row.id, name } };
    }

    if (!savedBy) throw new Error("Add your name so the team knows who saved it.");
    const device = await ensureDeviceId();
    const [mine, total] = await Promise.all([
      prisma.fieldSet.count({ where: { ownerKey: device, byAdmin: false } }),
      prisma.fieldSet.count({ where: { byAdmin: false } }),
    ]);
    if (mine >= FIELD_SETS_PER_PHONE) {
      throw new Error(
        `You can save up to ${FIELD_SETS_PER_PHONE} field sets. Delete one to save a new one.`,
      );
    }
    if (total >= MAX_PLAYER_FIELD_SETS) {
      throw new Error("The team's saved fields are full. Ask the admin to clear some out.");
    }
    const row = await prisma.fieldSet.create({
      data: { name, savedBy, byAdmin: false, ownerKey: device, data },
    });
    revalidateField();
    return { ok: true, message: `${name} saved.`, created: { id: row.id, name } };
  });
}

export async function deleteFieldSetAction(id: number): Promise<ActionState> {
  return runAction(async () => {
    const setId = z.number().int().positive().parse(id);
    const row = await prisma.fieldSet.findUnique({ where: { id: setId } });
    if (!row) return { ok: true, message: "Already deleted." };
    if (!(await canChange(row))) throw new Error("You can only delete field sets saved on this phone.");
    await prisma.fieldSet.delete({ where: { id: setId } });
    revalidateField();
    return { ok: true, message: `${row.name} deleted.` };
  });
}
