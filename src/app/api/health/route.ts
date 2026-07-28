import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Health probe for Railway — verifies the process and its DB connection. */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", database: "connected" });
  } catch (error) {
    return NextResponse.json(
      {
        status: "degraded",
        database: "unreachable",
        error: error instanceof Error ? error.message : "unknown",
      },
      { status: 503 },
    );
  }
}
