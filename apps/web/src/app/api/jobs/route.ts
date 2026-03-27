import { createJobSchema } from "@md2pdf/core";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { createRenderJob } from "@/lib/jobs";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  const body = await request.json().catch(() => null);
  const parsed = createJobSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError("Invalid render job payload.");
  }

  try {
    const result = await createRenderJob({
      ownerId: user.id,
      markdown: parsed.data.markdown,
      assetIds: parsed.data.assetIds,
      filename: parsed.data.filename,
      options: parsed.data.options
    });

    if (!result.ok) {
      return NextResponse.json({ issues: result.issues }, { status: 400 });
    }

    return NextResponse.json({
      jobId: result.job.id,
      status: result.job.status,
      filename: result.job.filename,
      createdAt: result.job.createdAt.toISOString()
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Failed to queue job.");
  }
}
