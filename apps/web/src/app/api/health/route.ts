import { checkDatabaseHealth } from "@md2pdf/db";
import { checkRedisHealth } from "@md2pdf/core";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await Promise.all([checkDatabaseHealth(), checkRedisHealth()]);

    return NextResponse.json({
      ok: true,
      services: {
        database: "ok",
        redis: "ok"
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Healthcheck failed."
      },
      { status: 503 }
    );
  }
}
