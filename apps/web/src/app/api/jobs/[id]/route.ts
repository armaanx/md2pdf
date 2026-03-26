import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { getJobStatusForUser } from "@/lib/jobs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();

  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  const params = await context.params;
  const job = await getJobStatusForUser(user.id, params.id);

  if (!job) {
    return jsonError("Job not found.", 404);
  }

  return NextResponse.json(job);
}

