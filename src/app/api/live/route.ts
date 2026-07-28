import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Liveness probe — is the web server up and serving?
 *
 * Deliberately does NOT touch the database. This is what the platform's health
 * check points at, so a missing or wrong DATABASE_URL produces a deployment
 * that boots and tells you what's wrong, rather than one that fails to release
 * and leaves you reading build logs. Use /api/health for the deep check that
 * actually verifies the database connection.
 */
export function GET() {
  return NextResponse.json({ status: "ok", service: "eleven-super-kings" });
}
