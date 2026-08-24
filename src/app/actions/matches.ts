"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { EXPENSE_CATEGORIES, OVERS_OPTIONS } from "@/lib/constants";
import { round2 } from "@/lib/format";
import { type ActionState, runAction } from "@/app/actions/types";

/* ------------------------------------------------------------------ */
/* Match CRUD                                                          */
/* ------------------------------------------------------------------ */

const matchSchema = z
  .object({
    date: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date.")
      .refine(isRealCalendarDay, "That date isn't valid."),
    time: z
      .string()
      .trim()
      .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, "Pick a start time."),
    matchType: z.enum(["TOURNAMENT", "PRACTICE"]),
    matchNumber: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v ? Number(v) : null))
      .refine((v) => v === null || (Number.isInteger(v) && v > 0), "Match number must be a positive whole number."),
    overs: z.coerce
      .number()
      .int()
      .refine((v) => (OVERS_OPTIONS as readonly number[]).includes(v), "Pick a valid overs option."),
    opponentTeam: z.string().trim().min(1, "Opponent team is required.").max(80),
    groundId: z.coerce.number({ invalid_type_error: "Pick a ground." }).int().positive("Pick a ground."),
    tournamentId: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v ? Number(v) : null))
      .refine((v) => v === null || Number.isInteger(v), "Pick a valid tournament."),
    tossWonBy: z
      .enum(["", "US", "OPPONENT"])
      .optional()
      .transform((v) => (v ? v : null)),
    tossDecision: z
      .enum(["", "BAT", "BOWL"])
      .optional()
      .transform((v) => (v ? v : null)),
    result: z
      .enum(["", "WIN", "LOSS", "TIE", "NO_RESULT"])
      .optional()
      .transform((v) => (v ? v : null)),
    ourScore: z
      .string()
      .trim()
      .max(40)
      .optional()
      .transform((v) => (v ? v : null)),
    opponentScore: z
      .string()
      .trim()
      .max(40)
      .optional()
      .transform((v) => (v ? v : null)),
    cricheroesUrl: z
      .string()
      .trim()
      .max(300)
      .optional()
      .transform((v) => (v ? v : null))
      .refine(
        (v) => v === null || v.startsWith("http://") || v.startsWith("https://"),
        "That doesn't look like a link.",
      ),
    notes: z
      .string()
      .trim()
      .max(500)
      .optional()
      .transform((v) => (v ? v : null)),
  })
  .refine((v) => v.matchType !== "TOURNAMENT" || v.tournamentId !== null, {
    message: "Choose which tournament this match belongs to.",
    path: ["tournamentId"],
  })
  .transform(({ time, ...v }) => ({
    ...v,
    // The date and time inputs give wall-clock values with no zone; the team
    // plays in India, so pin them to IST before storing.
    date: new Date(`${v.date}T${time.slice(0, 5)}:00+05:30`),
    // A practice game never carries tournament metadata, even if the form
    // still had stale values selected when the type was switched.
    tournamentId: v.matchType === "TOURNAMENT" ? v.tournamentId : null,
    matchNumber: v.matchType === "TOURNAMENT" ? v.matchNumber : null,
    // A decision means nothing without a toss winner to have made it.
    tossDecision: v.tossWonBy === null ? null : v.tossDecision,
  }));

/**
 * Whether a "YYYY-MM-DD" string is a day that exists.
 *
 * `new Date()` can't be trusted for this: given an offset it falls back to the
 * lenient parser, where "2026-02-31" quietly becomes 3 March.
 */
function isRealCalendarDay(value: string): boolean {
  const [year, month, day] = value.split("-").map(Number) as [number, number, number];
  const d = new Date(Date.UTC(year, month - 1, day));
  return (
    d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day
  );
}

function parseMatch(formData: FormData) {
  return matchSchema.parse({
    date: formData.get("date") ?? "",
    time: formData.get("time") ?? "",
    matchType: formData.get("matchType") ?? "PRACTICE",
    matchNumber: formData.get("matchNumber") ?? "",
    overs: formData.get("overs") ?? 20,
    opponentTeam: formData.get("opponentTeam") ?? "",
    groundId: formData.get("groundId") ?? "",
    tournamentId: formData.get("tournamentId") ?? "",
    tossWonBy: formData.get("tossWonBy") ?? "",
    tossDecision: formData.get("tossDecision") ?? "",
    result: formData.get("result") ?? "",
    ourScore: formData.get("ourScore") ?? "",
    opponentScore: formData.get("opponentScore") ?? "",
    cricheroesUrl: formData.get("cricheroesUrl") ?? "",
    notes: formData.get("notes") ?? "",
  });
}

function revalidateMatch(id?: number) {
  revalidatePath("/");
  revalidatePath("/matches");
  revalidatePath("/players");
  revalidatePath("/tournaments");
  if (id) revalidatePath(`/matches/${id}`);
}

export async function createMatchAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let newId: number | null = null;

  const state = await runAction(async () => {
    await requireAdmin();
    const data = parseMatch(formData);
    const match = await prisma.match.create({ data });
    newId = match.id;
    revalidateMatch(match.id);
    return { ok: true, message: "Match created." };
  });

  // Straight into picking the XI — creating a fixture is rarely the end goal.
  if (state.ok && newId !== null) redirect(`/matches/${newId}?edit=1`);
  return state;
}

export async function updateMatchAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let id: number | null = null;

  const state = await runAction(async () => {
    await requireAdmin();
    id = z.coerce.number().int().parse(formData.get("id"));
    const data = parseMatch(formData);
    await prisma.match.update({ where: { id }, data });
    revalidateMatch(id);
    return { ok: true, message: "Match updated." };
  });

  if (state.ok && id !== null) redirect(`/matches/${id}`);
  return state;
}

