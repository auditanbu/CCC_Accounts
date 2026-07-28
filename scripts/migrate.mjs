/**
 * Applies pending Prisma migrations using @prisma/client alone.
 *
 * The Prisma CLI is not in the runtime image. Shipping it means shipping its
 * dependency tree — @prisma/config pulls in effect and friends, some 240MB —
 * to run one command at boot. The generated client is already present and
 * already talking to the database, so it can do the same job.
 *
 * Bookkeeping is deliberately identical to `prisma migrate deploy`: the same
 * _prisma_migrations table, the same sha256-of-migration.sql checksum, the same
 * "skip what is already recorded" rule. That keeps the CLI usable against this
 * database later — `prisma migrate status` reports it up to date, and a future
 * `migrate deploy` is a no-op rather than a conflict.
 */
import { createHash, randomUUID } from "node:crypto";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

import { PrismaClient } from "@prisma/client";

const MIGRATIONS_DIR = join(process.cwd(), "prisma", "migrations");

/**
 * Splits a migration into individual statements.
 *
 * Postgres refuses multiple commands in one prepared statement, which is what
 * $executeRawUnsafe issues, so the file cannot be sent as a single script. A
 * plain split on ";" would corrupt any semicolon inside a string literal, an
 * identifier, a comment, or a dollar-quoted body, so scan properly.
 */
export function splitStatements(sql) {
  const statements = [];
  let current = "";
  let i = 0;

  while (i < sql.length) {
    const ch = sql[i];
    const rest = sql.slice(i);

    if (rest.startsWith("--")) {                       // line comment
      const end = sql.indexOf("\n", i);
      i = end === -1 ? sql.length : end + 1;
      continue;
    }
    if (rest.startsWith("/*")) {                       // block comment
      const end = sql.indexOf("*/", i + 2);
      i = end === -1 ? sql.length : end + 2;
      continue;
    }
    if (ch === "'" || ch === '"') {                    // quoted literal / identifier
      const quote = ch;
      let j = i + 1;
      while (j < sql.length) {
        if (sql[j] === quote) {
          if (sql[j + 1] === quote) { j += 2; continue; }  // escaped by doubling
          break;
        }
        j++;
      }
      current += sql.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    const dollar = rest.match(/^\$([A-Za-z_]\w*)?\$/);  // dollar-quoted body
    if (dollar) {
      const tag = dollar[0];
      const end = sql.indexOf(tag, i + tag.length);
      const stop = end === -1 ? sql.length : end + tag.length;
      current += sql.slice(i, stop);
      i = stop;
      continue;
    }
    if (ch === ";") {
      if (current.trim()) statements.push(current.trim());
      current = "";
      i++;
      continue;
    }
    current += ch;
    i++;
  }
  if (current.trim()) statements.push(current.trim());
  return statements;
}

async function applyMigration(prisma, name, sql) {
  const statements = splitStatements(sql);
  await prisma.$transaction(async (tx) => {
    for (const statement of statements) {
      await tx.$executeRawUnsafe(statement);
    }
    await tx.$executeRawUnsafe(
      `INSERT INTO "_prisma_migrations"
         (id, checksum, finished_at, migration_name, started_at, applied_steps_count)
       VALUES ($1, $2, now(), $3, now(), 1)`,
      randomUUID(),
      createHash("sha256").update(sql).digest("hex"),
      name,
    );
  });
}

async function main() {
  if (!existsSync(MIGRATIONS_DIR)) {
    console.log("→ No migrations directory; nothing to apply.");
    return;
  }

  const prisma = new PrismaClient();
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
        id                  VARCHAR(36) PRIMARY KEY NOT NULL,
        checksum            VARCHAR(64) NOT NULL,
        finished_at         TIMESTAMPTZ,
        migration_name      VARCHAR(255) NOT NULL,
        logs                TEXT,
        rolled_back_at      TIMESTAMPTZ,
        started_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
        applied_steps_count INTEGER NOT NULL DEFAULT 0
      )`);

    const applied = new Set(
      (
        await prisma.$queryRawUnsafe(
          `SELECT migration_name FROM "_prisma_migrations" WHERE rolled_back_at IS NULL`,
        )
      ).map((r) => r.migration_name),
    );

    const pending = readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort()                                    // timestamp prefix orders them
      .filter((name) => !applied.has(name))
      .filter((name) => existsSync(join(MIGRATIONS_DIR, name, "migration.sql")));

    if (pending.length === 0) {
      console.log(`→ Database up to date (${applied.size} migration(s) applied).`);
      return;
    }

    for (const name of pending) {
      const sql = readFileSync(join(MIGRATIONS_DIR, name, "migration.sql"), "utf8");
      process.stdout.write(`→ Applying ${name}… `);
      await applyMigration(prisma, name, sql);
      console.log("done");
    }
    console.log(`→ Applied ${pending.length} migration(s).`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("! Migration failed:", error?.message ?? error);
  process.exit(1);
});
