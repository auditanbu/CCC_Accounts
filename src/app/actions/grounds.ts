"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { type ActionState, runAction } from "@/app/actions/types";

const groundSchema = z.object({
  name: z.string().trim().min(1, "Ground name is required.").max(80),
  location: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => (v ? v : null)),
  googleMapUrl: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v ? v : null))
    .refine(
      (v) => v === null || /^https?:\/\//i.test(v),
      "Paste the full link, starting with https://",
    ),
});

function revalidateGrounds() {
  revalidatePath("/grounds");
  revalidatePath("/matches");
}

export async function createGroundAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    await requireAdmin();
    const data = groundSchema.parse({
      name: formData.get("name"),
      location: formData.get("location") ?? "",
      googleMapUrl: formData.get("googleMapUrl") ?? "",
    });
    await prisma.ground.create({ data });
    revalidateGrounds();
    return { ok: true, message: `${data.name} added.` };
  });
}

export async function updateGroundAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    await requireAdmin();
    const id = z.coerce.number().int().parse(formData.get("id"));
    const data = groundSchema.parse({
      name: formData.get("name"),
      location: formData.get("location") ?? "",
      googleMapUrl: formData.get("googleMapUrl") ?? "",
    });
    await prisma.ground.update({ where: { id }, data });
    revalidateGrounds();
    return { ok: true, message: "Ground updated." };
  });
}

export async function deleteGroundAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    await requireAdmin();
    const id = z.coerce.number().int().parse(formData.get("id"));
    const used = await prisma.match.count({ where: { groundId: id } });
    if (used > 0) {
      return {
        ok: false,
        error: `This ground is used by ${used} match${used === 1 ? "" : "es"} and can't be deleted.`,
      };
    }
    await prisma.ground.delete({ where: { id } });
    revalidateGrounds();
    return { ok: true, message: "Ground deleted." };
  });
}