export async function deleteMatchAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = z.coerce.number().int().parse(formData.get("id"));
  // Roster rows and expenses cascade with the match (see schema).
  await prisma.match.delete({ where: { id } });
  revalidateMatch(id);
  redirect("/matches");
}

/* ------------------------------------------------------------------ */
/* Roster + collections                                                */
/* ------------------------------------------------------------------ */

const rosterRowSchema = z.object({
  playerId: z.number().int(),
  isPresent: z.boolean(),
  payableAmount: z.number().min(0),
  collectedAmount: z.number().min(0),
  paymentMode: z.enum(["UPI", "CASH"]).nullable(),
});

/**
 * Saves the whole roster in one shot.
 *
 * The form posts `player-<id>` for every candidate player, so absentees are
 * explicit rather than inferred from what's missing. Rules applied here (the
 * client mirrors them for instant feedback, but the server is the authority):
 *   - present  -> payable defaults to the player's profile fee
 *   - absent   -> payable, collected and payment mode are all cleared
 *   - a row with no money and no attendance is removed entirely
 */
export async function saveRosterAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    await requireAdmin();

    const matchId = z.coerce.number().int().parse(formData.get("matchId"));
    const candidateIds = formData
      .getAll("player")
      .map((v) => Number(v))
      .filter((n) => Number.isInteger(n));

    if (candidateIds.length === 0) {
      return { ok: false, error: "No players were submitted." };
    }

    const players = await prisma.player.findMany({ where: { id: { in: candidateIds } } });
    const feeById = new Map(players.map((p) => [p.id, p.defaultMatchFee]));

    const rows = candidateIds.map((playerId) => {
      const isPresent = formData.get(`present-${playerId}`) === "on";
      const rawPayable = formData.get(`payable-${playerId}`);
      const rawCollected = formData.get(`collected-${playerId}`);
      const rawMode = formData.get(`mode-${playerId}`);

      const payableAmount = isPresent
        ? round2(
            rawPayable === null || rawPayable === ""
              ? (feeById.get(playerId) ?? 0)
              : Number(rawPayable),
          )
        : 0;
      const collectedAmount = isPresent
        ? round2(rawCollected === null || rawCollected === "" ? 0 : Number(rawCollected))
        : 0;
      const mode = rawMode === "UPI" || rawMode === "CASH" ? rawMode : null;

      return rosterRowSchema.parse({
        playerId,
        isPresent,
        payableAmount: Number.isFinite(payableAmount) ? payableAmount : 0,
        collectedAmount: Number.isFinite(collectedAmount) ? collectedAmount : 0,
        // Only record how money arrived when money actually arrived.
        paymentMode: isPresent && collectedAmount > 0 ? mode : null,
      });
    });

    const keep: typeof rows = [];
    const dropIds: number[] = [];
    for (const row of rows) {
      if (row.isPresent || row.payableAmount > 0 || row.collectedAmount > 0) keep.push(row);
      else dropIds.push(row.playerId);
    }

    await prisma.$transaction([
      ...keep.map((row) =>
        prisma.matchPlayer.upsert({
          where: { matchId_playerId: { matchId, playerId: row.playerId } },
          create: { matchId, ...row },
          update: {
            isPresent: row.isPresent,
            payableAmount: row.payableAmount,
            collectedAmount: row.collectedAmount,
            paymentMode: row.paymentMode,
          },
        }),
      ),
      prisma.matchPlayer.deleteMany({
        where: { matchId, playerId: { in: dropIds } },
      }),
    ]);

    revalidateMatch(matchId);
    const playing = keep.filter((r) => r.isPresent).length;
    return {
      ok: true,
      message: `Saved — ${playing} player${playing === 1 ? "" : "s"} in the XI.`,
    };
  });
}

/* ------------------------------------------------------------------ */
/* Expenses                                                            */
/* ------------------------------------------------------------------ */

const expenseSchema = z
  .object({
    matchId: z.coerce.number().int(),
    category: z.string().trim().min(1, "Pick a category."),
    customCategory: z.string().trim().max(60).optional(),
    amount: z.coerce.number().positive("Amount must be greater than zero."),
    note: z
      .string()
      .trim()
      .max(200)
      .optional()
      .transform((v) => (v ? v : null)),
  })
  .refine(
    (v) => (v.category as string) !== "Others" || Boolean(v.customCategory?.trim()),
    { message: "Describe the expense.", path: ["customCategory"] },
  )
  .transform((v) => ({
    matchId: v.matchId,
    // "Others" is a UI affordance; what gets stored is the typed-in label.
    category:
      v.category === "Others" && v.customCategory?.trim()
        ? v.customCategory.trim()
        : v.category,
    amount: round2(v.amount),
    note: v.note,
  }));

export async function addExpenseAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    await requireAdmin();
    const data = expenseSchema.parse({
      matchId: formData.get("matchId"),
      category: formData.get("category"),
      customCategory: formData.get("customCategory") ?? "",
      amount: formData.get("amount"),
      note: formData.get("note") ?? "",
    });

    const known = (EXPENSE_CATEGORIES as readonly string[]).includes(data.category);
    await prisma.matchExpense.create({ data });
    revalidateMatch(data.matchId);
    return {
      ok: true,
      message: known ? "Expense added." : `Added under "${data.category}".`,
    };
  });
}

export async function deleteExpenseAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = z.coerce.number().int().parse(formData.get("id"));
  const expense = await prisma.matchExpense.delete({ where: { id } });
  revalidateMatch(expense.matchId);
}
