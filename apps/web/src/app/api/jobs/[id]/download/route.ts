import { prisma } from "@md2pdf/db";
import { getObject } from "@md2pdf/core";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();

  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  const params = await context.params;
  const job = await prisma.job.findFirst({
    where: {
      id: params.id,
      ownerId: user.id,
      status: "completed",
      resultKey: {
        not: null
      }
    }
  });

  if (!job?.resultKey) {
    return jsonError("Rendered PDF not found.", 404);
  }

  const object = await getObject(job.resultKey);
  const bytes = object.Body ? Buffer.from(await object.Body.transformToByteArray()) : Buffer.alloc(0);

  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${job.filename}"`
    }
  });
}
