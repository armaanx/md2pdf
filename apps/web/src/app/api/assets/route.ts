import { getEnv } from "@md2pdf/core";
import { NextResponse } from "next/server";
import { createUserAsset } from "@/lib/assets";
import { getCurrentUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return jsonError("A file upload is required.");
  }

  const env = getEnv();
  const requestFiles = formData.getAll("file");

  if (requestFiles.length > env.MAX_ASSET_COUNT) {
    return jsonError(`You can upload up to ${env.MAX_ASSET_COUNT} assets per request.`);
  }

  try {
    const asset = await createUserAsset({
      ownerId: user.id,
      file
    });

    return NextResponse.json(asset);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Asset upload failed.");
  }
}

