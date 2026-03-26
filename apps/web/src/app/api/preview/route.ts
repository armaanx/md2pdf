import { getEnv } from "@md2pdf/core";
import { renderMarkdownToHtml } from "@md2pdf/renderer/html";
import { NextResponse } from "next/server";
import { getOwnedAssets, toRenderAssets } from "@/lib/assets";
import { getCurrentUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  const body = (await request.json().catch(() => null)) as
    | { markdown?: string; assetIds?: string[] }
    | null;

  if (!body?.markdown) {
    return jsonError("Markdown is required.");
  }

  const env = getEnv();

  if (Buffer.byteLength(body.markdown, "utf8") > env.MAX_MARKDOWN_BYTES) {
    return jsonError(`Markdown exceeds ${env.MAX_MARKDOWN_BYTES} bytes.`);
  }

  const assetIds = Array.isArray(body.assetIds) ? body.assetIds : [];
  const assets = await getOwnedAssets(user.id, assetIds);

  if (assets.length !== assetIds.length) {
    return jsonError("One or more assets do not belong to the current user.");
  }

  const result = await renderMarkdownToHtml({
    markdown: body.markdown,
    assets: toRenderAssets(assets)
  });

  return NextResponse.json({
    html: result.validation.ok ? result.html : "",
    issues: result.validation.issues
  });
}
